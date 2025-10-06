import { useEffect } from "react";

interface ImageActionProps {
  url: string;
  title?: string;
  displayDurationSec?: number;
  onComplete?: () => void;
}

/**
 * Composant qui affiche une image.
 * Se ferme automatiquement après displayDuration si spécifié.
 */
const ImageAction = ({
  url,
  title,
  displayDurationSec,
  onComplete,
}: ImageActionProps) => {
  useEffect(() => {
    if (displayDurationSec) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, displayDurationSec * 1000);

      return () => clearTimeout(timer);
    } else {
      // Pas de durée définie, terminer immédiatement
      onComplete?.();
    }
  }, [displayDurationSec, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h2 className="text-center text-3xl font-bold text-white">{title}</h2>}

      <img
        src={url}
        alt={title || "Image"}
        className="max-h-[60vh] max-w-full rounded-lg shadow-2xl"
      />

      {displayDurationSec ? (
        <div className="text-sm text-white/60">
          Fermeture dans {displayDurationSec}s...
        </div>
      ) : null}
    </div>
  );
};

export default ImageAction;
