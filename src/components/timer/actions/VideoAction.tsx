import { getNextAction } from "@/lib/actions/timer-actions.action";
import { TimerAction } from "@/lib/db/schema";
import { useCallback, useEffect, useRef, useState } from "react";

interface VideoActionProps {
  action: TimerAction;
  onComplete?: () => void;
}

/**
 * Composant qui affiche une vidéo avec contrôles.
 * Se ferme automatiquement après la fin de la vidéo + displayDuration.
 */
const VideoAction = ({ action, onComplete }: VideoActionProps) => {
  const { url, title, displayDurationSec } = action;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  const handleComplete = useCallback(() => {
    console.log(`Video action ${action.id} completed.`);
    // call next action in server
    getNextAction({ data: { timerId: action.timerId, actionId: action.id } });
    onComplete?.();
  }, [action.id, action.timerId, onComplete]);

  useEffect(() => {
    if (videoEnded && displayDurationSec) {
      const timer = setTimeout(() => {
        handleComplete();
      }, displayDurationSec * 1000);

      return () => clearTimeout(timer);
    } else if (videoEnded && !displayDurationSec) {
      // je suis la
      console.log("Video ended and no displayDurationSec, completing immediately");

      handleComplete();
    }
  }, [videoEnded, displayDurationSec, onComplete, handleComplete]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h2 className="text-center text-3xl font-bold text-white">{title}</h2>}

      <video
        ref={videoRef}
        src={url || ""}
        autoPlay
        controls
        muted={false}
        playsInline
        preload="auto"
        onEnded={handleVideoEnd}
        className="max-h-[60vh] max-w-full rounded-lg shadow-2xl"
      />

      {videoEnded ? (
        <div className="text-sm text-white/60">
          Fermeture dans {displayDurationSec}s...
        </div>
      ) : null}
    </div>
  );
};

export default VideoAction;
