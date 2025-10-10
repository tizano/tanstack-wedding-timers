import { TimerAction } from "@/lib/db/schema";
import { useCallback, useRef, useState } from "react";

interface VideoActionProps {
  action: TimerAction;
  onMediaComplete?: () => void;
}

/**
 * Composant qui affiche une vidéo avec contrôles.
 */
const VideoAction = ({ action, onMediaComplete }: VideoActionProps) => {
  const { url } = action;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  const handleComplete = useCallback(() => {
    console.log(`Video action ${action.id} completed.`);
    onMediaComplete?.();
  }, [action.id, onMediaComplete]);

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
        className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
      />
    </div>
  );
};

export default VideoAction;
