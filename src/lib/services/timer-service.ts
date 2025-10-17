import { env } from "@/env/server";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import Pusher from "pusher";

import { db } from "@/lib/db";
import { timer, timerAction, UpdateTimer, weddingEvent } from "../db/schema";
import { CHANNEL, convertToTimezoneAgnosticDate, logger, TIMER_UPDATED } from "../utils";

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
        updatedAt: convertToTimezoneAgnosticDate(new Date()),
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
   * @param clientLocalDate - Date locale du client au moment du clic (ISO string)
   */
  async startWeddingDemo(
    weddingEventId: string,
    weddingEventIdToCopyFrom: string,
    clientLocalDate: string,
  ) {
    logger(`Starting wedding demo for event: ${weddingEventId}`);

    const now = new Date(clientLocalDate);

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
    // Le premier timer commence maintenant + 1.5 minutes
    let currentScheduledTime: Date | null = now;

    // add a test if localhost is in the URL, if yes, use convertToTimezoneAgnosticDate(now);
    if (env.VITE_BASE_URL.includes("localhost")) {
      currentScheduledTime = convertToTimezoneAgnosticDate(now);
    } else {
      // remove the utc offset to have the local time
      currentScheduledTime = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000 + 1.5 * 60000,
      );
    }

    logger("[Start wedding demo] Initial scheduled time:");
    console.log(currentScheduledTime);

    if (currentScheduledTime) {
      currentScheduledTime = new Date(currentScheduledTime.getTime() + 1.5 * 60000);
    }
    console.log("Initial now to updatedAt:", currentScheduledTime);

    // Durée custom pour le mode démo en minutes (tous les timers avec durée durent 20min en mode démo)
    const customDemoDuration = 10;

    for (let i = 0; i < allTimers.length; i++) {
      const currentTimer = allTimers[i];
      const nextTimer = i < allTimers.length - 1 ? allTimers[i + 1] : null;
      let newScheduledTime: Date | null = null;

      // Déterminer le type de timer
      const isManual = currentTimer.isManual === true;
      const hasNoDuration =
        !currentTimer.durationMinutes || currentTimer.durationMinutes === 0;
      const hasDuration =
        currentTimer.durationMinutes && currentTimer.durationMinutes > 0;

      if (isManual) {
        // Timer manuel : pas de scheduledStartTime (null) comme dans wedding-event-1
        newScheduledTime = null;
        // Le currentScheduledTime ne change pas pour les timers suivants
      } else if (hasNoDuration) {
        // Timer ponctuel : commence à la moitié de la durée du timer SUIVANT
        // Si le timer suivant a une durée de customDemoDuration, le ponctuel commence à customDemoDuration/2 avant la fin
        if (nextTimer && nextTimer.durationMinutes && nextTimer.durationMinutes > 0) {
          // Le timer suivant a une durée, le ponctuel se déclenche au milieu de sa durée
          // On doit d'abord calculer le scheduledStartTime du timer suivant
          // Le timer suivant commence à currentScheduledTime
          const nextTimerStartTime = currentScheduledTime;

          if (nextTimerStartTime) {
            // Le ponctuel commence au milieu du timer suivant
            const punctualOffset = customDemoDuration / 2;
            newScheduledTime = new Date(
              nextTimerStartTime.getTime() + punctualOffset * 60000,
            );
          } else {
            // Fallback : utiliser le currentScheduledTime
            newScheduledTime = currentScheduledTime;
          }
        } else {
          // Pas de timer suivant avec durée, utiliser le currentScheduledTime
          newScheduledTime = currentScheduledTime;
        }
        // Le currentScheduledTime ne change pas pour les timers ponctuels
      } else if (hasDuration) {
        // Timer avec durée : utiliser le currentScheduledTime calculé
        console.log(currentScheduledTime);

        newScheduledTime = currentScheduledTime;

        // Calculer le scheduledStartTime du prochain timer avec durée en ajoutant la durée + l'espacement
        if (currentScheduledTime) {
          currentScheduledTime = new Date(
            currentScheduledTime.getTime() + customDemoDuration * 60000,
          );
        }
      }

      // Mettre à jour le scheduledStartTime du timer actuel
      await db
        .update(timer)
        .set({
          scheduledStartTime: newScheduledTime,
          durationMinutes: hasDuration ? customDemoDuration : 0, // Forcer la durée custom pour les timers avec durée
          updatedAt: now,
        })
        .where(eq(timer.id, currentTimer.id));
    }

    // 4. Récupérer le premier timer avec une durée pour le démarrer
    const firstTimer = allTimers.find((t) => t.durationMinutes && t.durationMinutes > 0);

    if (!firstTimer) {
      // Si aucun timer avec durée, démarrer le premier timer manuel/ponctuel
      throw new Error("Aucun timer avec durée trouvé pour démarrer le mariage");
    }

    // 5. Stop all timers that might be running (safety)
    await db
      .update(timer)
      .set({
        status: "PENDING",
        updatedAt: now,
      })
      .where(eq(timer.weddingEventId, weddingEventId));

    // 6. Démarrer le premier timer avec durée
    await this.startTimer(firstTimer.id);

    // 7. Notifier via Pusher que le mariage demo a démarré
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      weddingEventId,
      timerId: firstTimer.id,
      action: "wedding-demo-started",
      startTime: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return { timerId: firstTimer.id, startTime: now };
  }

  /**
   * Démarre un timer spécifique
   * Utilisé pour le démarrage du mariage
   */
  async startTimer(timerId: string) {
    logger(`[startTimer] Starting timer: ${timerId}`);

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

    if (!isPunctualOrManual) {
      // Pour les timers avec durée, vérifier qu'aucun autre timer avec durée n'est RUNNING
      // const runningTimerWithDuration = await db.query.timer.findFirst({
      //   where: and(
      //     eq(timer.weddingEventId, weddingEventId),
      //     eq(timer.status, "RUNNING"),
      //     gt(timer.durationMinutes, 0),
      //   ),
      // });
      // if (runningTimerWithDuration) {
      //   throw new Error("Un timer avec durée est déjà en cours. Attendez sa completion.");
      // }
    }

    const weddingEventId = currentTimer.weddingEventId;

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
      weddingEventId: weddingEventId,
      action: "started",
      startTime: now.toUTCString(),
      updatedAt: now.toISOString(),
    });

    return { timerId, startTime: now };
  }

  /**
   * Complète un timer et cherche l'id du suivant (excluant les timers manuels et ponctuels)
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

    // Chercher le prochain timer non-manuel et non-ponctuel
    const nextTimer = await this.getNextNonManualNonPunctualTimer(
      currentTimer.weddingEventId,
      currentTimer.orderIndex,
    );

    // Notifier via Pusher
    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      timerId,
      weddingEventId: currentTimer.weddingEventId,
      action: "completed",
      nextTimerId: nextTimer ? nextTimer.id : null,
      completedAt: now.toUTCString(),
      updatedAt: now.toISOString(),
    });

    return {
      timerId,
      completedAt: now,
      nextTimerId: nextTimer ? nextTimer.id : null,
    };
  }

  /**
   * Récupère le prochain timer qui n'est ni manuel ni ponctuel
   *
   * Un timer est considéré comme manuel si :
   * - durationMinutes === 0 ET scheduledStartTime === null
   *
   * Un timer est considéré comme ponctuel si :
   * - durationMinutes === 0 ET scheduledStartTime !== null
   *
   * Un timer normal doit avoir durationMinutes > 0
   */
  async getNextNonManualNonPunctualTimer(
    weddingEventId: string,
    currentOrderIndex: number,
  ) {
    const nextTimerNonManualNonPunctual = await db.query.timer.findFirst({
      where: and(
        eq(timer.weddingEventId, weddingEventId),
        gt(timer.orderIndex, currentOrderIndex),
        eq(timer.isManual, false),
        gt(timer.durationMinutes, 0),
      ),
      orderBy: [asc(timer.orderIndex)],
    });

    return nextTimerNonManualNonPunctual || null;
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
        `[getCurrentTimer] Scheduled start time du timer trouvé : ${event?.currentTimerId}`,
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, weddingEventId, actions, ...timerData } = sourceTimer;

      // Mettre à jour le timer
      await db
        .update(timer)
        .set({
          ...timerData,
          status: "PENDING",
          startedAt: null,
          completedAt: null,
          updatedAt: now,
        })
        .where(eq(timer.id, targetTimer.id))
        .returning();
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
      updatedAt: now.toISOString(),
    });

    return { success: true };
  }
}
// Export singleton
export const timerService = new TimerService();
