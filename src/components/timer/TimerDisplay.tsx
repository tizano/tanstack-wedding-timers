import { useTimerWithPusher } from "@/lib/hooks/useTimerWithPusher";
import { TimerWithActions } from "@/lib/types/timer.type";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import ActionDisplay from "./ActionDisplay";
import TimerCountdown from "./TimerCountdown";

interface TimerDisplayProps {
  timerData: TimerWithActions;
  isDemo?: boolean;
  variant?: "large" | "small";
}

const TimerDisplay = ({
  timerData,
  isDemo = false,
  variant = "large",
}: TimerDisplayProps) => {
  // const [displayAction] = useState<TimerAction | null>(null);
  const { actions, ...restTimer } = timerData;
  const {
    timeLeft,
    currentAction,
    nextAction,
    shouldNotifyAction,
    isExpired,
    isRunning,
  } = useTimerWithPusher({
    timer: restTimer,
    startTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes ?? 0,
    actions: actions,
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        {!isDemo && (
          <div>
            <h2 className="mb-2 text-4xl font-bold">{timerData.name}</h2>
            <div className="">
              <div className="space-y-1 text-sm">
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge
                  variant={
                    isRunning ? "RUNNING" : isExpired ? "EXECUTED" : "NOT_EXECUTED"
                  }
                >
                  {isRunning ? "En cours" : isExpired ? "Expiré" : "En attente"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Afficher le compte à rebours si en attente */}
        {timerData.status !== "COMPLETED" && (
          <div className={cn("mx-auto", variant === "large" ? "w-lg" : "w-xs")}>
            <TimerCountdown timeLeft={timeLeft} variant={variant} />
          </div>
        )}

        {/* Notification visuelle: action prête à être déclenchée */}
        {shouldNotifyAction && !currentAction && (
          <div className="animate-pulse rounded-lg bg-amber-100 p-4 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            <p className="text-lg font-bold">⏰ Action prête !</p>
            <p className="text-sm">{shouldNotifyAction.title}</p>
            <p className="text-xs italic">
              Cliquez sur "Start Action" dans le dashboard pour la déclencher
            </p>
          </div>
        )}

        {/* Afficher l'action courante - uniquement si elle a le statut RUNNING */}
        {currentAction && currentAction.status === "RUNNING" && (
          <ActionDisplay
            currentAction={currentAction}
            nextAction={nextAction}
            timeLeft={timeLeft}
            onActionComplete={() => {
              /* Optionally handle action completion at the TimerDisplay level */
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TimerDisplay;
