import { usePlaybackSpeed } from "@/lib/context/PlaybackSpeedContext";
import { TimerAction } from "@/lib/db/schema";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const { playbackSpeed } = usePlaybackSpeed();

  const handleComplete = useCallback(() => {
    console.log(`Video action ${action.id} completed.`);
    onMediaComplete?.();
  }, [action.id, onMediaComplete]);

  const handleVideoEnd = () => {
    console.log(`🎥 [VideoAction] Video ended for action ${action.id}, cleaning up...`);
    setVideoEnded(true);

    // Nettoyage après la fin de la vidéo
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = "";
    }

    handleComplete();
  };

  // Appliquer la vitesse de lecture au chargement et lors des changements
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

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
