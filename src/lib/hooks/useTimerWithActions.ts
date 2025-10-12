/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
import { TimerAction } from "@/lib/db/schema/timer.schema";
import { getTimezoneAgnosticTimeDiff } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

interface UseTimerWithActionsOptions {
  /**
   * La date de début du timer (scheduledStartTime)
   */
  startTime: Date | string | null;

  /**
   * La durée du timer en minutes
   */
  durationMinutes: number;

  /**
   * Les actions associées au timer
   */
  actions: TimerAction[];

  /**
   * Callback appelé quand le timer expire
   */
  onExpire?: () => void;

  /**
   * Callback appelé quand une action doit être déclenchée
   */
  onActionTrigger?: (action: TimerAction) => void;

  /**
   * Intervalle de mise à jour en millisecondes (défaut: 1000ms)
   */
  updateInterval?: number;
}

interface UseTimerWithActionsReturn {
  timeLeft: TimeLeft;
  isExpired: boolean;
  isRunning: boolean;
  currentAction: TimerAction | null;
  nextAction: TimerAction | null;
  timeUntilNextAction: number; // en secondes
}

/**
 * Calcule le temps absolu de déclenchement d'une action
 * @param startTime - Heure de début du timer (timezone-agnostic)
 * @param durationMinutes - Durée totale du timer
 * @param triggerOffsetMinutes - Offset de déclenchement
 * @returns Date de déclenchement (timezone-agnostic)
 */
function calculateActionTriggerTime(
  startTime: Date,
  durationMinutes: number,
  triggerOffsetMinutes: number,
): Date {
  const startMs = startTime.getTime();

  if (triggerOffsetMinutes === 0) {
    // Déclencher à la fin du timer
    return new Date(startMs + durationMinutes * 60000);
  } else if (triggerOffsetMinutes < 0) {
    // Déclencher X minutes avant la fin
    // Exemple: duration=60, offset=-15 → trigger à start + 45 minutes
    return new Date(startMs + (durationMinutes + triggerOffsetMinutes) * 60000);
  } else {
    // Déclencher X minutes après le début
    return new Date(startMs + triggerOffsetMinutes * 60000);
  }
}

/**
 * Hook personnalisé pour gérer un timer avec actions
 *
 * Ce hook gère:
 * - Le compte à rebours jusqu'à la fin du timer
 * - Le déclenchement des actions selon leur triggerOffsetMinutes
 * - La détection de l'action courante et de la prochaine action
 *
 * @example
 * ```tsx
 * const { timeLeft, currentAction, nextAction } = useTimerWithActions({
 *   startTime: timer.scheduledStartTime,
 *   durationMinutes: timer.durationMinutes,
 *   actions: timer.actions,
 *   onActionTrigger: (action) => {
 *     console.log('Action déclenchée:', action.title);
 *   }
 * });
 * ```
 */
export function useTimerWithActions({
  startTime,
  durationMinutes,
  actions,
  onExpire,
  onActionTrigger,
  updateInterval = 1000,
}: UseTimerWithActionsOptions): UseTimerWithActionsReturn {
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
  const [timeUntilNextAction, setTimeUntilNextAction] = useState(0);

  const onExpireRef = useRef(onExpire);
  const onActionTriggerRef = useRef(onActionTrigger);
  const hasExpiredRef = useRef(false);
  const triggeredActionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onExpireRef.current = onExpire;
    onActionTriggerRef.current = onActionTrigger;
  }, [onExpire, onActionTrigger]);

  const calculateState = useCallback(() => {
    if (!startTime || durationMinutes === 0) {
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
      setTimeUntilNextAction(0);
      return;
    }

    const now = new Date();
    const start = typeof startTime === "string" ? new Date(startTime) : startTime;
    const endTime = new Date(start.getTime() + durationMinutes * 60000);

    // Calculer le temps restant jusqu'à la fin
    const difference = getTimezoneAgnosticTimeDiff(endTime);

    if (difference <= 0) {
      // Timer expiré
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
      });
      setIsExpired(true);
      setIsRunning(false);
      setCurrentAction(null);
      setNextAction(null);
      setTimeUntilNextAction(0);

      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }

      return;
    }

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

    // Gérer les actions
    if (actions && actions.length > 0) {
      // Trier les actions par ordre de déclenchement
      const orderedActions = [...actions].filter(
        (action) => action.status !== "COMPLETED",
      );

      // Trouver l'action courante (celle dont le temps de déclenchement est passé mais pas encore exécutée)
      let foundCurrentAction: TimerAction | null = null;
      let foundNextAction: TimerAction | null = null;
      let timeToNext = 0;

      for (const action of orderedActions) {
        const actionTriggerTime = calculateActionTriggerTime(
          start,
          durationMinutes,
          action.triggerOffsetMinutes,
        );
        const diffToAction = actionTriggerTime.getTime() - now.getTime();

        if (diffToAction <= 0) {
          // Action dont le temps est passé
          if (!action.executedAt && !triggeredActionsRef.current.has(action.id)) {
            foundCurrentAction = action;
            triggeredActionsRef.current.add(action.id);
            onActionTriggerRef.current?.(action);
            break;
          }
        } else {
          // Première action future
          foundNextAction = action;
          timeToNext = Math.floor(diffToAction / 1000);
          break;
        }
      }

      setCurrentAction(foundCurrentAction);
      setNextAction(foundNextAction);
      setTimeUntilNextAction(timeToNext);
    } else {
      setCurrentAction(null);
      setNextAction(null);
      setTimeUntilNextAction(0);
    }
  }, [startTime, durationMinutes, actions]);

  useEffect(() => {
    // Réinitialiser les actions déclenchées quand les actions changent
    triggeredActionsRef.current.clear();
  }, [actions]);

  useEffect(() => {
    calculateState();
    const interval = setInterval(calculateState, updateInterval);
    return () => clearInterval(interval);
  }, [calculateState, updateInterval]);

  return {
    timeLeft,
    isExpired,
    isRunning,
    currentAction,
    nextAction,
    timeUntilNextAction,
  };
}
