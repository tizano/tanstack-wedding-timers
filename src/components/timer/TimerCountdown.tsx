import { cn } from "@/lib/utils";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
const TimerCountdown = ({
  timeLeft,
  variant = "small",
}: {
  timeLeft: TimeLeft;
  variant?: "large" | "small";
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-4 dark:text-gray-200",
        timeLeft.days === 0 ? "grid-cols-3" : "grid-cols-4",
      )}
    >
      {timeLeft.days > 0 && (
        <div className="text-center">
          <div className={cn("text-3xl font-bold", variant === "large" && "text-5xl")}>
            {timeLeft.days}
          </div>
          <div className="text-sm">Days</div>
        </div>
      )}
      <div className="text-center">
        <div className={cn("text-3xl font-bold", variant === "large" && "text-5xl")}>
          {timeLeft.hours}
        </div>
        <div className="text-sm">Hours</div>
      </div>
      <div className="text-center">
        <div className={cn("text-3xl font-bold", variant === "large" && "text-5xl")}>
          {timeLeft.minutes}
        </div>
        <div className="text-sm">Minutes</div>
      </div>
      <div className="text-center">
        <div className={cn("text-3xl font-bold", variant === "large" && "text-5xl")}>
          {timeLeft.seconds}
        </div>
        <div className="text-sm">Seconds</div>
      </div>
    </div>
  );
};

export default TimerCountdown;
