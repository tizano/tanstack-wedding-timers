import { completeAction, startAction } from "@/lib/actions/timer-actions.action";
import { MUTATION_KEYS } from "@/lib/constant/constant";
import { type TimerAction } from "@/lib/db/schema/timer.schema";
import { TimeLeft } from "@/lib/hooks/useTimerWithActions";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ImageAction, ImageWithSound, SoundAction, VideoAction } from "./actions";
import ContentAction from "./actions/ContentAction";
import TimerCountdown from "./TimerCountdown";

interface ActionDisplayProps {
  currentAction: TimerAction;
  timeLeft: TimeLeft;
  nextAction?: TimerAction | null;
  onActionComplete?: () => void;
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
  nextAction,
  onActionComplete,
}: ActionDisplayProps) => {
  const [showMediaContent, setShowMediaContent] = useState(true);
  const [showTextContent, setShowTextContent] = useState(false);
  const [textContentTimer, setTextContentTimer] = useState<number | null>(null);

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

  const { mutate: mutateCompleteAction } = useMutation({
    mutationKey: ["completeAction"],
    mutationFn: async () => {
      // Simulate an API call to complete the action
      return await completeAction({
        data: {
          actionId: currentAction.id,
        },
      });
    },
    onSuccess: () => {
      console.log("[ActionDisplay][mutateCompleteAction] Action completed successfully");
      // Vérifier si la prochaine action doit être déclenchée automatiquement
      if (nextAction && nextAction.triggerOffsetMinutes === 0) {
        console.log(
          `[ActionDisplay] Déclenchement automatique de l'action suivante: ${nextAction.id}`,
        );
        console.log(nextAction);

        mutateStartAction(nextAction.id);
      }
    },
    onError: (error) => {
      console.error("Error completing action:", error);
    },
  });

  // Déterminer si on doit afficher le timer en petit (offset négatif)
  const shouldShowMiniTimer = currentAction.triggerOffsetMinutes < 0;

  // Vérifier s'il y a du contenu textuel multilingue
  const hasTextContent = !!(
    currentAction.contentFr ||
    currentAction.contentEn ||
    currentAction.contentBr
  );

  /**
   * Appelé quand le média est terminé (vidéo/audio/image finie)
   */
  const handleMediaComplete = async () => {
    console.log(`[ActionDisplay] Media completed for action ${currentAction.id}`);
    setShowMediaContent(false);

    if (hasTextContent && currentAction.displayDurationSec) {
      setShowTextContent(hasTextContent);
      // Démarrer le timer pour le contenu textuel
      let remaining = currentAction.displayDurationSec;
      setTextContentTimer(remaining);

      const interval = setInterval(() => {
        remaining -= 1;
        setTextContentTimer(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          setTextContentTimer(null);
          // Fermer l'overlay et terminer l'action
          handleActionComplete();
        }
      }, 1000);
    } else {
      // Pas de contenu textuel, terminer immédiatement
      handleActionComplete();
    }
  };

  const resetValueState = () => {
    setShowMediaContent(true);
    setShowTextContent(false);
    setTextContentTimer(null);
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

  const renderTextContent = () => {
    if (!showTextContent) return null;

    return (
      <>
        <div className="absolute top-16 left-16 w-full max-w-1/3 xl:max-w-1/4">
          <ContentAction
            content={currentAction.contentEn || ""}
            lang="en"
            flagPosition="left"
          />
        </div>
        <div className="absolute top-16 right-16 w-full max-w-1/3 xl:max-w-1/4">
          <ContentAction
            content={currentAction.contentBr || ""}
            lang="br"
            flagPosition="right"
          />
        </div>
        <div className="absolute bottom-16 left-16 w-full max-w-1/3 xl:max-w-1/4">
          <ContentAction
            content={currentAction.contentFr || ""}
            lang="fr"
            flagPosition="left"
          />
        </div>
      </>
    );
  };

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

          {/* Contenu textuel multilingue après le média */}
        </div>
      </div>
      {renderTextContent()}
    </>
  );
};

export default ActionDisplay;
