import { env } from "@/env/server";
import { db } from "@/lib/db";
import { timer, timerAction } from "@/lib/db/schema/timer.schema";
import {
  ACTION_UPDATED,
  CHANNEL,
  convertToTimezoneAgnosticDate,
  formatTimezoneAgnosticDate,
  logger,
} from "@/lib/utils";
import { and, asc, eq, gt, isNotNull, isNull, not, or } from "drizzle-orm";
import Pusher from "pusher";
import { weddingEvent } from "../db/schema";

const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.VITE_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.VITE_PUSHER_CLUSTER,
  useTLS: true,
});

export class TimerActionService {
  async getActionById(actionId: string) {
    const action = await db.query.timerAction.findFirst({
      where: eq(timerAction.id, actionId),
    });

    if (!action) {
      logger(`Action not found: ${actionId}`);
      throw new Error(`Action ${actionId} non trouvée`);
    }

    return action;
  }
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
  async getNextActionFromCurrent(timerId: string, actionId: string) {
    const currentAction = await this.getActionById(actionId);

    if (!currentAction) {
      logger(`Current action not found: ${actionId}`);
      throw new Error(`Current action ${actionId} non trouvée`);
    }

    const actions = await db.query.timerAction.findMany({
      where: and(
        eq(timerAction.timerId, timerId),
        isNull(timerAction.executedAt),
        gt(timerAction.orderIndex, currentAction.orderIndex),
      ),
      orderBy: [asc(timerAction.orderIndex)],
    });

    if (actions.length === 0) {
      return null;
    }

    // Trouve l'index de l'action courante
    logger("[getNextActionFromCurrent] Actions depuis le service -- ");
    console.log(actions);

    return {
      action: actions[0],
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
      logger(`Action not found dddd: ${actionId}`);
      throw new Error(`Action ${actionId} non trouvée`);
    }

    // get the timer of this action
    const timerFromActionNotManualOrPunctual = await db.query.timer.findFirst({
      where: and(
        eq(timer.id, action.timerId),
        not(eq(timer.isManual, false)),
        or(not(eq(timer.durationMinutes, 0)), isNotNull(timer.durationMinutes)),
      ),
    });

    if (timerFromActionNotManualOrPunctual) {
      const isCurrentTimerInWedding = await db.query.weddingEvent.findFirst({
        where: and(
          eq(weddingEvent.currentTimerId, timerFromActionNotManualOrPunctual.id),
        ),
      });

      if (!isCurrentTimerInWedding) {
        logger(`Timer is not the current timer in wedding for action: ${actionId}`);
        throw new Error(
          `Timer is not the current timer in wedding for action: ${actionId}, you should display it before starting an action`,
        );
      }
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
    logger(`Completing action start for : ${actionId}`);

    const action = await db.query.timerAction.findFirst({
      where: eq(timerAction.id, actionId),
    });

    if (!action) {
      logger(`Action not found for completion: ${actionId}`);
      throw new Error(`Action ${actionId} non trouvée`);
    }

    if (action.executedAt) {
      logger(`Action already completed : ${actionId}`);
      throw new Error(`Action already completed : ${actionId}`);
    }

    const now = new Date();

    await db
      .update(timerAction)
      .set({
        executedAt: convertToTimezoneAgnosticDate(now),
        status: "COMPLETED",
      })
      .where(eq(timerAction.id, actionId));

    const nextAction = await this.getNextActionFromCurrent(action.timerId, actionId);
    logger("[completeAction] Next action from service -- ");
    console.log(nextAction);

    await pusher.trigger(CHANNEL, ACTION_UPDATED, {
      actionId,
      timerId: action.timerId,
      allActionsExecuted: !nextAction,
      nextAction: nextAction ? nextAction.action : null,
    });

    return { action, completedAt: formatTimezoneAgnosticDate(now) };
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

  //resetAllTimersActions
  async resetAllTimersActions() {
    await db
      .update(timerAction)
      .set({
        executedAt: null,
        status: "PENDING",
      })
      .where(isNull(timerAction.executedAt));

    await pusher.trigger(CHANNEL, ACTION_UPDATED, {
      action: "resetAll",
    });

    return { resetAll: true };
  }
}

export const timerActionService = new TimerActionService();
