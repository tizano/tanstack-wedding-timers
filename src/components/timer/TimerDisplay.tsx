import { useTimerWithPusher } from "@/lib/hooks/useTimerWithPusher";
import { usePusher } from "@/lib/provider/puhser/pusher-provider";
import { TimerWithActions } from "@/lib/types/timer.type";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
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
  const {
    timeLeft,
    currentAction,
    nextAction,
    shouldNotifyAction,
    isExpired,
    isRunning,
  } = useTimerWithPusher({
    timer: timerData,
    startTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes ?? 0,
  });

  // Récupérer les données du PusherProvider pour détecter les actions ponctuelles
  const { updatedAction } = usePusher();

  // Détecter si une action ponctuelle d'un autre timer doit être affichée
  const punctualAction = useMemo(() => {
    if (!updatedAction || !updatedAction.punctualTimer) return null;

    // Trouver l'action mise à jour dans le timer ponctuel
    const action = updatedAction.punctualTimer.actions.find(
      (a) => a.id === updatedAction.actionId,
    );

    if (!action || action.status !== "RUNNING") return null;

    console.log("[TimerDisplay] Action ponctuelle détectée:", action);
    return action;
  }, [updatedAction]);

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
          <>
            {console.log(
              "[TimerDisplay] Affichage de ActionDisplay avec:",
              currentAction,
            )}
            <ActionDisplay
              currentAction={currentAction}
              nextAction={nextAction}
              timeLeft={timeLeft}
              onActionComplete={() => {
                /* Optionally handle action completion at the TimerDisplay level */
              }}
            />
          </>
        )}

        {/* Afficher l'action ponctuelle d'un autre timer (overlay par-dessus le timer courant) */}
        {punctualAction && (
          <>
            {console.log(
              "[TimerDisplay] Affichage de l'action ponctuelle:",
              punctualAction,
            )}
            <ActionDisplay
              currentAction={punctualAction}
              nextAction={null}
              timeLeft={timeLeft}
              onActionComplete={() => {
                console.log("[TimerDisplay] Action ponctuelle terminée");
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TimerDisplay;
