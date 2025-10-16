/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
import { Timer, TimerAction } from "@/lib/db/schema/timer.schema";
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
  timer: Timer;
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

  /**
   * Action externe à forcer (par exemple depuis Pusher)
   * Si fournie, elle remplace l'action courante calculée automatiquement
   */
  externalCurrentAction?: TimerAction | null;
  displayLog?: boolean; // Pour activer les logs de debug
}

interface UseTimerWithActionsReturn {
  timeLeft: TimeLeft;
  isExpired: boolean;
  isRunning: boolean;
  currentAction: TimerAction | null;
  nextAction: TimerAction | null;
  shouldNotifyAction: TimerAction | null; // Action prête à être déclenchée manuellement
  /**
   * Marque une action comme étant en cours de complétion (optimistic update)
   * pour éviter qu'elle ne soit re-déclenchée pendant l'appel API
   */
  markActionAsCompleting: (actionId: string) => void;
  /**
   * Marque une action comme étant en cours de démarrage (optimistic update)
   * pour éviter les doubles clics sur le bouton "Start Action"
   */
  markActionAsStarting: (actionId: string) => void;
  /**
   * Vérifie si une action est en cours de démarrage
   */
  isActionStarting: (actionId: string) => boolean;
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
  externalCurrentAction,
  displayLog = false,
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
  const [shouldNotifyAction, setShouldNotifyAction] = useState<TimerAction | null>(null);

  const onExpireRef = useRef(onExpire);
  const onActionTriggerRef = useRef(onActionTrigger);
  const hasExpiredRef = useRef(false);
  const triggeredActionsRef = useRef<Set<string>>(new Set());
  const completingActionsRef = useRef<Set<string>>(new Set()); // Actions en cours de complétion
  const startingActionsRef = useRef<Set<string>>(new Set()); // Actions en cours de démarrage

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
      // Exclure les actions complétées ET celles en cours de complétion/démarrage
      const orderedActions = [...actions].filter(
        (action) =>
          action.status !== "COMPLETED" &&
          !completingActionsRef.current.has(action.id) &&
          !startingActionsRef.current.has(action.id),
      );

      // Logique de gestion des actions :
      // 1. currentAction = action avec status RUNNING (en cours d'exécution)
      // 2. shouldNotifyAction = action PENDING dont le temps est passé (prête à être déclenchée)
      // 3. nextAction = prochaine action PENDING future
      let foundCurrentAction: TimerAction | null = null;
      let foundNextAction: TimerAction | null = null;
      let foundShouldNotifyAction: TimerAction | null = null;
      let timeToNext = 0;

      for (const action of orderedActions) {
        const actionTriggerTime = calculateActionTriggerTime(
          start,
          durationMinutes,
          action.triggerOffsetMinutes,
        );
        const diffToAction = actionTriggerTime.getTime() - now.getTime();

        if (diffToAction <= 0) {
          // Le temps de l'action est passé
          if (!action.executedAt) {
            if (action.status === "RUNNING") {
              // Action en cours d'exécution
              foundCurrentAction = action;

              // Déclencher le callback seulement la première fois
              if (!triggeredActionsRef.current.has(action.id)) {
                triggeredActionsRef.current.add(action.id);
                onActionTriggerRef.current?.(action);
              }
              break;
            } else if (action.status === "PENDING") {
              // Action prête à être déclenchée manuellement
              foundShouldNotifyAction = action;
              // Continue pour trouver la nextAction
            }
          }
        } else {
          // Première action future non exécutée
          if (!action.executedAt && action.status === "PENDING") {
            foundNextAction = action;
            timeToNext = Math.floor(diffToAction / 1000);
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
  }, [startTime, durationMinutes, actions]);

  // Effet pour mettre à jour l'action courante si une action externe est fournie

  useEffect(() => {
    if (externalCurrentAction !== undefined) {
      setCurrentAction(externalCurrentAction);

      // Si une action externe est définie, déclencher le callback si pas encore fait
      if (
        externalCurrentAction &&
        !triggeredActionsRef.current.has(externalCurrentAction.id)
      ) {
        triggeredActionsRef.current.add(externalCurrentAction.id);
        onActionTriggerRef.current?.(externalCurrentAction);
      }
    }
  }, [externalCurrentAction]);

  useEffect(() => {
    // Réinitialiser les actions déclenchées quand les actions changent
    triggeredActionsRef.current.clear();

    // Nettoyer les actions marquées comme "en cours de complétion" si elles sont maintenant COMPLETED
    const completedActionIds = actions
      .filter((a) => a.status === "COMPLETED")
      .map((a) => a.id);

    completedActionIds.forEach((id) => {
      completingActionsRef.current.delete(id);
    });

    // Nettoyer les actions marquées comme "en cours de démarrage" si elles sont maintenant RUNNING ou COMPLETED
    const runningOrCompletedActionIds = actions
      .filter((a) => a.status === "RUNNING" || a.status === "COMPLETED")
      .map((a) => a.id);

    runningOrCompletedActionIds.forEach((id) => {
      startingActionsRef.current.delete(id);
    });
  }, [actions]);

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

      // Recalculer immédiatement l'état pour mettre à jour currentAction
      calculateState();
    },
    [calculateState, displayLog],
  );

  const markActionAsStarting = useCallback(
    (actionId: string) => {
      if (displayLog) {
        console.log(`🚀 Marquage de l'action ${actionId} comme en cours de démarrage`);
      }
      startingActionsRef.current.add(actionId);

      // Recalculer immédiatement l'état pour mettre à jour shouldNotifyAction
      calculateState();
    },
    [calculateState, displayLog],
  );

  const isActionStarting = useCallback((actionId: string) => {
    return startingActionsRef.current.has(actionId);
  }, []);

  return {
    timeLeft,
    isExpired,
    isRunning,
    currentAction,
    nextAction,
    shouldNotifyAction,
    markActionAsCompleting,
    markActionAsStarting,
    isActionStarting,
  };
}
