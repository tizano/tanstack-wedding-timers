import { type Timer, type TimerAction } from "@/lib/db/schema/timer.schema";
import { useEffect, useState } from "react";
import TimerActionDemo from "../demo/TimerActionDemo";
import TimerCountdown from "./TimerCountdown";

interface TimerDisplayProps {
  timer: Timer & { actions: TimerAction[] };
  hideTitle?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const TimerDisplay = ({ timer, hideTitle = false }: TimerDisplayProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [currentAction, setCurrentAction] = useState<TimerAction | null>(null);

  const calculateActionTriggerTime = (
    startTime: Date,
    durationMinutes: number,
    triggerOffsetMinutes: number,
  ): Date => {
    if (triggerOffsetMinutes === 0) {
      return new Date(startTime.getTime() + durationMinutes * 60000);
    } else if (triggerOffsetMinutes < 0) {
      return new Date(
        startTime.getTime() + (durationMinutes + triggerOffsetMinutes) * 60000,
      );
    } else {
      return new Date(startTime.getTime() + triggerOffsetMinutes * 60000);
    }
  };

  useEffect(() => {
    if (!timer.startedAt || !timer.durationMinutes) return;

    const interval = setInterval(() => {
      const now = new Date();
      const endTime = new Date(
        new Date(timer.startedAt!).getTime() + timer.durationMinutes! * 60000,
      );
      const diff = Math.floor((endTime.getTime() - now.getTime()) / 1000);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeLeft({ days, hours, minutes, seconds });

      // Vérifier si une action doit être affichée
      const actionToShow = timer.actions.find((action) => {
        if (action.executedAt) return false;

        const actionTriggerTime = calculateActionTriggerTime(
          timer.startedAt!,
          timer.durationMinutes!,
          action.triggerOffsetMinutes,
        );

        return now >= actionTriggerTime;
      });

      if (actionToShow && currentAction?.id !== actionToShow.id) {
        setCurrentAction(actionToShow);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, currentAction]);

  return (
    <div className="relative">
      <div className="space-y-6">
        <div className="text-center">
          {!hideTitle && <h2 className="mb-2 text-4xl font-bold">{timer.name}</h2>}
          {timer.status === "RUNNING" && <TimerCountdown timeLeft={timeLeft} />}
        </div>
      </div>
      <TimerActionDemo timerId={timer.id} />
    </div>
  );
};

export default TimerDisplay;
