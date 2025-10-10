import { TimerAction } from "@/lib/db/schema/timer.schema";
import { useCallback, useRef, useState } from "react";

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

  const handleComplete = useCallback(() => {
    console.log(`Audio action ${action.id} completed.`);
    onMediaComplete?.();
  }, [action.id, onMediaComplete]);

  const handleAudioEnd = () => {
    setAudioEnded(true);
    handleComplete();
  };

  return (
    <div className="flex flex-col items-center gap-4">
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
