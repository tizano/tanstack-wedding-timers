import { env } from "@/env/server";
import { db } from "@/lib/db";
import { timer, timerAction } from "@/lib/db/schema/timer.schema";
import { ACTION_UPDATED, CHANNEL, logger, TIMER_UPDATED } from "@/lib/utils";
import { and, asc, eq, isNull } from "drizzle-orm";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.VITE_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.VITE_PUSHER_CLUSTER,
  useTLS: true,
});

export class TimerActionService {
  /**
   * Récupère la prochaine action à jouer par rapport à l'action courante
   * Si aucune action n'est trouvée, complète la dernière action
   * et retourne null (le timer est terminé)
   *
   *
   * @param timerId - L'ID du timer
   * @param actionId - L'ID de l'action courante (optionnel)
   * @returns L'action suivante avec son timing, ou null si le timer est terminé
   */
  async getNextActionFromCurrent(timerId: string, actionId?: string) {
    const actions = await db.query.timerAction.findMany({
      where: and(eq(timerAction.timerId, timerId), isNull(timerAction.executedAt)),
      orderBy: [asc(timerAction.orderIndex)],
    });

    if (actions.length === 0) {
      return null;
    }

    // Si aucune actionId fournie, retourne la première action non exécutée
    if (!actionId) {
      const firstAction = actions[0];

      return {
        action: firstAction,
      };
    }

    // Trouve l'index de l'action courante
    const currentIndex = actions.findIndex((a) => a.id === actionId);
    if (currentIndex === -1) {
      throw new Error(`Action ${actionId} non trouvée pour le timer ${timerId}`);
    }

    // S'il n'y a pas d'action suivante, retourne null (timer terminé)
    if (currentIndex >= actions.length - 1) {
      this.completeAction(actions[actions.length - 1].id);
      return null;
    }

    // Retourne l'action suivante avec son timing
    const nextAction = actions[currentIndex + 1];
    // const timings = await this.getActionsWithTiming(timerId);
    // const nextActionTiming = timings.find((t) => t.actionId === nextAction.id);

    return {
      action: nextAction,
      // timing: nextActionTiming || null,
    };
  }

  /**
   * Démarre une action (change son statut à RUNNING)
   */
  async startAction(actionId: string) {
    logger(`Starting action: ${actionId}`);

    const action = await db.query.timerAction.findFirst({
      where: eq(timerAction.id, actionId),
    });

    if (!action) {
      logger(`Action not found: ${actionId}`);
      throw new Error(`Action ${actionId} non trouvée`);
    }

    if (action.status === "RUNNING") {
      return { action, alreadyRunning: true };
    }

    await db
      .update(timerAction)
      .set({
        status: "RUNNING",
      })
      .where(eq(timerAction.id, actionId));

    await pusher.trigger(CHANNEL, ACTION_UPDATED, {
      actionId,
      timerId: action.timerId,
    });

    return { action, alreadyRunning: false };
  }

  /**
   * Complète une action
   */
  async completeAction(actionId: string) {
    logger(`Completing action: ${actionId}`);

    const action = await db.query.timerAction.findFirst({
      where: eq(timerAction.id, actionId),
    });

    if (!action) {
      logger(`Action not found for completion: ${actionId}`);
      throw new Error(`Action ${actionId} non trouvée`);
    }

    if (action.executedAt) {
      return { action, alreadyCompleted: true };
    }

    const now = new Date();

    await db
      .update(timerAction)
      .set({
        executedAt: now,
        status: "COMPLETED",
      })
      .where(eq(timerAction.id, actionId));

    await pusher.trigger(CHANNEL, ACTION_UPDATED, {
      actionId,
      timerId: action.timerId,
    });

    return { action, alreadyCompleted: false };
  }

  /**
   * Reset toutes les actions d'un timer (pour démo)
   */
  async resetTimerActions(timerId: string) {
    await db
      .update(timerAction)
      .set({
        executedAt: null,
        status: "PENDING",
      })
      .where(eq(timerAction.timerId, timerId));

    await pusher.trigger(CHANNEL, ACTION_UPDATED, {
      timerId,
      action: "reset",
    });

    return { timerId, reset: true };
  }

  /**
   * Saute à X secondes avant la prochaine action (pour démo)
   */
  async jumpToBeforeNextAction(timerId: string, secondsBefore: number = 45) {
    const currentTimer = await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
      with: { actions: { orderBy: [asc(timerAction.orderIndex)] } },
    });

    if (!currentTimer) {
      throw new Error(`Timer ${timerId} non trouvé`);
    }

    logger(`Jumping to ${secondsBefore} seconds before next action for timer ${timerId}`);

    const nextAction = await this.getNextActionFromCurrent(timerId);

    if (!nextAction) {
      throw new Error("Aucune action suivante trouvée");
    }

    // Calculer le nouveau startedAt pour que l'action se déclenche X secondes avant l'heure prevue, il faut donc mettre a jour le startedAt du timer en fonction de l'offset de l'action et de la durée du timer

    /**
     * Si l'action doit se déclencher à scheduledStartTime, et dure durationMinutes et que l'offset de l'action est triggerOffsetMinutes et que l'action a un displayDurationSeconds
     * Calculer l'heure de fin du timer théorique enfonction de l'heure a laquelle l'action a ete appelée
     * triggeredManuallyAt = now
     * newDurationMinutes = endScheduledTime - scheduledStartTime - secondsBefore
     * Exemple:
     * scheduledStartTime: 2025-10-05T18:00:00.000Z
     * triggeredManuallyAt: 2025-10-05T18:02:00.000Z (maintenant)
     * durationMinutes: 30 (30min)
     * triggerOffsetMinutes: -2 (2min avant la fin)
     * secondsBefore: 45
     * newDurationMinutes = (2025-10-05T18:30:00.000Z - 2025-10-05T18:02:00.000Z) - 2 - 0.75 = 25.25 minutes
     *
     */
    const triggeredManuallyAt = new Date();
    const endScheduledTime = new Date(
      (currentTimer.scheduledStartTime?.getTime() || 0) +
        (currentTimer.durationMinutes || 0) * 60000,
    );

    let newDurationMinutes =
      (endScheduledTime.getTime() - triggeredManuallyAt.getTime()) / 60000 -
      nextAction.action.triggerOffsetMinutes -
      secondsBefore / 60;

    newDurationMinutes = (currentTimer.durationMinutes || 0) - newDurationMinutes;
    newDurationMinutes = +newDurationMinutes.toFixed(2);

    //old startedAt
    logger(`Old durationMinutes for timer ${timerId}: ${currentTimer.durationMinutes}`);
    logger(`New durationMinutes for timer ${timerId}: ${newDurationMinutes}`);

    await db
      .update(timer)
      .set({
        startedAt: triggeredManuallyAt,
        updatedAt: new Date(),
        durationMinutes: newDurationMinutes > 0 ? newDurationMinutes : 0,
      })
      .where(eq(timer.id, timerId));
    // .returning();

    // logger(`Timer ${timerId} new startedAt: ${newStartedAt}`);
    // console.log(test);

    await pusher.trigger(CHANNEL, TIMER_UPDATED, {
      timerId,
      actionId: nextAction.action?.id,
      secondsBefore,
    });

    return {
      timerId,
      nextAction: nextAction.action,
      triggersIn: secondsBefore,
    };
  }
}

export const timerActionService = new TimerActionService();
