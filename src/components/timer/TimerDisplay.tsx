import { type Timer, type TimerAction } from "@/lib/db/schema/timer";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import ActionDisplay from "./ActionDisplay";
import TimerCountdown from "./TimerCountdown";

interface TimerDisplayProps {
  timer: Timer & { actions: TimerAction[] };
  onActionComplete?: (actionId: string) => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const TimerDisplay = ({ timer, onActionComplete }: TimerDisplayProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [currentAction, setCurrentAction] = useState<TimerAction | null>(null);

  useEffect(() => {
    if (!timer.startedAt || !timer.durationMinutes) return;

    const interval = setInterval(() => {
      const now = dayjs();
      const endTime = dayjs(timer.startedAt).add(timer.durationMinutes!, "minutes");
      const diff = endTime.diff(now, "seconds");

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

        return now.isAfter(actionTriggerTime) || now.isSame(actionTriggerTime);
      });

      if (actionToShow && currentAction?.id !== actionToShow.id) {
        setCurrentAction(actionToShow);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, currentAction]);

  const calculateActionTriggerTime = (
    startTime: Date,
    durationMinutes: number,
    triggerOffsetMinutes: number,
  ) => {
    const start = dayjs(startTime);

    if (triggerOffsetMinutes === 0) {
      return start.add(durationMinutes, "minutes");
    } else if (triggerOffsetMinutes < 0) {
      return start.add(durationMinutes + triggerOffsetMinutes, "minutes");
    } else {
      return start.add(triggerOffsetMinutes, "minutes");
    }
  };

  const handleActionComplete = (actionId: string) => {
    setCurrentAction(null);
    onActionComplete?.(actionId);
  };

  return (
    <div className="relative">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold">{timer.name}</h1>
          {timer.status === "RUNNING" && <TimerCountdown timeLeft={timeLeft} />}
        </div>
      </div>

      {currentAction && (
        <ActionDisplay
          action={currentAction}
          onComplete={() => handleActionComplete(currentAction.id)}
        />
      )}
    </div>
  );
};

export default TimerDisplay;
