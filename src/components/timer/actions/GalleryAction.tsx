import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface GalleryActionProps {
  urls: string[];
  title?: string;
  displayDurationSec?: number;
  onComplete?: () => void;
}

/**
 * Composant qui affiche une galerie d'images avec navigation.
 * Se ferme automatiquement après displayDuration si spécifié.
 */
const GalleryAction = ({
  urls,
  title,
  displayDurationSec,
  onComplete,
}: GalleryActionProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? urls.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === urls.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h2 className="text-center text-3xl font-bold text-white">{title}</h2>}

      <div className="relative">
        <img
          src={urls[currentImageIndex]}
          alt={`Gallery ${currentImageIndex + 1}`}
          className="max-h-[60vh] max-w-full rounded-lg shadow-2xl"
        />

        {/* Boutons de navigation */}
        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevious}
              className="absolute top-1/2 left-4 -translate-y-1/2 transform rounded-full bg-white/80 p-3 shadow-lg transition-all hover:scale-110 hover:bg-white"
              aria-label="Image précédente"
            >
              <svg
                className="h-6 w-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute top-1/2 right-4 -translate-y-1/2 transform rounded-full bg-white/80 p-3 shadow-lg transition-all hover:scale-110 hover:bg-white"
              aria-label="Image suivante"
            >
              <svg
                className="h-6 w-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Indicateurs de pagination */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 transform gap-2">
          {urls.map((url) => {
            const idx = urls.indexOf(url);
            return (
              <button
                key={url}
                type="button"
                onClick={() => setCurrentImageIndex(idx)}
                className={cn(
                  "h-3 w-3 rounded-full transition-all",
                  idx === currentImageIndex
                    ? "scale-125 bg-white"
                    : "bg-white/50 hover:bg-white/70",
                )}
                aria-label={`Aller à l'image ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>

      {displayDurationSec ? (
        <div className="text-sm text-white/60">
          Fermeture dans {displayDurationSec}s...
        </div>
      ) : null}
    </div>
  );
};

export default GalleryAction;
