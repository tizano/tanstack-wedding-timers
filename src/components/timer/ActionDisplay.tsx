import { completeAction, startAction } from "@/lib/actions/timer-actions.action";
import { completeTimer, startTimer } from "@/lib/actions/timer.action";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/constant/constant";
import { type TimerAction } from "@/lib/db/schema/timer.schema";
import { TimeLeft } from "@/lib/hooks/useTimerWithActions";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImageAction, ImageWithSound, SoundAction, VideoAction } from "./actions";
import TimerCountdown from "./TimerCountdown";

interface ActionDisplayProps {
  currentAction: TimerAction;
  timeLeft: TimeLeft;
  onActionComplete?: () => void;
  markActionAsCompleting?: (actionId: string) => void;
}

/**
 * Composant principal qui dispatche l'affichage des actions aux composants enfants appropriés.
 * Gère l'overlay et la disposition générale, puis délègue le rendu spécifique à chaque type d'action.
 *
 * Flow:
 * 1. Affiche le média avec overlay
 * 2. Si triggerOffsetMinutes négatif, affiche le timer en petit dans l'overlay
 * 3. Affiche le titre si présent
 * 4. Après la fin du média, affiche les contenus multilingues pendant displayDurationSec
 * 5. Une fois terminé, marque l'action comme complétée et cherche la suivante
 */
const ActionDisplay = ({
  currentAction,
  timeLeft,
  onActionComplete,
  markActionAsCompleting,
}: ActionDisplayProps) => {
  const [showMediaContent, setShowMediaContent] = useState(true);
  const [completingActionId, setCompletingActionId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // L'action est en cours de complétion si son ID est marqué
  // ET qu'elle est toujours l'action courante
  const isCompleting = completingActionId === currentAction.id;

  console.log("[ActionDisplay] Rendu avec currentAction:", currentAction, {
    isCompleting,
    completingActionId,
  });

  const { mutate: mutateStartAction } = useMutation({
    mutationKey: [MUTATION_KEYS.START_ACTION],
    mutationFn: async (actionId: string) => {
      return await startAction({
        data: {
          actionId,
        },
      });
    },
    onSuccess: () => {
      console.log("Next action started automatically");
    },
    onError: (error) => {
      console.error("Error starting next action:", error);
    },
  });

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
      console.log("Next timer started automatically");
    },
    onError: (error) => {
      console.error("Error starting next timer:", error);
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
      console.log("Timer completed successfully");
      if (nextTimerId) {
        console.log(`Next timer to start automatically: ${nextTimerId}`);
        mutateStartTimer(nextTimerId);
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
    },
    onError: (error) => {
      console.error("Error completing timer:", error);
    },
  });

  const { mutate: mutateCompleteAction } = useMutation({
    mutationKey: [MUTATION_KEYS.COMPLETE_ACTION],
    mutationFn: async () => {
      console.log(
        `[ActionDisplay] Marquage de l'action ${currentAction.id} comme en cours de complétion`,
      );

      // Marquer immédiatement comme "en cours de complétion" pour cacher l'affichage
      setCompletingActionId(currentAction.id);

      // Marquer dans le hook pour éviter qu'elle soit détectée comme currentAction
      if (markActionAsCompleting) {
        markActionAsCompleting(currentAction.id);
      }

      return await completeAction({
        data: {
          actionId: currentAction.id,
        },
      });
    },
    onSuccess: ({ action, remainingActions }) => {
      console.log(
        "[ActionDisplay][mutateCompleteAction] Action completed successfully",
        currentAction,
      );
      console.log(
        "[ActionDisplay][mutateCompleteAction] Remaining actions:",
        remainingActions,
      );

      // NE PAS réinitialiser isCompleting ici pour éviter le glitch
      // Il sera réinitialisé automatiquement quand currentAction changera via useEffect

      // Invalider les queries pour mettre à jour l'état

      // Si l'API retourne des actions restantes, vérifier s'il faut en déclencher une automatiquement
      if (remainingActions && remainingActions.length > 0) {
        // Trouver la prochaine action non exécutée avec triggerOffsetMinutes === 0
        const nextAutoAction = remainingActions.find(
          (a) => a.triggerOffsetMinutes === 0 && !a.executedAt && a.status === "PENDING",
        );

        if (nextAutoAction) {
          console.log(
            `[ActionDisplay] Déclenchement automatique de l'action suivante: ${nextAutoAction.id}`,
          );
          mutateStartAction(nextAutoAction.id);
        } else {
          console.log(
            "[ActionDisplay] Aucune action suivante ne doit être déclenchée automatiquement.",
          );
        }
      } else {
        // Plus d'actions restantes, compléter le timer
        console.log(
          "[ActionDisplay] Toutes les actions sont terminées, completion du timer.",
        );
        mutateCompleteTimer(action.timerId);
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
    },
    onError: (error) => {
      console.error("Error completing action:", error);
      // Réinitialiser en cas d'erreur
      setCompletingActionId(null);
    },
  });

  // Déterminer si on doit afficher le timer en petit (offset négatif)
  const shouldShowMiniTimer = currentAction.triggerOffsetMinutes < 0;

  /**
   * Appelé quand le média est terminé (vidéo/audio/image finie)
   */
  const handleMediaComplete = async () => {
    console.log(`[ActionDisplay] Media completed for action ${currentAction.id}`);
    setShowMediaContent(false);
    // Terminer l'action immédiatement après la fin du média
    handleActionComplete();
  };

  const resetValueState = () => {
    setShowMediaContent(true);
  };

  /**
   * Termine l'action et cherche la suivante
   * Si la prochaine action a le même triggerOffsetMinutes, l'enchaîner automatiquement
   */
  const handleActionComplete = async () => {
    mutateCompleteAction();
    resetValueState();
    // Notifier le parent
    onActionComplete?.();
    console.log(
      `[ActionDisplay][handleActionComplete] Action ${currentAction.id} completed, marking as complete...`,
    );
  };

  const renderMediaContent = () => {
    switch (currentAction.type) {
      case "VIDEO":
        return (
          <VideoAction action={currentAction} onMediaComplete={handleMediaComplete} />
        );

      case "SOUND":
        return (
          <SoundAction action={currentAction} onMediaComplete={handleMediaComplete} />
        );
      case "IMAGE_SOUND":
        return (
          <ImageWithSound action={currentAction} onMediaComplete={handleMediaComplete} />
        );

      case "IMAGE":
        return (
          <ImageAction action={currentAction} onMediaComplete={handleMediaComplete} />
        );

      default:
        return (
          <div className="text-white">
            Type d'action non supporté: {currentAction.type}
          </div>
        );
    }
  };

  // Ne rien afficher si l'action est en cours de complétion
  if (isCompleting) {
    console.log("[ActionDisplay] Action en cours de complétion, masquage de l'affichage");
    return null;
  }

  return (
    <>
      <div
        className={cn(
          currentAction.type !== "SOUND" &&
            "pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 opacity-100 backdrop-blur-sm transition-all duration-500",
          !showMediaContent && "pointer-events-none -z-50 opacity-0 transition-all",
        )}
      >
        <div className={cn(currentAction.type === "VIDEO" && "max-w-screen")}>
          {/* Mini timer si offset négatif (action avant la fin) */}
          {shouldShowMiniTimer && showMediaContent && (
            <div className="mt-6 rounded-lg bg-black/50 p-4 text-gray-100 backdrop-blur-md">
              <TimerCountdown timeLeft={timeLeft} variant="small" />
            </div>
          )}
          {/* Contenu média (vidéo/image/son/galerie) */}
          {showMediaContent && (
            <div className="absolute inset-0 flex h-screen w-screen items-center justify-center">
              {renderMediaContent()}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ActionDisplay;
