import { Timer, TimerAction } from "@/lib/db/schema/timer.schema";
import { usePusher } from "@/lib/provider/puhser/pusher-provider";
import { useMemo } from "react";
import { useTimerWithActions } from "./useTimerWithActions";

interface UseTimerWithPusherOptions {
  timer: Timer;
  startTime: Date | string | null;
  durationMinutes: number;
  actions: TimerAction[];
  onExpire?: () => void;
  onActionTrigger?: (action: TimerAction) => void;
  updateInterval?: number;
}

/**
 * Hook qui combine useTimerWithActions avec les mises à jour Pusher
 *
 * Ce hook récupère l'action mise à jour via Pusher et la synchronise
 * avec l'action courante du timer.
 *
 * @example
 * ```tsx
 * const { timeLeft, currentAction } = useTimerWithPusher({
 *   timer: restTimer,
 *   startTime: timerData.scheduledStartTime,
 *   durationMinutes: timerData.durationMinutes ?? 0,
 *   actions: timerData.actions,
 * });
 * ```
 */
export function useTimerWithPusher(options: UseTimerWithPusherOptions) {
  const { updatedAction, currentTimer, clearUpdatedAction } = usePusher();

  // Trouver l'action mise à jour via Pusher dans la liste des actions
  const externalAction = useMemo(() => {
    // Vérifier que updatedAction existe ET correspond au timer actuel
    if (updatedAction && currentTimer && updatedAction.timerId === options.timer.id) {
      console.log("🔍 Recherche action depuis Pusher:", {
        updatedAction,
        timerId: options.timer.id,
        currentTimerId: currentTimer.id,
        nextAction: updatedAction.nextAction,
      });

      const actionFromPusher = currentTimer.actions.find(
        (action) =>
          action.id === updatedAction.actionId &&
          action.timerId === updatedAction.timerId,
      );

      if (actionFromPusher) {
        console.log("🔔 Action trouvée depuis Pusher:", actionFromPusher);

        // Réinitialiser updatedAction après l'avoir traitée
        // pour éviter de re-déclencher l'action au prochain render
        setTimeout(() => {
          clearUpdatedAction();
        }, 0);

        return actionFromPusher;
      } else {
        console.log("⚠️ Action non trouvée dans currentTimer.actions");
      }
    }
    return undefined;
  }, [updatedAction, currentTimer, options.timer.id, clearUpdatedAction]);

  // Utiliser le hook de base avec l'action externe
  const timerState = useTimerWithActions({
    ...options,
    externalCurrentAction: externalAction,
  });

  return timerState;
}
