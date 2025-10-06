import { useEffect, useRef, useState } from "react";

interface AudioActionProps {
  url: string;
  title?: string;
  displayDurationSec?: number;
  onComplete?: () => void;
}

/**
 * Composant qui joue un fichier audio avec contrôles.
 * Se ferme automatiquement après la fin de l'audio + displayDuration.
 */
const AudioAction = ({
  url,
  title,
  displayDurationSec,
  onComplete,
}: AudioActionProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEnded, setAudioEnded] = useState(false);

  useEffect(() => {
    if (audioEnded && displayDurationSec) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, displayDurationSec * 1000);

      return () => clearTimeout(timer);
    } else if (audioEnded && !displayDurationSec) {
      onComplete?.();
    }
  }, [audioEnded, displayDurationSec, onComplete]);

  const handleAudioEnd = () => {
    setAudioEnded(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h2 className="text-center text-3xl font-bold text-white">{title}</h2>}

      <audio
        ref={audioRef}
        src={url}
        autoPlay
        controls
        onEnded={handleAudioEnd}
        className="w-full max-w-md"
      />

      {audioEnded && displayDurationSec ? (
        <div className="text-sm text-white/60">
          Fermeture dans {displayDurationSec}s...
        </div>
      ) : null}
    </div>
  );
};

export default AudioAction;
