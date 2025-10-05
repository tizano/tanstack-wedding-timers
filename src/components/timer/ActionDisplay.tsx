import { type TimerAction } from "@/lib/db/schema/timer";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface ActionDisplayProps {
  action: TimerAction;
  onComplete?: () => void;
}

const ActionDisplay = ({ action, onComplete }: ActionDisplayProps) => {
  const [mediaEnded, setMediaEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Gérer le displayDuration après la fin du média
    if (mediaEnded && action.displayDurationSec) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, action.displayDurationSec * 1000);

      return () => clearTimeout(timer);
    } else if (mediaEnded && !action.displayDurationSec) {
      onComplete?.();
    }
  }, [mediaEnded, action.displayDurationSec, onComplete]);

  const handleVideoEnd = () => setMediaEnded(true);
  const handleAudioEnd = () => setMediaEnded(true);

  // Pour les images et galeries, considérer comme "terminé" immédiatement
  useEffect(() => {
    if (action.type === "IMAGE" || action.type === "GALLERY") {
      setMediaEnded(true);
    }
  }, [action.type]);

  const renderContent = () => {
    switch (action.type) {
      case "VIDEO":
        return (
          <video
            ref={videoRef}
            src={action.url || ""}
            autoPlay
            controls
            onEnded={handleVideoEnd}
            className="max-h-[60vh] max-w-full rounded-lg"
          />
        );

      case "SOUND":
        return (
          <div className="flex flex-col items-center gap-4">
            <audio
              ref={audioRef}
              src={action.url || ""}
              autoPlay
              controls
              onEnded={handleAudioEnd}
              className="w-full max-w-md"
            />
            <div className="text-center">
              <div className="text-2xl font-bold">{action.title}</div>
            </div>
          </div>
        );

      case "IMAGE":
        return (
          <img
            src={action.url || ""}
            alt={action.title || "Action image"}
            className="max-h-[60vh] max-w-full rounded-lg"
          />
        );

      case "GALLERY":
        return (
          <div className="relative">
            <img
              src={action.urls[currentImageIndex]}
              alt={`Gallery ${currentImageIndex + 1}`}
              className="max-h-[60vh] max-w-full rounded-lg"
            />
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 transform gap-2">
              {action.urls.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={cn(
                    "h-3 w-3 rounded-full transition-all",
                    idx === currentImageIndex ? "scale-125 bg-white" : "bg-white/50",
                  )}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col items-center gap-6 p-8">
        {action.title && (
          <h2 className="text-center text-3xl font-bold text-white">{action.title}</h2>
        )}

        {renderContent()}

        {(action.contentFr || action.contentEn || action.contentBr) && (
          <div className="max-w-2xl space-y-2 text-center text-white">
            {action.contentFr && <p className="text-lg">{action.contentFr}</p>}
            {action.contentEn && <p className="text-lg italic">{action.contentEn}</p>}
            {action.contentBr && <p className="text-lg italic">{action.contentBr}</p>}
          </div>
        )}

        {action.displayDurationSec && mediaEnded && (
          <div className="text-sm text-white/60">
            Closing in {action.displayDurationSec}s...
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionDisplay;
