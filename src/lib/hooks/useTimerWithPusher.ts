/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
import { TimerAction } from "@/lib/db/schema/timer.schema";
import { usePusher } from "@/lib/provider/puhser/pusher-provider";
import { TimerWithActions } from "@/lib/types/timer.type";
import { getTimezoneAgnosticTimeDiff } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

interface UseTimerWithPusherOptions {
  timer: TimerWithActions;
  startTime: Date | string | null;
  durationMinutes: number;
  onExpire?: () => void;
  onActionTrigger?: (action: TimerAction) => void;
  updateInterval?: number;
  displayLog?: boolean;
}

interface UseTimerWithPusherReturn {
  timeLeft: TimeLeft;
  isExpired: boolean;
  isRunning: boolean;
  currentAction: TimerAction | null;
  nextAction: TimerAction | null;
  shouldNotifyAction: TimerAction | null;
  markActionAsCompleting: (actionId: string) => void;
}

/**
 * Calcule le temps absolu de déclenchement d'une action
 */
function calculateActionTriggerTime(
  startTime: Date,
  durationMinutes: number,
  triggerOffsetMinutes: number,
): Date {
  const startMs = startTime.getTime();

  if (triggerOffsetMinutes === 0) {
    return new Date(startMs + durationMinutes * 60000);
  } else if (triggerOffsetMinutes < 0) {
    return new Date(startMs + (durationMinutes + triggerOffsetMinutes) * 60000);
  } else {
    return new Date(startMs + triggerOffsetMinutes * 60000);
  }
}

/**
 * Hook qui gère un timer avec actions en utilisant les données du PusherProvider
 *
 * Ce hook:
 * - Utilise TOUJOURS les données à jour depuis currentTimer du PusherProvider
 * - Calcule le compte à rebours
 * - Détecte l'action courante et la prochaine action
 * - Synchronise automatiquement avec les mises à jour Pusher
 *
 * @example
 * ```tsx
 * const { timeLeft, currentAction } = useTimerWithPusher({
 *   timer: restTimer,
 *   startTime: timerData.scheduledStartTime,
 *   durationMinutes: timerData.durationMinutes ?? 0,
 * });
 * ```
 */
export function useTimerWithPusher({
  timer,
  startTime,
  durationMinutes,
  onExpire,
  onActionTrigger,
  updateInterval = 1000,
  displayLog = false,
}: UseTimerWithPusherOptions): UseTimerWithPusherReturn {
  // Récupérer les données à jour depuis le PusherProvider
  const { currentTimer, updatedAction } = usePusher();

  // Utiliser les actions depuis currentTimer si c'est le bon timer
  // Sinon, utiliser les actions du timer passé en prop (pour le dashboard admin)
  const actions = useMemo(() => {
    if (currentTimer && currentTimer.id === timer.id) {
      if (displayLog) {
        console.log(
          "📦 Utilisation des actions depuis currentTimer:",
          currentTimer.actions,
        );
      }
      return currentTimer.actions;
    }
    // Pour les timers non-courants (dashboard admin), utiliser les actions du timer
    if ("actions" in timer && timer.actions && Array.isArray(timer.actions)) {
      if (displayLog) {
        console.log("📦 Utilisation des actions depuis le timer prop:", timer.actions);
      }
      return timer.actions;
    }
    return [];
  }, [currentTimer, timer, displayLog]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentAction, setCurrentAction] = useState<TimerAction | null>(null);
  const [nextAction, setNextAction] = useState<TimerAction | null>(null);
  const [shouldNotifyAction, setShouldNotifyAction] = useState<TimerAction | null>(null);

  const onExpireRef = useRef(onExpire);
  const onActionTriggerRef = useRef(onActionTrigger);
  const hasExpiredRef = useRef(false);
  const triggeredActionsRef = useRef<Set<string>>(new Set());
  const completingActionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onExpireRef.current = onExpire;
    onActionTriggerRef.current = onActionTrigger;
  }, [onExpire, onActionTrigger]);

  const calculateState = useCallback(() => {
    if (!startTime) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
      });
      setIsExpired(false);
      setIsRunning(false);
      setCurrentAction(null);
      setNextAction(null);
      setShouldNotifyAction(null);
      return;
    }

    const now = new Date();
    const start = typeof startTime === "string" ? new Date(startTime) : startTime;

    // Pour les timers ponctuels (duration = 0), on calcule le temps jusqu'au startTime
    // Pour les timers normaux, on calcule le temps jusqu'au endTime
    const targetTime =
      durationMinutes === 0 ? start : new Date(start.getTime() + durationMinutes * 60000);

    const difference = getTimezoneAgnosticTimeDiff(targetTime);

    if (difference <= 0) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
      });
      setIsExpired(true);
      setIsRunning(false);

      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }

      // NE PAS RETOURNER ICI - continuer pour gérer les actions même après expiration
      // Les actions peuvent toujours être déclenchées manuellement après la fin du timer
    } else {
      // Timer en cours
      const totalSeconds = Math.floor(difference / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds,
      });
      setIsExpired(false);
      setIsRunning(true);
      hasExpiredRef.current = false;
    }

    // Gérer les actions
    if (actions && actions.length > 0) {
      const orderedActions = [...actions].filter(
        (action) =>
          action.status !== "COMPLETED" && !completingActionsRef.current.has(action.id),
      );

      let foundCurrentAction: TimerAction | null = null;
      let foundNextAction: TimerAction | null = null;
      let foundShouldNotifyAction: TimerAction | null = null;

      for (const action of orderedActions) {
        const actionTriggerTime = calculateActionTriggerTime(
          start,
          durationMinutes,
          action.triggerOffsetMinutes,
        );
        const diffToAction = actionTriggerTime.getTime() - now.getTime();

        if (diffToAction <= 0) {
          if (!action.executedAt) {
            if (action.status === "RUNNING") {
              foundCurrentAction = action;

              if (!triggeredActionsRef.current.has(action.id)) {
                triggeredActionsRef.current.add(action.id);
                if (displayLog) {
                  console.log("🎯 Déclenchement callback pour action:", action.title);
                }
                onActionTriggerRef.current?.(action);
              }
              break;
            } else if (action.status === "PENDING") {
              foundShouldNotifyAction = action;
            }
          }
        } else {
          if (!action.executedAt && action.status === "PENDING") {
            foundNextAction = action;
          }
          break;
        }
      }

      setCurrentAction(foundCurrentAction);
      setNextAction(foundNextAction);
      setShouldNotifyAction(foundShouldNotifyAction);
    } else {
      setCurrentAction(null);
      setNextAction(null);
      setShouldNotifyAction(null);
    }
  }, [startTime, durationMinutes, actions, displayLog]);

  // Recalculer l'état quand les actions changent (après un refetch)
  useEffect(() => {
    if (displayLog) {
      console.log("♻️ Actions mises à jour, recalcul de l'état");
    }
    triggeredActionsRef.current.clear();

    const completedActionIds = actions
      .filter((a: TimerAction) => a.status === "COMPLETED")
      .map((a: TimerAction) => a.id);

    completedActionIds.forEach((id: string) => {
      completingActionsRef.current.delete(id);
    });

    calculateState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, displayLog]);

  // Recalculer immédiatement si une action est mise à jour via Pusher
  useEffect(() => {
    if (updatedAction && updatedAction.timerId === timer.id) {
      if (displayLog) {
        console.log("🔔 Action Pusher reçue, recalcul immédiat:", updatedAction);
      }

      // Retirer l'action du set des actions en cours de complétion si elle était dedans
      // car elle vient d'être mise à jour
      completingActionsRef.current.delete(updatedAction.actionId);

      calculateState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedAction, timer.id, displayLog]);

  useEffect(() => {
    calculateState();
    const interval = setInterval(calculateState, updateInterval);
    return () => clearInterval(interval);
  }, [calculateState, updateInterval]);

  const markActionAsCompleting = useCallback(
    (actionId: string) => {
      if (displayLog) {
        console.log(`🔒 Marquage de l'action ${actionId} comme en cours de complétion`);
      }
      completingActionsRef.current.add(actionId);
      calculateState();
    },
    [calculateState, displayLog],
  );

  return {
    timeLeft,
    isExpired,
    isRunning,
    currentAction,
    nextAction,
    shouldNotifyAction,
    markActionAsCompleting,
  };
}
