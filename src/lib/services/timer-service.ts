import { env } from "@/env/server";
import { and, asc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import Pusher from "pusher";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
// import timezone from 'dayjs/plugin/timezone';
import utc from "dayjs/plugin/utc";
import { db } from "../db";
import { timer, timerAction, UpdateTimer, weddingEvent } from "../db/schema";
import { logger } from "../utils";

dayjs.extend(utc);
// dayjs.extend(timezone);
dayjs.extend(duration);

const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.VITE_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.VITE_PUSHER_CLUSTER,
  useTLS: true,
});

export const CHANNEL = "wedding-timers";
export const TIMER_UPDATED = "timer-updated";
export const TIMER_PUNCTAL_MANUAL_STARTED = "timer-punctual-manual-started";
export const ACTION_EXECUTED = "action-executed";
export const JUMP_NEXT_ACTION = "jump-next-action";

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

    return updatedTimer;
  };

  /**
   * TODO: Démarre le mariage de demo (lance le premier timer)
   * Appelé par le frontend quand l'utilisateur clique sur "Démarrer le mariage" en mode démo
   * Vérifie qu'aucun timer n'est déjà en cours
   * Met a jour le champs scheduledStartTime du timer trouvé avec la date actuelle, attention toutes les dates sont en utc
   * Lance le premier timer (orderIndex le plus petit)
   * Met à jour le currentTimerId de l'événement
   * Notifie via Pusher
   */
  async startWeddingDemo(weddingEventId: string) {
    logger(`Starting wedding demo for event: ${weddingEventId}`);

    // Récupérer le premier timer (orderIndex le plus petit)
    const firstTimer = await db.query.timer.findFirst({
      where: eq(timer.weddingEventId, weddingEventId),
      orderBy: [asc(timer.orderIndex)],
    });

    if (!firstTimer) {
      logger(`No timers found for wedding event: ${weddingEventId}`);
      throw new Error("Aucun timer trouvé pour cet événement");
    }

    // Vérifier qu'aucun timer n'est déjà en cours
    const runningTimer = await db.query.timer.findFirst({
      where: and(eq(timer.weddingEventId, weddingEventId), eq(timer.status, "RUNNING")),
    });

    if (runningTimer) {
      throw new Error("Un timer est déjà en cours pour cet événement");
    }

    // Obtenir la date actuelle en UTC
    const now = dayjs().utc().toDate();

    // Mettre à jour le scheduledStartTime du premier timer avec la date actuelle
    await db
      .update(timer)
      .set({
        scheduledStartTime: now,
        updatedAt: now,
      })
      .where(eq(timer.id, firstTimer.id));

    // Lancer le premier timer via startTimer
    await this.startTimer(firstTimer.id, weddingEventId);

    // Notifier via Pusher que le mariage demo a démarré
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      weddingEventId,
      timerId: firstTimer.id,
      action: "wedding-demo-started",
      startTime: now.toUTCString(),
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
      logger(`Timer not found: ${timerId}`);
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
    const now = dayjs().toDate();
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
      const now = dayjs().toDate();
      const updatedTimer = await db
        .update(timer)
        .set({
          status: "RUNNING",
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(timer.id, timerId));

      // Notifier via Pusher
      await pusher.trigger(CHANNEL, TIMER_PUNCTAL_MANUAL_STARTED, {
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

    const now = dayjs().toDate();

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
    await pusher.trigger(CHANNEL, ACTION_EXECUTED, {
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

    const now = dayjs().toDate();

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
   * Vérifie et démarre les timers ponctuels dont l'heure est passée
   * À appeler via un cron job toutes les minutes
   */
  async checkAndStartPunctualTimers(weddingEventId: string) {
    const localTimeNow = dayjs().utc(true);

    // Trouver le premier timer ponctuel PENDING dont scheduledStartTime est passé
    // Le filtre sur scheduledStartTime <= now doit être fait en JS car Drizzle
    // n'a pas de comparateur direct avec new Date() dans le where
    const timerToStart = await db.query.timer.findFirst({
      where: and(
        eq(timer.weddingEventId, weddingEventId),
        eq(timer.status, "PENDING"),
        or(eq(timer.durationMinutes, 0), isNull(timer.durationMinutes)),
      ),
      orderBy: [asc(timer.orderIndex), asc(timer.scheduledStartTime)],
    });

    console.log(
      `Scheduled start time du timer trouvé : ${dayjs(timerToStart?.scheduledStartTime)} (maintenant : ${localTimeNow})`,
    );

    // Si scheduledStartTime n'existe pas ne rien faire
    if (!timerToStart || !timerToStart.scheduledStartTime) {
      return { startedTimer: null };
    }

    // Si l'heure de début du timer n'est pas encore passée, ne rien faire
    if (localTimeNow.isBefore(dayjs(timerToStart.scheduledStartTime))) {
      return { startedTimer: null };
    }

    if (
      localTimeNow.isAfter(dayjs(timerToStart.scheduledStartTime)) &&
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
   * Vérifie et démarre les timers ponctuels pour tous les événements actifs
   * À appeler via un cron job toutes les minutes
   */
  async checkAndStartAllPunctualTimers() {
    const now = dayjs();

    // Récupérer tous les événements de mariage actifs (qui ont un currentTimerId ou qui sont le jour J)
    const activeEvents = await db.query.weddingEvent.findMany({
      where: or(
        // Événements avec un timer en cours
        and(isNotNull(weddingEvent.currentTimerId)),
        // Ou événements dont la date est aujourd'hui (en cours)
        eq(weddingEvent.eventDate, now.toDate()),
      ),
    });

    const results = [];

    for (const event of activeEvents) {
      try {
        const result = await this.checkAndStartPunctualTimers(event.id);
        if (result.startedTimer) {
          results.push({
            weddingEventId: event.id,
            startedTimer: result.startedTimer,
          });
        }
      } catch (error) {
        console.error(`Erreur pour l'événement ${event.id}:`, error);
        results.push({
          weddingEventId: event.id,
          error: String(error),
        });
      }
    }

    return {
      checkedEvents: activeEvents.length,
      results,
    };
  }

  /**
   * Récupère le timer actuel avec ses actions
   */
  async getCurrentTimer(weddingEventId: string) {
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

    return currentTimer;
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

    return timers;
  }

  /**
   * Reset le mariage (pour mode démo)
   */
  async resetWedding(weddingEventId: string) {
    const now = dayjs().toDate();

    // Reset tous les timers
    await db
      .update(timer)
      .set({
        status: "PENDING",
        startedAt: null,
        completedAt: null,
        updatedAt: now,
      })
      .where(eq(timer.weddingEventId, weddingEventId));

    // Reset toutes les actions
    await db
      .update(timerAction)
      .set({
        executedAt: null,
      })
      .where(
        eq(
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

    const now = dayjs();

    // Compléter tous les timers précédents
    await db
      .update(timer)
      .set({
        status: "COMPLETED",
        completedAt: now.toDate(),
        updatedAt: now.toDate(),
      })
      .where(
        and(
          eq(timer.weddingEventId, targetTimer.weddingEventId),
          lt(timer.orderIndex, targetTimer.orderIndex),
        ),
      );

    // Calculer l'heure de démarrage pour être à T-15s de la première action
    const firstAction = targetTimer.actions[0];
    let startTime = now.subtract(secondsBeforeAction, "seconds");

    // Si l'action a un offset, l'ajuster
    if (firstAction?.triggerOffsetMinutes) {
      startTime = startTime.subtract(firstAction.triggerOffsetMinutes, "minutes");
    }

    // Démarrer le timer cible avec l'heure calculée
    await db
      .update(timer)
      .set({
        status: "RUNNING",
        startedAt: startTime.toDate(),
        updatedAt: now.toDate(),
      })
      .where(eq(timer.id, timerId));

    // Mettre à jour le currentTimerId
    await db
      .update(weddingEvent)
      .set({
        currentTimerId: timerId,
        updatedAt: now.toDate(),
      })
      .where(eq(weddingEvent.id, targetTimer.weddingEventId));

    // Notifier via Pusher
    await pusher.trigger(CHANNEL, JUMP_NEXT_ACTION, {
      timerId,
      weddingEventId: targetTimer.weddingEventId,
      startTime: startTime.toISOString(),
    });

    return { timerId, startTime: startTime.toDate() };
  }
}

// Export singleton
export const timerService = new TimerService();
