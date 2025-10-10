import { useTimerWithActions } from "@/lib/hooks/useTimerWithActions";
import { TimerWithActions } from "@/lib/types/timer.type";
import ActionDisplay from "./ActionDisplay";
import TimerCountdown from "./TimerCountdown";

interface TimerDisplayProps {
  timerData: TimerWithActions;
  hideTitle?: boolean;
}

const TimerDisplay = ({ timerData, hideTitle = false }: TimerDisplayProps) => {
  // Utiliser le hook avec gestion des actions
  const { timeLeft, isExpired, currentAction, nextAction, timeUntilNextAction } =
    useTimerWithActions({
      startTime: timerData.scheduledStartTime,
      durationMinutes: timerData.durationMinutes ?? 0,
      actions: timerData.actions,
      onExpire: () => {
        console.log("Timer expired for:", timerData.name);
      },
      onActionTrigger: (action) => {
        console.log("Action triggered:", action.title, action.type);
      },
    });

  console.log("TimerDisplay - Timer data:", {
    name: timerData.name,
    scheduledStartTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes,
    timeLeft,
    isExpired,
    currentAction: currentAction?.title,
    nextAction: nextAction?.title,
    timeUntilNextAction,
  });

  return (
    <div className="relative">
      <div className="space-y-6">
        <div className="text-center">
          {!hideTitle && <h2 className="mb-2 text-4xl font-bold">{timerData.name}</h2>}

          {/* Afficher le compte à rebours si en attente */}
          {timerData.status === "PENDING" && !isExpired && (
            <div className="mx-auto max-w-xs">
              <TimerCountdown timeLeft={timeLeft} variant="large" />
            </div>
          )}

          {/* Afficher l'action courante */}
          {currentAction && (
            <ActionDisplay
              currentAction={currentAction}
              actions={timerData.actions}
              timeLeft={timeLeft}
              timerId={timerData.id}
              onActionComplete={() => {
                console.log("Action completed, refreshing...");
                // Le hook détectera automatiquement la prochaine action
              }}
            />
          )}

          {/* Info sur la prochaine action */}
          {nextAction && !currentAction && (
            <div className="text-muted-foreground mt-4 text-sm">
              Prochaine action "{nextAction.contentEn}" dans{" "}
              {Math.floor(timeUntilNextAction / 60)}m {timeUntilNextAction % 60}s pour
              jouer {nextAction.type}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimerDisplay;
