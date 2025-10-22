import { usePlaybackSpeed } from "@/lib/context/PlaybackSpeedContext";
import { TimerAction } from "@/lib/db/schema/timer.schema";
import { useCallback, useEffect, useRef, useState } from "react";

interface SoundActionProps {
  action: TimerAction;
  onMediaComplete?: () => void;
}

/**
 * Composant qui joue un fichier audio avec contrôles.
 */
const SoundAction = ({ action, onMediaComplete }: SoundActionProps) => {
  const { url } = action;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEnded, setAudioEnded] = useState(false);
  const { playbackSpeed } = usePlaybackSpeed();

  const handleComplete = useCallback(() => {
    console.log(`Audio action ${action.id} completed.`);
    onMediaComplete?.();
  }, [action.id, onMediaComplete]);

  const handleAudioEnd = () => {
    console.log(`🔊 [SoundAction] Audio ended for action ${action.id}, cleaning up...`);
    setAudioEnded(true);

    // Nettoyage après la fin de l'audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }

    handleComplete();
  };

  // Appliquer la vitesse de lecture au chargement et lors des changements
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  return (
    <div className="flex h-0 flex-col items-center gap-4">
      <audio
        ref={audioRef}
        src={url || ""}
        autoPlay
        controls
        onEnded={handleAudioEnd}
        className="w-full max-w-md opacity-0"
      />
    </div>
  );
};

export default SoundAction;
