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
    if (triggerOffsetMinutes === 0) {
      // À la fin du timer
      return new Date(timerStartTime.getTime() + timerDurationMinutes * 60000);
    } else if (triggerOffsetMinutes < 0) {
      // Avant la fin (ex: -15 = 15min avant la fin)
      return new Date(
        timerStartTime.getTime() + (timerDurationMinutes + triggerOffsetMinutes) * 60000,
      );
    } else {
      // Après le début (cas rare mais possible)
      return new Date(timerStartTime.getTime() + triggerOffsetMinutes * 60000);
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

    const now = new Date();
    const durationMinutes = currentTimer.durationMinutes || 0;

    logger(`[getActionsWithTiming] Calculating timings for timer ${timerId}`);

    return currentTimer.actions.map((action, index) => {
      const triggerTime = this.calculateActionTriggerTime(
        currentTimer.startedAt!,
        durationMinutes,
        action.triggerOffsetMinutes + index * 0.001, // Petit offset pour garder l'ordre si même triggerOffsetMinutes
      );

      const secondsUntilTrigger = Math.floor(
        (triggerTime.getTime() - now.getTime()) / 1000,
      );
      logger(
        `[getActionsWithTiming] Action ${action.id} triggers at ${triggerTime} (${secondsUntilTrigger} seconds left)`,
      );

      return {
        actionId: action.id,
        triggerTime,
        triggerOffsetMinutes: action.triggerOffsetMinutes,
        secondsUntilTrigger,
      };
    });
  }

  /**
   * Récupère la prochaine action à jouer par rapport à l'action courante
   * Si aucune action n'est trouvée, complète la dernière action
   * et retourne null (le timer est terminé)
   *
   * Pas besoin de calculer le timing ici, c'est fait dans getActionsWithTiming()
   *
   * @param timerId - L'ID du timer
   * @param actionId - L'ID de l'action courante (optionnel)
   * @returns L'action suivante avec son timing, ou null si le timer est terminé
   */
  async getNextAction(timerId: string, actionId?: string) {
    const actions = await db.query.timerAction.findMany({
      where: and(eq(timerAction.timerId, timerId), isNull(timerAction.executedAt)),
      orderBy: [asc(timerAction.orderIndex)],
    });

    if (actions.length === 0) {
      return null;
    }

    // logger(`[getNextAction] Finding next action for timer ${timerId}`);
    // console.log(actions);

    // Si aucune actionId fournie, retourne la première action non exécutée
    if (!actionId) {
      const firstAction = actions[0];
      // const timings = await this.getActionsWithTiming(timerId);
      // const timing = timings.find((t) => t.actionId === firstAction.id);

      return {
        action: firstAction,
        // timing: timing || null,
      };
    }

    // Trouve l'index de l'action courante
    const currentIndex = actions.findIndex((a) => a.id === actionId);

    // if (currentIndex === -1) {
    //   // L'action courante n'existe pas ou est déjà exécutée
    //   // Retourne la première action non exécutée
    //   const firstAction = actions[0];
    //   const timings = await this.getActionsWithTiming(timerId);
    //   const timing = timings.find((t) => t.actionId === firstAction.id);

    //   return {
    //     action: firstAction,
    //     timing: timing || null,
    //   };
    // }

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

    const nextAction = await this.getNextAction(timerId);

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
  /**
   * Récupère toutes les actions de tous les timers de l'événement de démonstration
   * Utilisé pour afficher/gérer toutes les actions de la démo wedding
   */
  async getAllActionsFromWeddingDemo() {
    const weddingEventId = "wedding-event-demo";

    logger(
      `[getAllActionsFromWeddingDemo] Fetching all actions for demo wedding event: ${weddingEventId}`,
    );

    // Récupère tous les timers avec leurs actions pour l'événement de démo
    const timersWithActions = await db.query.timer.findMany({
      where: eq(timer.weddingEventId, weddingEventId),
      with: {
        actions: {
          orderBy: [asc(timerAction.orderIndex)],
        },
      },
      orderBy: [asc(timer.orderIndex)],
    });

    if (!timersWithActions || timersWithActions.length === 0) {
      logger(
        `[getAllActionsFromWeddingDemo] No timers found for wedding event: ${weddingEventId}`,
      );
      return [];
    }

    // Aplatir toutes les actions de tous les timers
    const allActions = timersWithActions.flatMap((timer) =>
      timer.actions.map((action) => ({
        ...action,
        timer: {
          id: timer.id,
          name: timer.name,
          orderIndex: timer.orderIndex,
          scheduledStartTime: timer.scheduledStartTime,
          durationMinutes: timer.durationMinutes,
          status: timer.status,
          isManual: timer.isManual,
        },
      })),
    );

    logger(
      `[getAllActionsFromWeddingDemo] Found ${allActions.length} actions across ${timersWithActions.length} timers`,
    );

    return allActions.sort((a, b) => {
      // Tri par ordre des timers puis par ordre des actions
      if (a.timer.orderIndex !== b.timer.orderIndex) {
        return a.timer.orderIndex - b.timer.orderIndex;
      }
      return a.orderIndex - b.orderIndex;
    });
  }
}

export const timerActionService = new TimerActionService();
