import { usePlaybackSpeed } from "@/lib/context/PlaybackSpeedContext";
import { TimerWithActions } from "@/lib/types/timer.type";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import TimerDisplay from "./TimerDisplay";

function WeddingTimerSection({
  currentTimer,
}: {
  currentTimer: TimerWithActions | null;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // useTimerPolling("wedding-event-1");
  const isDemo = location.pathname.includes("demo");
  const [isClicked, setIsClicked] = useState(false);
  const { playbackSpeed, setPlaybackSpeed } = usePlaybackSpeed();

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    // Appliquer la vitesse à tous les médias sauf la vidéo de fond
    const videos = document.querySelectorAll("video:not(#background-video)");
    const audios = document.querySelectorAll("audio");

    videos.forEach((video) => {
      (video as HTMLVideoElement).playbackRate = speed;
    });

    audios.forEach((audio) => {
      (audio as HTMLAudioElement).playbackRate = speed;
    });
  };

  return (
    <section className="h-screen w-full overflow-hidden">
      <article>
        <video
          src="/assets/videos/universe.mp4"
          autoPlay
          muted
          loop
          className="absolute top-0 left-0 z-0 h-full w-full object-cover"
          id="background-video"
        ></video>
        <div className="absolute top-0 left-0 z-10 h-full w-full bg-black/70"></div>
        <div className="relative z-20 flex h-screen flex-col items-center justify-center gap-8">
          {!isClicked && (
            <Button onClick={() => setIsClicked(true)} variant="destructive">
              Click me to enable video sound
            </Button>
          )}
          {isDemo && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-300">Vitesse de lecture</p>
              <div className="flex gap-2">
                {[1, 2, 5, 10].map((speed) => (
                  <Button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    variant={playbackSpeed === speed ? "default" : "outline"}
                    size="sm"
                    className="min-w-[3rem]"
                  >
                    x{speed}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col items-center gap-2 text-gray-200 dark:text-gray-200">
            <PartyPopper className="size-9" />
            <h1 className="font-parisienne text-6xl">Tony & Neka</h1>
          </div>
          <div className="group absolute top-0 right-0 z-50 p-4">
            <Button
              onClick={() =>
                navigate({
                  to: "/dashboard/$weddingEventId",
                  params: { weddingEventId: "wedding-event-1" },
                })
              }
              variant={"outline"}
              className="translate-x-[calc(100%+2rem)] cursor-pointer transition-transform group-hover:translate-x-0"
            >
              Go to dashboard
            </Button>
          </div>
          {currentTimer && (
            <div className="text-gray-100">
              <TimerDisplay timerData={currentTimer} isDemo={isDemo} variant="large" />
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
export default WeddingTimerSection;
