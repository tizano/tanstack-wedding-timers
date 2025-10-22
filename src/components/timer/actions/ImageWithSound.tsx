import { usePlaybackSpeed } from "@/lib/context/PlaybackSpeedContext";
import { TimerAction } from "@/lib/db/schema/timer.schema";
import { useCallback, useEffect, useRef, useState } from "react";

interface ImageWithSoundActionProps {
  action: TimerAction;
  onMediaComplete?: () => void;
}

/**
 * Composant qui joue un fichier audio avec contrôles.
 * Se ferme automatiquement après la fin de l'audio + displayDuration.
 */
const ImageWithSound = ({ action, onMediaComplete }: ImageWithSoundActionProps) => {
  const { urls } = action;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEnded, setAudioEnded] = useState(false);
  const { playbackSpeed } = usePlaybackSpeed();

  const handleComplete = useCallback(() => {
    console.log(`Audio action ${action.id} completed.`);
    onMediaComplete?.();
  }, [action.id, onMediaComplete]);

  const handleAudioEnd = () => {
    console.log(
      `🔊🖼️ [ImageWithSound] Audio ended for action ${action.id}, cleaning up...`,
    );
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

  const getMediaByUrl = (mediaUrls: string[]) => {
    if (mediaUrls.length === 0) return null;
    const imageUrl = mediaUrls.find((url) => url.match(/\.(jpeg|jpg|gif|png|svg)$/));
    const audioUrl = mediaUrls.find((url) => url.match(/\.(mp3|wav|ogg)$/));

    return { imageUrl, audioUrl };
  };

  const { imageUrl, audioUrl } = getMediaByUrl(urls) || {};

  return (
    <div className="flex flex-col items-center gap-4">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={action.title || "Image"}
          className="max-h-[60vh] max-w-full"
        />
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          autoPlay
          controls
          onEnded={handleAudioEnd}
          className="h-0 w-full max-w-md opacity-0"
        />
      )}
    </div>
  );
};

export default ImageWithSound;
