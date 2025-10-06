import { env } from "@/env/server";
import { and, asc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import Pusher from "pusher";

import { db } from "@/lib/db";
import { timer, timerAction, UpdateTimer, weddingEvent } from "../db/schema";
import {
  ACTION_UPDATED,
  CHANNEL,
  convertToTimezoneAgnosticDate,
  isTimezoneAgnosticDatePast,
  logger,
  TIMER_UPDATED,
} from "../utils";

const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.VITE_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.VITE_PUSHER_CLUSTER,
  useTLS: true,
});

export class TimerService {
  getById = async (timerId: string) => {
    return await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
      with: {
        actions: {
          orderBy: [asc(timerAction.orderIndex)],
        },
      },
    });
  };

  updateTimer = async (
    timerId: string,
    data: UpdateTimer & {
      cascadeUpdate?: boolean;
      originalDurationMinutes?: number;
    },
  ) => {
    const { cascadeUpdate, originalDurationMinutes, ...updateData } = data;
    const updatedTimer = await db
      .update(timer)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(timer.id, timerId))
      .returning();

    // Si cascade update est activé et qu'on a une nouvelle duration
    if (
      cascadeUpdate &&
      updateData.durationMinutes &&
      originalDurationMinutes !== undefined
    ) {
      const minutesDiff = updateData.durationMinutes - originalDurationMinutes;

      if (minutesDiff !== 0) {
        // Récupérer le timer modifié pour obtenir son weddingEventId et orderIndex
        const currentTimer = await this.getById(timerId);

        if (currentTimer) {
          // Mettre à jour tous les timers suivants
          const followingTimers = await db.query.timer.findMany({
            where: (timer, { eq, gt }) =>
              and(
                eq(timer.weddingEventId, currentTimer.weddingEventId),
                gt(timer.orderIndex, currentTimer.orderIndex),
              ),
          });

          // Décaler l'heure de début de chaque timer suivant
          for (const followingTimer of followingTimers) {
            if (followingTimer.scheduledStartTime) {
              const newStartTime = new Date(followingTimer.scheduledStartTime);
              newStartTime.setMinutes(newStartTime.getMinutes() + minutesDiff);

              await db
                .update(timer)
                .set({
                  scheduledStartTime: newStartTime,
                  updatedAt: new Date(),
                })
                .where(eq(timer.id, followingTimer.id));
            }
          }
        }
      }
    }

    // Obtenir la date actuelle
    const now = new Date();

    // Notifier via Pusher que le timer a été mis à jour
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      timerId,
      action: "updated",
      updatedFields: updateData,
      updatedAt: now.toUTCString(),
    });

    return updatedTimer;
  };

  /**
   * Démarre le mariage de demo
   * Appelé par le backend quand l'utilisateur clique sur le bouton "Enable Demo Mode" depuis le dashboard
   * Reset les timers et actions du mariage demo avec les valeurs initiales
   * Met a jour le champs scheduledStartTime avec la date et l'heure actuelle
   * Calcul la date de début en fonction de la durée des timers suivants et de leurs heures programmées pour chaque timer
   * Démarre le premier timer
   * Met à jour le currentTimerId de l'événement
   * Notifie via Pusher
   */
  async startWeddingDemo(weddingEventId: string, weddingEventIdToCopyFrom: string) {
    logger(`Starting wedding demo for event: ${weddingEventId}`);

    const now = new Date();

    // 1. Reset tous les timers et actions du mariage
    await this.resetWeddingFromNormal(weddingEventId, weddingEventIdToCopyFrom);

    // 2. Récupérer tous les timers ordonnés
    const allTimers = await db.query.timer.findMany({
      where: eq(timer.weddingEventId, weddingEventId),
      orderBy: [asc(timer.orderIndex)],
    });

    if (allTimers.length === 0) {
      throw new Error("Aucun timer trouvé pour cet événement");
    }

    logger(`Total timers to schedule: ${allTimers.length}`);

    // 3. Calculer les scheduledStartTime pour chaque timer
    // Le premier timer commence maintenant
    let currentScheduledTime = now;

    for (let i = 0; i < allTimers.length; i++) {
      const currentTimer = allTimers[i];

      // Mettre à jour le scheduledStartTime du timer actuel
      await db
        .update(timer)
        .set({
          scheduledStartTime: currentScheduledTime,
          updatedAt: now,
        })
        .where(eq(timer.id, currentTimer.id));

      // Calculer le scheduledStartTime du prochain timer
      if (i < allTimers.length - 1) {
        // Si le timer actuel a une durée, ajouter cette durée
        if (currentTimer.durationMinutes && currentTimer.durationMinutes > 0) {
          currentScheduledTime = new Date(
            currentScheduledTime.getTime() + currentTimer.durationMinutes * 60000,
          );
        }
        // Si le timer actuel est ponctuel/manuel, on ne change pas currentScheduledTime
        // Le prochain timer aura la même heure programmée (sera géré manuellement ou par cron)
      }
    }

    // 4. Récupérer le premier timer avec une durée pour le démarrer
    const firstTimer = allTimers.find((t) => t.durationMinutes && t.durationMinutes > 0);

    if (!firstTimer) {
      // Si aucun timer avec durée, démarrer le premier timer manuel/ponctuel
      const firstManualTimer = allTimers[0];
      await this.startPunctualOrManualTimer(firstManualTimer.id, weddingEventId);

      // Notifier via Pusher
      await pusher.trigger(CHANNEL, TIMER_UPDATED, {
        weddingEventId,
        timerId: firstManualTimer.id,
        action: "wedding-demo-started",
        startTime: now.toISOString(),
      });

      return { timerId: firstManualTimer.id, startTime: now };
    }

    // Stop all timers that might be running (safety)
    await db
      .update(timer)
      .set({
        status: "PENDING",
        updatedAt: now,
      })
      .where(eq(timer.weddingEventId, weddingEventId));

    // 5. Démarrer le premier timer avec durée
    await this.startTimer(firstTimer.id, weddingEventId);

    // 6. Notifier via Pusher que le mariage demo a démarré
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      weddingEventId,
      timerId: firstTimer.id,
      action: "wedding-demo-started",
      startTime: now.toISOString(),
    });

    return { timerId: firstTimer.id, startTime: now };
  }

  /**
   * Démarre un timer spécifique
   * Utilisé pour le démarrage du mariage
   */
  async startTimer(timerId: string, weddingEventId: string) {
    logger(`Starting timer: ${timerId} for wedding event: ${weddingEventId}`);

    const currentTimer = await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
      with: { actions: true },
    });

    if (!currentTimer) {
      // logger(`Timer not found: ${timerId}`);
      throw new Error("Timer non trouvé");
    }

    // Vérifier les contraintes selon le type de timer
    const isPunctualOrManual =
      currentTimer.isManual ||
      !currentTimer.durationMinutes ||
      currentTimer.durationMinutes === 0;

    if (!isPunctualOrManual) {
      // Pour les timers avec durée, vérifier qu'aucun autre timer avec durée n'est RUNNING
      const runningTimerWithDuration = await db.query.timer.findFirst({
        where: and(
          eq(timer.weddingEventId, weddingEventId),
          eq(timer.status, "RUNNING"),
          gt(timer.durationMinutes, 0),
        ),
      });

      if (runningTimerWithDuration) {
        throw new Error("Un timer avec durée est déjà en cours. Attendez sa completion.");
      }
    }

    // Démarrer le timer
    const now = new Date();
    await db
      .update(timer)
      .set({
        status: "RUNNING",
        startedAt: now,
        updatedAt: now,
      })
      .where(eq(timer.id, timerId));

    // Mettre à jour le currentTimerId de l'événement
    await db
      .update(weddingEvent)
      .set({
        currentTimerId: timerId,
        updatedAt: now,
      })
      .where(eq(weddingEvent.id, weddingEventId));

    // Notifier via Pusher
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      timerId,
      weddingEventId,
      action: "started",
      startTime: now.toUTCString(),
    });

    return { timerId, startTime: now };
  }

  /**
   * Démarre un timer spécifique
   * Utilisé pour le démarrage d'un timer ponctuel ou manuel
   * Ne met pas à jour le currentTimerId du weddingEvent
   * Appelé par le frontend quand l'utilisateur clique sur "Démarrer" ou bien par le cron pour les timers ponctuels
   * TODO : gérer les erreurs si un timer avec durée est déjà en cours (voir startTimer)
   * TODO : gérer le cas où plusieurs timers ponctuels sont programmés à la même heure (ne démarrer que le premier, les autres attendront le cron suivant)
   */
  async startPunctualOrManualTimer(timerId: string, weddingEventId: string) {
    const currentTimer = await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
      with: { actions: true },
    });

    if (!currentTimer) {
      throw new Error("Timer non trouvé");
    }

    // Vérifier les contraintes selon le type de timer
    const isPunctualOrManual =
      currentTimer.isManual ||
      !currentTimer.durationMinutes ||
      currentTimer.durationMinutes === 0;

    if (isPunctualOrManual) {
      console.log(
        `Démarrage du timer ponctuel ou manuel ${timerId} pour l'événement ${weddingEventId}`,
      );

      // Démarrer le timer sans mettre a jour le currentTimerId du weddingEvent
      const now = new Date();
      const updatedTimer = await db
        .update(timer)
        .set({
          status: "RUNNING",
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(timer.id, timerId));

      // Notifier via Pusher
      await pusher.trigger(CHANNEL, TIMER_UPDATED, {
        timer: updatedTimer,
        weddingEventId,
        action: "started",
        startTime: now.toUTCString(),
      });

      return { timer: updatedTimer, startTime: now };
    }
    throw new Error("Le timer doit être manuel ou ponctuel (sans durée)");
  }

  /**
   * Marque une action comme exécutée
   * Appelé par le frontend quand une action se termine (média fini + displayDurationSec)
   */
  async executeAction(actionId: string) {
    logger(`Executing action: ${actionId}`);

    const action = await db.query.timerAction.findFirst({
      where: eq(timerAction.id, actionId),
    });

    if (!action) {
      logger(`Action not found: ${actionId}`);
      throw new Error("Action non trouvée");
    }

    if (action.executedAt) {
      // Déjà exécutée, ne rien faire
      return { actionId, alreadyExecuted: true };
    }

    const now = new Date();

    // Marquer l'action comme exécutée
    await db
      .update(timerAction)
      .set({
        executedAt: now,
      })
      .where(eq(timerAction.id, actionId));

    // Récupérer toutes les actions du timer pour vérifier si c'était la dernière
    const allActions = await db.query.timerAction.findMany({
      where: eq(timerAction.timerId, action.timerId),
      orderBy: [asc(timerAction.orderIndex)],
    });

    const allActionsExecuted = allActions.every(
      (a) => a.executedAt !== null || a.id === actionId,
    );

    // Notifier via Pusher
    await pusher.trigger(CHANNEL, ACTION_UPDATED, {
      actionId,
      timerId: action.timerId,
      allActionsExecuted,
    });

    // Si c'était la dernière action, on peut considérer de compléter le timer
    // MAIS on attend que le frontend appelle completeTimer() après le displayDurationSec
    return {
      actionId,
      executedAt: now,
      allActionsExecuted,
    };
  }

  /**
   * Complète un timer et passe au suivant
   * Appelé soit automatiquement (dernière action terminée), soit manuellement
   */
  async completeTimer(timerId: string) {
    const currentTimer = await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
      with: { actions: true },
    });

    if (!currentTimer) {
      throw new Error("Timer non trouvé");
    }

    if (currentTimer.status === "COMPLETED") {
      // Déjà complété
      return { timerId, alreadyCompleted: true };
    }

    const now = new Date();

    // Marquer le timer comme complété
    await db
      .update(timer)
      .set({
        status: "COMPLETED",
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(timer.id, timerId));

    // Chercher le prochain timer (orderIndex supérieur)
    const nextTimer = await db.query.timer.findFirst({
      where: and(
        eq(timer.weddingEventId, currentTimer.weddingEventId),
        gt(timer.orderIndex, currentTimer.orderIndex),
      ),
      orderBy: [asc(timer.orderIndex)],
    });

    let nextTimerId: string | null = null;

    if (nextTimer) {
      nextTimerId = nextTimer.id;

      // Mettre à jour le currentTimerId
      await db
        .update(weddingEvent)
        .set({
          currentTimerId: nextTimerId,
          updatedAt: now,
        })
        .where(eq(weddingEvent.id, currentTimer.weddingEventId));

      /**
       * Démarrer automatiquement le prochain timer s'il n'est pas manuel ou pas ponctuel, donc avec une durée > 0
       * Les timers manuels attendront une action utilisateur pour démarrer
       * Les timers ponctuels attendront que le cron ou le front envoie une requête pour démarrer
       * Cela permet de gérer les cas où plusieurs timers ponctuels sont programmés à la suite
       */

      if (
        !nextTimer.isManual ||
        (nextTimer.durationMinutes && nextTimer.durationMinutes > 0)
      ) {
        await this.startTimer(nextTimerId, currentTimer.weddingEventId);
      }
    } else {
      // Plus de timer suivant, le mariage est terminé !
      await db
        .update(weddingEvent)
        .set({
          currentTimerId: null,
          updatedAt: now,
          completedAt: now,
        })
        .where(eq(weddingEvent.id, currentTimer.weddingEventId));
    }

    // Notifier via Pusher
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      timerId,
      weddingEventId: currentTimer.weddingEventId,
      action: "completed",
      nextTimerId,
      completedAt: now.toUTCString(),
    });

    return {
      timerId,
      completedAt: now,
      nextTimerId,
    };
  }

  /**
   * Vérifie et démarre le premier timer du mariage si son heure de début est passée
   * Met à jour le weddingEvent.currentTimerId
   * À appeler via polling ou cron job
   */
  async checkAndStartWedding(weddingEventId: string) {
    const now = new Date();

    // Récupérer l'événement
    const event = await db.query.weddingEvent.findFirst({
      where: eq(weddingEvent.id, weddingEventId),
    });

    if (!event) {
      console.error(`Événement de mariage non trouvé: ${weddingEventId}`);
      return { started: false, reason: "Event not found" };
    }

    // Si le mariage a déjà un currentTimerId, il est déjà démarré
    if (event.currentTimerId) {
      return { started: false, reason: "Wedding already started" };
    }

    // Récupérer le premier timer (orderIndex le plus petit) avec une durée
    const firstTimer = await db.query.timer.findFirst({
      where: and(
        eq(timer.weddingEventId, weddingEventId),
        eq(timer.status, "PENDING"),
        gt(timer.durationMinutes, 0), // On cherche le premier timer avec durée
      ),
      orderBy: [asc(timer.orderIndex)],
    });

    if (!firstTimer) {
      return { started: false, reason: "No timer found" };
    }

    // Si le timer n'a pas de scheduledStartTime, ne rien faire
    if (!firstTimer.scheduledStartTime) {
      return { started: false, reason: "No scheduled start time" };
    }

    const scheduledTime = firstTimer.scheduledStartTime;

    logger(
      `[CheckAndStartWedding] Timer: ${firstTimer.name}, Scheduled: ${scheduledTime}, Now: ${now}`,
    );

    // Si l'heure programmée n'est pas encore passée, ne rien faire
    if (!isTimezoneAgnosticDatePast(scheduledTime)) {
      logger(
        `[CheckAndStartWedding] Il n'est pas encore temps de démarrer le mariage ${weddingEventId} : scheduled at ${scheduledTime}, now is ${now}`,
      );

      return {
        started: false,
        reason: "Not yet time",
        scheduledTime: scheduledTime.toISOString(),
        currentTime: now.toISOString(),
      };
    }

    // L'heure est passée, démarrer le mariage
    try {
      logger(`[CheckAndStartWedding] Démarrage du mariage ${weddingEventId}`);
      await this.startTimer(firstTimer.id, weddingEventId);
      return {
        started: true,
        timerId: firstTimer.id,
        timerName: firstTimer.name,
        startedAt: now.toISOString(),
      };
    } catch (error) {
      console.error(
        `[CheckAndStartWedding] Erreur lors du démarrage du timer ${firstTimer.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Vérifie et démarre les timers ponctuels dont l'heure est passée
   * À appeler via un cron job toutes les minutes
   */
  async checkAndStartPunctualTimers(weddingEventId: string) {
    // Trouver le premier timer ponctuel PENDING dont scheduledStartTime est passé
    // Le filtre sur scheduledStartTime <= now doit être fait en JS car Drizzle
    // n'a pas de comparateur direct avec new Date() dans le where
    const timerToStart = await db.query.timer.findFirst({
      where: and(
        eq(timer.weddingEventId, weddingEventId),
        eq(timer.status, "PENDING"),
        or(eq(timer.durationMinutes, 0), isNull(timer.durationMinutes)),
        eq(timer.isManual, false),
      ),
      orderBy: [asc(timer.orderIndex), asc(timer.scheduledStartTime)],
    });

    // Si scheduledStartTime n'existe pas ne rien faire
    if (!timerToStart || !timerToStart.scheduledStartTime) {
      return { startedTimer: null };
    }

    // Si l'heure de début du timer n'est pas encore passée, ne rien faire
    if (!isTimezoneAgnosticDatePast(timerToStart.scheduledStartTime)) {
      return { startedTimer: null };
    }

    if (
      isTimezoneAgnosticDatePast(timerToStart.scheduledStartTime) &&
      timerToStart.status === "PENDING"
    ) {
      try {
        await this.startPunctualOrManualTimer(timerToStart.id, weddingEventId);
        return { startedTimer: timerToStart.id };
      } catch (error) {
        console.error(`Erreur lors du démarrage du timer ${timerToStart.id}:`, error);
        throw error;
      }
    }
    return { startedTimer: null };
  }

  /**
   * Récupère le timer actuel avec ses actions
   */
  async getCurrentTimer(weddingEventId: string) {
    try {
      const event = await db.query.weddingEvent.findFirst({
        where: eq(weddingEvent.id, weddingEventId),
      });

      if (!event?.currentTimerId) {
        return null;
      }

      const currentTimer = await db.query.timer.findFirst({
        where: eq(timer.id, event.currentTimerId),
        with: {
          actions: {
            orderBy: [asc(timerAction.orderIndex)],
          },
        },
      });

      logger(
        `[getCurrentTimer] Scheduled start time du timer trouvé : ${event?.currentTimerId} --- ${currentTimer?.scheduledStartTime}`,
      );

      // logger(`Current timer retrieved: ${currentTimer ? currentTimer.name : "null"}`);
      return currentTimer;
    } catch (error) {
      logger(
        `Error in getCurrentTimer: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Récupère tous les timers d'un événement
   */
  async getAllTimers(weddingEventId: string) {
    const timers = await db.query.timer.findMany({
      where: eq(timer.weddingEventId, weddingEventId),
      orderBy: [asc(timer.orderIndex)],
      with: {
        actions: {
          orderBy: [asc(timerAction.orderIndex)],
        },
      },
    });

    logger(`Total timers retrieved: ${timers.length}`);

    return timers;
  }

  /**
   * Reset le mariage (pour mode démo)
   */
  async resetWeddingFromNormal(weddingEventId: string, weddingEventIdToCopyFrom: string) {
    const now = new Date();

    // Copier les timers et actions du mariage source vers le mariage cible
    const sourceTimers = await db.query.timer.findMany({
      where: eq(timer.weddingEventId, weddingEventIdToCopyFrom),
      with: { actions: true },
      orderBy: [asc(timer.orderIndex)],
    });

    // get all timers of the target wedding event
    const targetTimers = await db.query.timer.findMany({
      where: eq(timer.weddingEventId, weddingEventId),
      with: { actions: true },
      orderBy: [asc(timer.orderIndex)],
    });

    if (sourceTimers.length === 0 || targetTimers.length === 0) {
      throw new Error("Aucun timer trouvé pour l'événement source ou cible");
    }
    // await db
    //   .update(timer)
    //   .set({
    //     status: "PENDING",
    //     startedAt: null,
    //     completedAt: null,
    //     updatedAt: now,
    //   })
    //   .where(eq(timer.weddingEventId, weddingEventId));

    // Reset tous les timers de la cible avec les valeurs sources
    // targetTimers doit se mettre a jour avec les valeurs de sourceTimers
    // targetTimers.length doit être égal à sourceTimers.length
    if (sourceTimers.length !== targetTimers.length) {
      throw new Error(
        "Le nombre de timers source et cible ne correspond pas, impossible de reset",
      );
    }
    // targetTimers sourceTimers n'ont pas forcement le meme ordre, faire correspondre par l'id
    // targetTimer.id = 'timer-demo-1', sourceTimer.id = 'timer-1' => faire la correspondance en supprimant '-demo'
    // il faut boucler sur sourceTimers et trouver le timer correspondant dans targetTimers
    for (const [, sourceTimer] of sourceTimers.entries()) {
      const targetTimer = targetTimers.find(
        (t) => t.id.replace("-demo", "") === sourceTimer.id,
      );
      if (!targetTimer) {
        throw new Error(`Aucun timer correspondant trouvé pour: ${sourceTimer.id}`);
      }

      const targetTimerId = targetTimer.id.replace("-demo", "");
      if (sourceTimer.id !== targetTimerId) {
        throw new Error(
          `Les timers source et cible ne correspondent pas: ${sourceTimer.id} vs ${targetTimer.id}`,
        );
      }

      console.log("TUDUDUDUD --- ", sourceTimer.id, targetTimer.id);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, weddingEventId, actions, ...timerData } = sourceTimer;
      console.log(
        `Resetting timer ${targetTimer.id} for wedding event ${weddingEventId}`,
      );
      // Mettre à jour le timer
      const [updatedTimer] = await db
        .update(timer)
        .set({
          ...timerData,
          status: "PENDING",
          startedAt: null,
          completedAt: null,
          updatedAt: convertToTimezoneAgnosticDate(now),
        })
        .where(eq(timer.id, targetTimer.id))
        .returning();
      console.log(updatedTimer);
    }

    // Reset toutes les actions
    await db
      .update(timerAction)
      .set({
        executedAt: null,
        status: "PENDING",
      })
      .where(
        inArray(
          timerAction.timerId,
          db
            .select({ id: timer.id })
            .from(timer)
            .where(eq(timer.weddingEventId, weddingEventId)),
        ),
      );

    // Reset l'événement
    await db
      .update(weddingEvent)
      .set({
        currentTimerId: null,
        updatedAt: now,
      })
      .where(eq(weddingEvent.id, weddingEventId));

    // Notifier via Pusher
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      weddingEventId,
      action: "reset",
    });

    return { success: true };
  }

  /**
   * Pour le mode démo : sauter à un timer spécifique
   * Complète tous les timers précédents et démarre le timer cible à T-15s
   */
  async jumpToTimer(timerId: string, secondsBeforeAction: number = 15) {
    const targetTimer = await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
      with: {
        actions: {
          orderBy: [asc(timerAction.orderIndex)],
        },
      },
    });

    if (!targetTimer) {
      throw new Error("Timer non trouvé");
    }

    const now = new Date();

    // Compléter tous les timers précédents
    await db
      .update(timer)
      .set({
        status: "COMPLETED",
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(timer.weddingEventId, targetTimer.weddingEventId),
          lt(timer.orderIndex, targetTimer.orderIndex),
        ),
      );

    // Calculer l'heure de démarrage pour être à T-15s de la première action
    const firstAction = targetTimer.actions[0];
    let startTime = new Date(now.getTime() - secondsBeforeAction * 1000);

    // Si l'action a un offset, l'ajuster
    if (firstAction?.triggerOffsetMinutes) {
      startTime = new Date(
        startTime.getTime() - firstAction.triggerOffsetMinutes * 60000,
      );
    }

    // Démarrer le timer cible avec l'heure calculée
    await db
      .update(timer)
      .set({
        status: "RUNNING",
        startedAt: startTime,
        updatedAt: now,
      })
      .where(eq(timer.id, timerId));

    // Mettre à jour le currentTimerId
    await db
      .update(weddingEvent)
      .set({
        currentTimerId: timerId,
        updatedAt: now,
      })
      .where(eq(weddingEvent.id, targetTimer.weddingEventId));

    // Notifier via Pusher
    await pusher.trigger(CHANNEL, ACTION_UPDATED, {
      timerId,
      weddingEventId: targetTimer.weddingEventId,
      startTime: startTime.toISOString(),
    });

    return { timerId, startTime };
  }
}

// Export singleton
export const timerService = new TimerService();
