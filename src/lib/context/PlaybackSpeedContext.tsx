import { createContext, use, useMemo, useState, type ReactNode } from "react";

interface PlaybackSpeedContextType {
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

const PlaybackSpeedContext = createContext<PlaybackSpeedContextType | undefined>(
  undefined,
);

export function PlaybackSpeedProvider({ children }: { children: ReactNode }) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const value = useMemo(() => ({ playbackSpeed, setPlaybackSpeed }), [playbackSpeed]);

  return <PlaybackSpeedContext value={value}>{children}</PlaybackSpeedContext>;
}

export function usePlaybackSpeed() {
  const context = use(PlaybackSpeedContext);
  if (context === undefined) {
    throw new Error("usePlaybackSpeed must be used within a PlaybackSpeedProvider");
  }
  return context;
}
