import { TimerWithActions } from "@/lib/types/timer.type";
import { formatTimezoneAgnosticDate } from "@/lib/utils";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";
import { useState } from "react";
import { TimerWithActionsDemo } from "../demo/TimerWithActionsDemo";
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

  return (
    <section className="h-screen w-full overflow-hidden">
      <article>
        <video
          src="/assets/videos/universe.mp4"
          autoPlay
          muted
          loop
          className="absolute top-0 left-0 z-0 h-full w-full object-cover"
        ></video>
        <div className="absolute top-0 left-0 z-10 h-full w-full bg-black/70"></div>
        <div className="relative z-20 flex h-screen flex-col items-center justify-center gap-8">
          {!isClicked && (
            <Button onClick={() => setIsClicked(true)} variant="destructive">
              Click me to enable video sound
            </Button>
          )}
          <div className="flex flex-col items-center gap-2 text-gray-200 dark:text-gray-200">
            <PartyPopper className="size-9" />
            <h1 className="text-4xl font-bold">Tony & Neka</h1>
          </div>
          {currentTimer && isDemo ? (
            <div className="space-y-2 text-center text-gray-200">
              <h2 className="text-2xl font-semibold">{currentTimer.name}</h2>
              {currentTimer.scheduledStartTime && (
                <p className="text-lg">
                  Programmé pour:{" "}
                  {formatTimezoneAgnosticDate(currentTimer.scheduledStartTime, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              )}
              {currentTimer.durationMinutes != null &&
                currentTimer.durationMinutes > 0 && (
                  <p className="text-md opacity-80">
                    Durée: {currentTimer.durationMinutes} minutes
                  </p>
                )}
              <p className="text-sm opacity-60">
                Statut: {currentTimer.status || "En attente"}
              </p>
              <TimerDisplay timerData={currentTimer} hideTitle />
            </div>
          ) : (
            <div className="text-xl text-gray-300">Aucun timer programmé</div>
          )}
          <div className="group absolute top-0 right-0 p-4">
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
          {isDemo && <TimerWithActionsDemo />}
        </div>
      </article>
    </section>
  );
}
export default WeddingTimerSection;
