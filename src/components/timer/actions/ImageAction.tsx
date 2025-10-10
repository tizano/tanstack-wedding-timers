import { TimerAction } from "@/lib/db/schema/timer.schema";
import { useEffect } from "react";

interface ImageActionProps {
  action: TimerAction;
  onMediaComplete?: () => void;
}

/**
 * Composant qui affiche une image.
 * Se ferme automatiquement après displayDuration si spécifié.
 */
const ImageAction = ({ action, onMediaComplete }: ImageActionProps) => {
  const IMAGE_DISPLAY_DURATION_SEC = 30;
  const { url } = action;

  useEffect(() => {
    const timer = setTimeout(() => {
      onMediaComplete?.();
    }, IMAGE_DISPLAY_DURATION_SEC * 1000);

    return () => {
      onMediaComplete?.();
      clearTimeout(timer);
    };
    // Pas de durée définie, terminer immédiatement
  }, [onMediaComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src={url || ""}
        alt={action.title || "Image"}
        className="max-h-[60vh] max-w-full rounded-lg shadow-2xl"
      />
    </div>
  );
};

export default ImageAction;
