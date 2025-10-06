import { type TimerAction } from "@/lib/db/schema/timer.schema";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  AudioAction,
  GalleryAction,
  ImageAction,
  ImageWithSound,
  VideoAction,
} from "./actions";

interface ActionDisplayProps {
  currentAction: TimerAction;
  actions: TimerAction[];
  onComplete?: () => void;
}

/**
 * Composant principal qui dispatche l'affichage des currentActions aux composants enfants appropriés.
 * Gère l'overlay et la disposition générale, puis délègue le rendu spécifique à chaque type d'currentAction.
 */
const ActionDisplay = ({ currentAction, actions }: ActionDisplayProps) => {
  const [isHidden, setIsHidden] = useState(false);

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

  const onComplete = () => {
    console.log(`Action ${currentAction.id} of type ${currentAction.type} completed.`);
    setIsHidden(true);
    // Ici, vous pouvez implémenter la logique après la complétion de l'currentAction,
    // par exemple en appelant une mutation ou en mettant à jour l'état.
  };

  const renderActionContent = () => {
    switch (currentAction.type) {
      case "VIDEO":
        return <VideoAction action={currentAction} onComplete={onComplete} />;

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
                onComplete={onComplete}
              />
            );
          }
        }

        return (
          <AudioAction
            url={currentAction.url || ""}
            title={currentAction.title || undefined}
            displayDurationSec={currentAction.displayDurationSec || undefined}
            onComplete={onComplete}
          />
        );

      case "IMAGE":
        return (
          <ImageAction
            url={currentAction.url || ""}
            title={currentAction.title || undefined}
            displayDurationSec={currentAction.displayDurationSec || undefined}
            onComplete={onComplete}
          />
        );

      case "GALLERY":
        return (
          <GalleryAction
            urls={currentAction.urls}
            title={currentAction.title || undefined}
            displayDurationSec={currentAction.displayDurationSec || undefined}
            onComplete={onComplete}
          />
        );

      default:
        return (
          <div className="text-white">
            Type d'currentAction non supporté: {currentAction.type}
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 opacity-100 backdrop-blur-sm transition-all",
        isHidden && "pointer-events-none -z-50 opacity-0",
      )}
    >
      <div className="flex w-full max-w-4xl flex-col items-center gap-6 p-8">
        {renderActionContent()}

        {/* Affichage des contenus multilingues si disponibles */}
        {(currentAction.contentFr ||
          currentAction.contentEn ||
          currentAction.contentBr) && (
          <div className="max-w-2xl space-y-2 text-center text-white">
            {currentAction.contentFr && (
              <p className="text-lg">{currentAction.contentFr}</p>
            )}
            {currentAction.contentEn && (
              <p className="text-lg italic">{currentAction.contentEn}</p>
            )}
            {currentAction.contentBr && (
              <p className="text-lg italic">{currentAction.contentBr}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionDisplay;
