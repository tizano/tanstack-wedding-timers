import { TimerAction } from "@/lib/db/schema";
import { useCallback, useRef, useState } from "react";

interface VideoActionProps {
  action: TimerAction;
  onComplete?: () => void;
}

/**
 * Composant qui affiche une vidéo avec contrôles.
 * Se ferme automatiquement après la fin de la vidéo + displayDuration.
 */
const VideoAction = ({ action, onComplete }: VideoActionProps) => {
  const { url } = action;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  const handleComplete = useCallback(() => {
    console.log(`Video action ${action.id} completed.`);
    // call next action in server
    // getNextActionFromCurrent({ data: { timerId: action.timerId, actionId: action.id } });
    onComplete?.();
  }, [action.id, action.timerId, onComplete]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    handleComplete();
  };

  return (
    <div className="flex flex-col items-center gap-4">
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
    </div>
  );
};

export default VideoAction;
