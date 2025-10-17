import { cancelAction, startAction } from "@/lib/actions/timer-actions.action";
import { updateTimer } from "@/lib/actions/timer.action";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/constant/constant";
import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { cn, logger } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionItem from "./ActionItem";

type ActionListProps = {
  actions: TimerAction[];
  currentAction: TimerAction | null;
  display: "list" | "grid";
  shouldPulse?: boolean;
  isTimerCompleted?: boolean;
  markActionAsStarting?: (actionId: string) => void;
  isActionStarting?: (actionId: string) => boolean;
};

export default function ActionList({
  actions,
  currentAction: currentActionFromProps,
  display = "list",
  shouldPulse = false,
  isTimerCompleted = false,
  markActionAsStarting,
  isActionStarting,
}: ActionListProps) {
  const queryClient = useQueryClient();

  const { mutate: mutateTimerStartDate } = useMutation({
    mutationKey: [MUTATION_KEYS.START_ACTION],
    mutationFn: async (timerId: string) => {
      return await updateTimer({
        data: {
          id: timerId,
          startedAt: new Date(),
        },
      });
    },
  });

  const { mutate: mutateStartAction } = useMutation({
    mutationKey: [MUTATION_KEYS.START_ACTION],
    mutationFn: async ({
      actionId,
      onComplete,
    }: {
      actionId: string;
      onComplete: () => void;
    }) => {
      logger("Starting action from TimerCard:");

      console.log("Starting action ID:", actionId);
      if (!actionId) {
        throw new Error("No action ID to start");
      }

      return {
        result: await startAction({
          data: {
            actionId,
          },
        }),
        onComplete,
      };
    },
    onSuccess: ({ result, onComplete }) => {
      // Optionally refetch or update the timer data after mutation
      mutateTimerStartDate(result.action.timerId);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
      toast.success("Timer action triggered successfully!");
      onComplete(); // Appeler le callback pour réinitialiser l'état
    },
    onError: (error, { onComplete }) => {
      toast.error(`${error.message}`);
      onComplete(); // Appeler le callback même en cas d'erreur
    },
  });

  const { mutate: mutateCancelAction } = useMutation({
    mutationKey: [MUTATION_KEYS.CANCEL_ACTION],
    mutationFn: async ({
      actionId,
      onComplete,
    }: {
      actionId: string;
      onComplete: () => void;
    }) => {
      logger("Cancelling action:");

      console.log("Cancelling action ID:", actionId);
      if (!actionId) {
        throw new Error("No action ID to cancel");
      }

      return {
        result: await cancelAction({
          data: {
            actionId,
          },
        }),
        onComplete,
      };
    },
    onSuccess: ({ onComplete }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
      toast.success("Action cancelled successfully!");
      onComplete(); // Appeler le callback pour réinitialiser l'état
    },
    onError: (error, { onComplete }) => {
      toast.error(`Failed to cancel action: ${error.message}`);
      onComplete(); // Appeler le callback même en cas d'erreur
    },
  });

  if (!actions.length) return null;

  const handleActionStart = (action: TimerAction, onComplete: () => void) => {
    // Vérifier si l'action est déjà en cours de démarrage
    if (isActionStarting?.(action.id)) {
      console.log(`⚠️ Action ${action.id} est déjà en cours de démarrage`);
      onComplete(); // Réinitialiser l'état si l'action est déjà en cours
      return;
    }

    // Marquer l'action comme en cours de démarrage immédiatement
    markActionAsStarting?.(action.id);

    // Lancer la mutation
    mutateStartAction({ actionId: action.id, onComplete });
  };

  const handleActionCancel = (action: TimerAction, onComplete: () => void) => {
    console.log(`🚫 Cancelling action ${action.id}`);
    mutateCancelAction({ actionId: action.id, onComplete });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-center text-lg font-semibold">Scheduled Actions</h3>
      <div
        className={cn(
          "space-y-2 text-left",
          display === "grid" && "grid grid-cols-1 gap-2 space-y-0 xl:grid-cols-2",
        )}
      >
        {actions.map((action, index) => (
          <ActionItem
            key={action.id}
            action={action}
            onActionStart={(action, onComplete) => handleActionStart(action, onComplete)}
            onActionCancel={(action, onComplete) =>
              handleActionCancel(action, onComplete)
            }
            currentAction={currentActionFromProps}
            shouldPulse={
              currentActionFromProps?.executedAt !== null && shouldPulse && index === 0
            }
            isActionStarting={isActionStarting}
            isTimerCompleted={isTimerCompleted}
          />
        ))}
      </div>
    </div>
  );
}
