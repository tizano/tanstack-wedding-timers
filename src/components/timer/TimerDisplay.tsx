import { completeTimer, startTimer } from "@/lib/actions/timer.action";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/constant/constant";
import { useTimerWithPusher } from "@/lib/hooks/useTimerWithPusher";
import { usePusher } from "@/lib/provider/puhser/pusher-provider";
import { TimerWithActions } from "@/lib/types/timer.type";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Badge } from "../ui/badge";
import ActionDisplay from "./ActionDisplay";
import ContentAction from "./actions/ContentAction";
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
  const queryClient = useQueryClient();
  const hasAutoCompletedRef = useRef(false);

  const { mutate: mutateStartTimer } = useMutation({
    mutationKey: [MUTATION_KEYS.START_TIMER],
    mutationFn: async (timerId: string) => {
      return await startTimer({
        data: {
          timerId,
        },
      });
    },
    onSuccess: () => {
      console.log("[TimerDisplay] Next timer started automatically");
    },
    onError: (error) => {
      console.error("[TimerDisplay] Error starting next timer:", error);
    },
  });

  const { mutate: mutateCompleteTimer } = useMutation({
    mutationKey: [MUTATION_KEYS.UPDATE_TIMER],
    mutationFn: async (timerId: string) => {
      return await completeTimer({
        data: {
          timerId,
        },
      });
    },
    onSuccess: ({ nextTimerId }) => {
      console.log("[TimerDisplay] Timer completed successfully on expiration");
      if (nextTimerId) {
        console.log(`[TimerDisplay] Next timer to start automatically: ${nextTimerId}`);
        mutateStartTimer(nextTimerId);
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
    },
    onError: (error) => {
      console.error("[TimerDisplay] Error completing timer:", error);
    },
  });

  const handleTimerExpire = useCallback(() => {
    console.log("[TimerDisplay] Timer expired:", timerData.name);

    // Vérifier si le timer est toujours en cours et si toutes les actions sont terminées
    if (timerData.status === "RUNNING" && !hasAutoCompletedRef.current) {
      const allActionsCompleted =
        !timerData.actions ||
        timerData.actions.length === 0 ||
        timerData.actions.every((action) => action.status === "COMPLETED");

      if (allActionsCompleted) {
        console.log(
          "[TimerDisplay] Toutes les actions sont terminées, auto-completion du timer",
        );
        hasAutoCompletedRef.current = true;
        mutateCompleteTimer(timerData.id);
      } else {
        console.log(
          "[TimerDisplay] Des actions sont encore en cours, le timer ne sera pas complété automatiquement",
        );
      }
    }
  }, [timerData, mutateCompleteTimer]);

  const {
    timeLeft,
    currentAction,
    shouldNotifyAction,
    isExpired,
    isRunning,
    markActionAsCompleting,
  } = useTimerWithPusher({
    timer: timerData,
    startTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes ?? 0,
    onExpire: handleTimerExpire,
  });

  // Récupérer les données du PusherProvider pour détecter les actions ponctuelles
  const { updatedAction } = usePusher();

  // Réinitialiser le flag de complétion automatique quand le timer change
  useEffect(() => {
    if (timerData.status !== "COMPLETED") {
      hasAutoCompletedRef.current = false;
    }
  }, [timerData.id, timerData.status]);

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

  // Récupérer la première action du timer pour afficher ses contenus multilingues
  const firstAction = useMemo(() => {
    if (!timerData.actions || timerData.actions.length === 0) return null;
    return timerData.actions[0];
  }, [timerData.actions]);

  // Afficher les contenus si la première action en a et que le timer est en cours
  const shouldShowContent =
    (isRunning || isExpired) &&
    firstAction &&
    (firstAction.contentFr || firstAction.contentEn || firstAction.contentBr);

  return (
    <div className="space-y-6">
      <div className="text-center">
        {isDemo && (
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
        {isDemo && shouldNotifyAction && !currentAction && (
          <div className="mx-auto mt-4 w-1/2 animate-pulse rounded-lg bg-amber-100 p-4 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
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
              key={currentAction.id}
              currentAction={currentAction}
              timeLeft={timeLeft}
              markActionAsCompleting={markActionAsCompleting}
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
              key={punctualAction.id}
              currentAction={punctualAction}
              timeLeft={timeLeft}
              markActionAsCompleting={markActionAsCompleting}
              onActionComplete={() => {
                console.log("[TimerDisplay] Action ponctuelle terminée");
              }}
            />
          </>
        )}
      </div>

      {/* Afficher les contenus multilingues de la première action pendant tout le décompte */}
      {shouldShowContent && (
        <>
          {firstAction.contentEn && (
            <div className="absolute top-16 left-16 w-full max-w-1/3 xl:max-w-1/4">
              <ContentAction
                content={firstAction.contentEn}
                lang="en"
                flagPosition="left"
              />
            </div>
          )}
          {firstAction.contentBr && (
            <div className="absolute top-16 right-16 w-full max-w-1/3 xl:max-w-1/4">
              <ContentAction
                content={firstAction.contentBr}
                lang="br"
                flagPosition="right"
              />
            </div>
          )}
          {firstAction.contentFr && (
            <div className="absolute bottom-16 left-16 w-full max-w-1/3 xl:max-w-1/4">
              <ContentAction
                content={firstAction.contentFr}
                lang="fr"
                flagPosition="left"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TimerDisplay;
