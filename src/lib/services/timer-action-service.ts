import { env } from "@/env/server";
import { db } from "@/lib/db";
import { timer, timerAction } from "@/lib/db/schema/timer.schema";
import { logger } from "@/lib/utils";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import utc from "dayjs/plugin/utc";
import { and, asc, eq, isNull } from "drizzle-orm";
import Pusher from "pusher";

dayjs.extend(utc);
dayjs.extend(duration);

const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.VITE_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.VITE_PUSHER_CLUSTER,
  useTLS: true,
});

export const CHANNEL = "wedding-timers";
export const ACTION_STARTED = "action-started";
export const ACTION_COMPLETED = "action-completed";
export const ACTION_TIME_JUMP = "action-time-jump";

interface ActionTiming {
  actionId: string;
  triggerTime: Date;
  triggerOffsetMinutes: number;
  secondsUntilTrigger: number;
}

export class TimerActionService {
  /**
   * Calcule le temps absolu de déclenchement d'une action
   * @param timerStartTime - Heure de début du timer
   * @param timerDurationMinutes - Durée totale du timer
   * @param triggerOffsetMinutes - Offset de l'action (0 = à la fin, négatif = avant la fin)
   */
  private calculateActionTriggerTime(
    timerStartTime: Date,
    timerDurationMinutes: number,
    triggerOffsetMinutes: number,
  ): Date {
    const start = dayjs(timerStartTime);

    if (triggerOffsetMinutes === 0) {
      // À la fin du timer
      return start.add(timerDurationMinutes, "minutes").toDate();
    } else if (triggerOffsetMinutes < 0) {
      // Avant la fin (ex: -15 = 15min avant la fin)
      return start.add(timerDurationMinutes + triggerOffsetMinutes, "minutes").toDate();
    } else {
      // Après le début (cas rare mais possible)
      return start.add(triggerOffsetMinutes, "minutes").toDate();
    }
  }

  /**
   * Récupère toutes les actions d'un timer avec leur timing calculé
   */
  async getActionsWithTiming(timerId: string): Promise<ActionTiming[]> {
    const currentTimer = await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
      with: { actions: { orderBy: [asc(timerAction.orderIndex)] } },
    });

    if (!currentTimer || !currentTimer.startedAt) {
      return [];
    }

    const now = dayjs();
    const durationMinutes = currentTimer.durationMinutes || 0;

    return currentTimer.actions.map((action) => {
      const triggerTime = this.calculateActionTriggerTime(
        currentTimer.startedAt!,
        durationMinutes,
        action.triggerOffsetMinutes,
      );

      const secondsUntilTrigger = dayjs(triggerTime).diff(now, "seconds");

      return {
        actionId: action.id,
        triggerTime,
        triggerOffsetMinutes: action.triggerOffsetMinutes,
        secondsUntilTrigger,
      };
    });
  }

  /**
   * Récupère la prochaine action à jouer
   */
  async getNextAction(timerId: string) {
    const actions = await db.query.timerAction.findMany({
      where: and(eq(timerAction.timerId, timerId), isNull(timerAction.executedAt)),
      orderBy: [asc(timerAction.orderIndex)],
    });

    if (actions.length === 0) {
      return null;
    }

    const timings = await this.getActionsWithTiming(timerId);
    const nextActionTiming = timings.find(
      (t) => t.secondsUntilTrigger > 0 && actions.some((a) => a.id === t.actionId),
    );

    if (!nextActionTiming) {
      return null;
    }

    const action = actions.find((a) => a.id === nextActionTiming.actionId);

    return {
      action,
      timing: nextActionTiming,
    };
  }

  /**
   * Récupère l'action courante (celle qui devrait être affichée maintenant)
   */
  async getCurrentAction(timerId: string) {
    const actions = await db.query.timerAction.findMany({
      where: and(eq(timerAction.timerId, timerId), isNull(timerAction.executedAt)),
      orderBy: [asc(timerAction.orderIndex)],
    });

    if (actions.length === 0) {
      return null;
    }

    const timings = await this.getActionsWithTiming(timerId);

    // Trouve la première action dont le temps de déclenchement est passé
    const currentActionTiming = timings
      .filter((t) => t.secondsUntilTrigger <= 0)
      .sort((a, b) => b.secondsUntilTrigger - a.secondsUntilTrigger)[0];

    if (!currentActionTiming) {
      return null;
    }

    const action = actions.find((a) => a.id === currentActionTiming.actionId);

    return {
      action,
      timing: currentActionTiming,
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

    await pusher.trigger(CHANNEL, ACTION_STARTED, {
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

    const now = dayjs().toDate();

    await db
      .update(timerAction)
      .set({
        executedAt: now,
        status: "COMPLETED",
      })
      .where(eq(timerAction.id, actionId));

    await pusher.trigger(CHANNEL, ACTION_COMPLETED, {
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

    await pusher.trigger(CHANNEL, ACTION_TIME_JUMP, {
      timerId,
      action: "reset",
    });

    return { timerId, reset: true };
  }

  /**
   * Saute à X secondes avant la prochaine action (pour démo)
   */
  async jumpToBeforeNextAction(timerId: string, secondsBefore: number = 15) {
    const currentTimer = await db.query.timer.findFirst({
      where: eq(timer.id, timerId),
    });

    if (!currentTimer) {
      throw new Error(`Timer ${timerId} non trouvé`);
    }

    const nextAction = await this.getNextAction(timerId);

    if (!nextAction) {
      throw new Error("Aucune action suivante trouvée");
    }

    // Calculer le nouveau startedAt pour que l'action se déclenche dans X secondes
    const targetTime = dayjs(nextAction.timing.triggerTime).subtract(
      secondsBefore,
      "seconds",
    );
    const durationMinutes = currentTimer.durationMinutes || 0;
    const newStartedAt = targetTime
      .subtract(durationMinutes + nextAction.timing.triggerOffsetMinutes, "minutes")
      .toDate();

    await db
      .update(timer)
      .set({
        startedAt: newStartedAt,
        updatedAt: new Date(),
      })
      .where(eq(timer.id, timerId));

    await pusher.trigger(CHANNEL, ACTION_TIME_JUMP, {
      timerId,
      actionId: nextAction.action?.id,
      secondsBefore,
    });

    return {
      timerId,
      newStartedAt,
      nextAction: nextAction.action,
      triggersIn: secondsBefore,
    };
  }
}

export const timerActionService = new TimerActionService();
