import { startAction } from "@/lib/actions/timer-actions.action";
import { updateTimer } from "@/lib/actions/timer.action";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/constant/constant";
import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { cn, logger } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import ActionItem from "./ActionItem";

type ActionListProps = {
  actions: TimerAction[];
  currentAction: TimerAction | null;
  isDemo?: boolean;
  display: "list" | "grid";
};

export default function ActionList({
  actions,
  isDemo,
  display = "list",
}: ActionListProps) {
  const [currentAction, setCurrentAction] = useState<TimerAction | null>(null);
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
    mutationFn: async () => {
      logger("Starting action from TimerCard:");

      console.log(currentAction?.id);
      if (!currentAction?.id) {
        throw new Error("No current action to start");
      }

      return await startAction({
        data: {
          actionId: currentAction.id,
        },
      });
    },
    onSuccess: ({ action }) => {
      // Optionally refetch or update the timer data after mutation
      mutateTimerStartDate(action.timerId);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
      toast.success("Timer action triggered successfully!");
    },
    onError: (error) => {
      toast.error(`${error.message}`);
    },
  });

  if (!actions.length) return null;

  const handleStartAction = (action: TimerAction) => {
    setCurrentAction(action);
    mutateStartAction();
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
        {actions.map((action) => (
          <ActionItem
            key={action.id}
            action={action}
            isDemo={isDemo}
            onActionStart={(action) => handleStartAction(action)}
            currentAction={currentAction}
          />
        ))}
      </div>
    </div>
  );
}
