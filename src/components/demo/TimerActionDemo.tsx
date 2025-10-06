import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNextAction,
  jumpToBeforeNextAction,
  resetTimerActions,
} from "@/lib/actions/timer-actions.action";
import { getTimerById } from "@/lib/actions/timer.action";
import { TimerAction } from "@/lib/db/schema";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ActionDisplay from "../timer/ActionDisplay";
import { Button } from "../ui/button";

interface TimerActionDemoProps {
  timerId: string;
}

const timerQueryOptions = (timerId: string) =>
  queryOptions({
    queryKey: ["timer", timerId],
    queryFn: () =>
      getTimerById({
        data: { id: timerId },
      }),
  });

const timerActionsQueryOptions = (timerId: string) =>
  queryOptions({
    queryKey: ["timerActions", timerId],
    queryFn: () =>
      getNextAction({
        data: { timerId },
      }),
  });

const TimerActionDemo = ({ timerId }: TimerActionDemoProps) => {
  const [secondsBefore, setSecondsBefore] = useState(45);
  const { data: timer, refetch } = useQuery(timerQueryOptions(timerId));
  const { data: nextAction } = useQuery(timerActionsQueryOptions(timerId));

  const [manualCurrentAction, setManualCurrentAction] = useState<TimerAction | null>(
    null,
  );

  // Use nextAction as currentAction unless manually overridden
  const currentAction = manualCurrentAction || nextAction?.action || null;

  const handleActionComplete = () => {
    setManualCurrentAction(null);
    refetch();
  };

  const { mutate: resetMutation } = useMutation({
    mutationKey: ["resetTimerActions", timerId],
    mutationFn: () =>
      resetTimerActions({
        data: { timerId },
      }),
    onSuccess: () => refetch(),
  });

  const { mutate: jumpMutation } = useMutation({
    mutationKey: ["jumpToBeforeNextAction", timerId],
    mutationFn: () =>
      jumpToBeforeNextAction({
        data: { timerId, secondsBefore },
      }),
    onSuccess: () => refetch(),
  });

  const handleReset = () => {
    resetMutation();
  };

  const handleJumpToNextAction = () => {
    jumpMutation();
  };

  // const handleActionComplete = (actionId: string) => {
  //   completeActionMutation.mutate({ actionId });
  // };

  if (!timer) return <div>Loading...</div>;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="rounded-full bg-yellow-500 px-3 py-1 text-sm font-bold text-black">
              DEMO MODE
            </span>
            Timer Actions Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex max-h-[420px] flex-col gap-6 overflow-hidden">
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleReset} variant="outline">
              🔄 Reset Actions
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleJumpToNextAction}
                // disabled={!nextAction}
                variant="default"
              >
                ⏭️ Jump to Next Action
              </Button>
              <input
                type="number"
                value={secondsBefore}
                onChange={(e) => setSecondsBefore(Number(e.target.value))}
                className="w-20 rounded border px-2 py-1"
                min={0}
                max={300}
              />
              <span className="text-muted-foreground text-sm">seconds before</span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">Actions du timer courant :</h3>
            <div className="space-y-2 text-gray-950 dark:text-white">
              {timer.actions.map((action, idx) => (
                <div
                  key={action.id}
                  className={`rounded p-2 ${
                    action.executedAt
                      ? "bg-green-100 dark:bg-green-900"
                      : action.status === "RUNNING"
                        ? "bg-yellow-100 dark:bg-yellow-900"
                        : "bg-gray-100 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {idx + 1}. {action.url || action.title || "Untitled"} ({action.type}
                      )
                    </span>
                    <div>
                      <span className="text-xs">
                        {action.executedAt
                          ? "✅ Completed"
                          : action.status === "RUNNING"
                            ? "▶️ Running"
                            : "⏸️ Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {currentAction && (
        <ActionDisplay
          currentAction={currentAction}
          actions={timer.actions}
          onComplete={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TimerActionDemo;
