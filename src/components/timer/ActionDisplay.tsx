/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
import {
  completeAction,
  getNextActionFromCurrent,
} from "@/lib/actions/timer-actions.action";
import { type TimerAction } from "@/lib/db/schema/timer.schema";
import { TimeLeft } from "@/lib/hooks/useTimerWithActions";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  AudioAction,
  GalleryAction,
  ImageAction,
  ImageWithSound,
  VideoAction,
} from "./actions";
import TimerCountdown from "./TimerCountdown";

interface ActionDisplayProps {
  currentAction: TimerAction;
  actions: TimerAction[];
  timeLeft: TimeLeft;
  timerId: string;
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
  actions,
  timeLeft,
  timerId,
  onActionComplete,
}: ActionDisplayProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const [showMediaContent, setShowMediaContent] = useState(true);
  const [showTextContent, setShowTextContent] = useState(false);
  const [textContentTimer, setTextContentTimer] = useState<number | null>(null);

  // Déterminer si on doit afficher le timer en petit (offset négatif)
  const shouldShowMiniTimer = currentAction.triggerOffsetMinutes < 0;

  // Vérifier s'il y a du contenu textuel multilingue
  const hasTextContent = !!(
    currentAction.contentFr ||
    currentAction.contentEn ||
    currentAction.contentBr
  );

  /**
   * Vérifie s'il y a une action IMAGE avant une action SOUND dans le tableau d'actions.
   * Compare les orderIndex pour déterminer l'ordre des actions.
   */
  const hasImageBeforeSound = (currentSoundAction: TimerAction): boolean => {
    // Trouve toutes les actions IMAGE qui ont un orderIndex inférieur à l'action SOUND actuelle
    const imageActions = actions.filter(
      (action) =>
        action.type === "IMAGE" && action.orderIndex < currentSoundAction.orderIndex,
    );

    // Retourne true s'il y a au moins une action IMAGE avant cette action SOUND
    return imageActions.length > 0;
  };

  /**
   * Appelé quand le média est terminé (vidéo/audio/image finie)
   */
  const handleMediaComplete = async () => {
    console.log(`Media completed for action ${currentAction.id}`);

    setShowMediaContent(false);

    // Si on a du contenu textuel à afficher
    if (hasTextContent && currentAction.displayDurationSec) {
      setShowTextContent(true);

      // Démarrer le timer pour le contenu textuel
      const remainingTime = currentAction.displayDurationSec;
      setTextContentTimer(remainingTime);

      // Compter à rebours
      const interval = setInterval(() => {
        setTextContentTimer((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            handleActionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Pas de contenu textuel, terminer l'action immédiatement
      handleActionComplete();
    }
  };

  /**
   * Termine l'action et cherche la suivante
   */
  const handleActionComplete = async () => {
    console.log(`Action ${currentAction.id} completed, marking as complete...`);

    try {
      // Marquer l'action comme complétée en DB
      await completeAction({ data: { actionId: currentAction.id } });

      // Chercher la prochaine action
      const nextActionResult = await getNextActionFromCurrent({
        data: { timerId, actionId: currentAction.id },
      });

      console.log("Next action:", nextActionResult);

      // Fermer l'overlay
      setIsHidden(true);

      // Notifier le parent
      onActionComplete?.();

      // Si pas de prochaine action, le timer est terminé
      if (!nextActionResult?.action) {
        console.log("No more actions, timer completed!");
      }
    } catch (error) {
      console.error("Error completing action:", error);
    }
  };

  // Reset l'état quand l'action change
  useEffect(() => {
    setIsHidden(false);
    setShowMediaContent(true);
    setShowTextContent(false);
    setTextContentTimer(null);
  }, [currentAction.id]);

  const renderMediaContent = () => {
    if (!showMediaContent) return null;

    switch (currentAction.type) {
      case "VIDEO":
        return <VideoAction action={currentAction} onComplete={handleMediaComplete} />;

      case "SOUND":
        // Vérifier s'il y a une action IMAGE avant cette action SOUND
        if (hasImageBeforeSound(currentAction)) {
          // Trouve la dernière action IMAGE avant cette action SOUND
          const previousImageAction = actions
            .filter(
              (action) =>
                action.type === "IMAGE" && action.orderIndex < currentAction.orderIndex,
            )
            .sort((a, b) => b.orderIndex - a.orderIndex)[0];

          if (previousImageAction?.url) {
            return (
              <ImageWithSound
                imageUrl={previousImageAction.url}
                soundUrl={currentAction.url || ""}
                title={currentAction.title || undefined}
                onComplete={handleMediaComplete}
              />
            );
          }
        }

        return (
          <AudioAction
            url={currentAction.url || ""}
            title={currentAction.title || undefined}
            displayDurationSec={currentAction.displayDurationSec || undefined}
            onComplete={handleMediaComplete}
          />
        );

      case "IMAGE":
        return (
          <ImageAction
            url={currentAction.url || ""}
            title={currentAction.title || undefined}
            displayDurationSec={currentAction.displayDurationSec || undefined}
            onComplete={handleMediaComplete}
          />
        );

      case "GALLERY":
        return (
          <GalleryAction
            urls={currentAction.urls}
            title={currentAction.title || undefined}
            displayDurationSec={currentAction.displayDurationSec || undefined}
            onComplete={handleMediaComplete}
          />
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
      <div className="max-w-2xl space-y-4 text-center text-white">
        {currentAction.contentFr && (
          <p className="text-2xl font-semibold">{currentAction.contentFr}</p>
        )}
        {currentAction.contentEn && (
          <p className="text-xl italic opacity-90">{currentAction.contentEn}</p>
        )}
        {currentAction.contentBr && (
          <p className="text-xl italic opacity-90">{currentAction.contentBr}</p>
        )}

        {textContentTimer !== null && (
          <div className="mt-6">
            <div className="text-sm text-white/70">
              Fermeture dans {textContentTimer}s
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 opacity-100 backdrop-blur-sm transition-all duration-500",
        isHidden && "pointer-events-none -z-50 opacity-0",
      )}
    >
      <div className="flex w-full max-w-4xl flex-col items-center gap-6 p-8">
        {/* Titre de l'action si présent */}
        {currentAction.title && showMediaContent && (
          <h2 className="mb-4 text-center text-3xl font-bold text-white">
            {currentAction.title}
          </h2>
        )}

        {/* Contenu média (vidéo/image/son/galerie) */}
        {renderMediaContent()}

        {/* Mini timer si offset négatif (action avant la fin) */}
        {shouldShowMiniTimer && showMediaContent && (
          <div className="mt-6 rounded-lg bg-black/50 p-4">
            <p className="mb-2 text-center text-sm text-white/70">
              Temps restant du timer
            </p>
            <TimerCountdown timeLeft={timeLeft} variant="small" />
          </div>
        )}

        {/* Contenu textuel multilingue après le média */}
        {renderTextContent()}
      </div>
    </div>
  );
};

export default ActionDisplay;
