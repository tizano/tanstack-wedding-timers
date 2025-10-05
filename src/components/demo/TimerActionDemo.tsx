import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTRPC } from '@/integrations/trpc/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import TimerDisplay from '../timer/TimerDisplay';

interface TimerActionDemoProps {
  timerId: string;
  weddingEventId: string;
}

const TimerActionDemo = ({
  timerId,
  weddingEventId = 'wedding-event-demo',
}: TimerActionDemoProps) => {
  const [secondsBefore, setSecondsBefore] = useState(15);
  const trpc = useTRPC();

  const { data: timer, refetch } = useQuery(
    trpc.timers.getById.queryOptions({
      id: timerId,
    })
  );
  const { data: nextAction } = useQuery(
    trpc.timerActions.getNextAction.queryOptions({
      timerId,
    })
  );

  const resetMutation = useMutation(
    trpc.timerActions.resetTimerActions.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const jumpMutation = useMutation(
    trpc.timerActions.jumpToBeforeNextAction.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const completeActionMutation = useMutation(
    trpc.timerActions.completeAction.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const handleReset = () => {
    resetMutation.mutate({ timerId });
  };

  const handleJumpToNextAction = () => {
    jumpMutation.mutate({ timerId, secondsBefore });
  };

  const handleActionComplete = (actionId: string) => {
    completeActionMutation.mutate({ actionId });
  };

  if (!timer) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-500 text-black text-sm rounded-full font-bold">
              DEMO MODE
            </span>
            Timer Actions Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button onClick={handleReset} variant="outline">
              🔄 Reset Actions
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleJumpToNextAction}
                disabled={!nextAction}
                variant="default"
              >
                ⏭️ Jump to Next Action
              </Button>
              <input
                type="number"
                value={secondsBefore}
                onChange={(e) => setSecondsBefore(Number(e.target.value))}
                className="w-20 px-2 py-1 border rounded"
                min={0}
                max={300}
              />
              <span className="text-sm text-muted-foreground">
                seconds before
              </span>
            </div>
          </div>

          {nextAction && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Next Action:</h3>
              <p className="text-sm">
                <strong>{nextAction.action?.contentFr}</strong> - Type:{' '}
                {nextAction.action?.type}
              </p>
              <p className="text-sm text-muted-foreground">
                Triggers in:{' '}
                {Math.max(0, nextAction.timing.secondsUntilTrigger)}s
              </p>
            </div>
          )}

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Actions List:</h3>
            <div className="space-y-2">
              {timer.actions.map((action, idx) => (
                <div
                  key={action.id}
                  className={`p-2 rounded ${
                    action.executedAt
                      ? 'bg-green-100'
                      : action.status === 'RUNNING'
                        ? 'bg-yellow-100'
                        : 'bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>
                      {idx + 1}. {action.title || 'Untitled'} ({action.type})
                    </span>
                    <span className="text-xs">
                      {action.executedAt
                        ? '✅ Completed'
                        : action.status === 'RUNNING'
                          ? '▶️ Running'
                          : '⏸️ Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <TimerDisplay timer={timer} onActionComplete={handleActionComplete} />
    </div>
  );
};

export default TimerActionDemo;
