import { useEffect, useRef, useState } from "react";

interface ImageWithSoundProps {
  imageUrl: string;
  soundUrl: string;
  title?: string;
  onComplete?: () => void;
}

/**
 * Composant qui affiche une image et joue un son simultanément.
 * L'image se ferme automatiquement à la fin du son.
 */
const ImageWithSound = ({
  imageUrl,
  soundUrl,
  title,
  onComplete,
}: ImageWithSoundProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEnded, setAudioEnded] = useState(false);

  useEffect(() => {
    if (audioEnded) {
      onComplete?.();
    }
  }, [audioEnded, onComplete]);

  const handleAudioEnd = () => {
    setAudioEnded(true);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {title && <h2 className="text-center text-3xl font-bold text-white">{title}</h2>}

      <img
        src={imageUrl}
        alt={title || "Image"}
        className="max-h-[60vh] max-w-full rounded-lg shadow-2xl"
      />

      <audio
        ref={audioRef}
        src={soundUrl}
        autoPlay
        onEnded={handleAudioEnd}
        className="hidden"
      />

      {audioEnded && <div className="text-sm text-white/60">Fermeture...</div>}
    </div>
  );
};

export default ImageWithSound;
