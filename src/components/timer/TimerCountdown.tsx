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
        variant === "large" ? "gap-8" : "gap-4",
      )}
    >
      {timeLeft.days > 0 && (
        <div className="text-center">
          <div className={cn("text-3xl font-bold", variant === "large" && "text-8xl")}>
            {timeLeft.days}
          </div>
          <div className={cn("text-sm", variant === "large" && "text-md")}>Days</div>
        </div>
      )}
      <div className="text-center">
        <div className={cn("text-3xl font-bold", variant === "large" && "text-8xl")}>
          {timeLeft.hours}
        </div>
        <div className={cn("text-sm", variant === "large" && "text-md")}>Hours</div>
      </div>
      <div className="text-center">
        <div className={cn("text-3xl font-bold", variant === "large" && "text-8xl")}>
          {timeLeft.minutes}
        </div>
        <div className={cn("text-sm", variant === "large" && "text-md")}>Minutes</div>
      </div>
      <div className="text-center">
        <div className={cn("text-3xl font-bold", variant === "large" && "text-8xl")}>
          {timeLeft.seconds}
        </div>
        <div className={cn("text-sm", variant === "large" && "text-md")}>Seconds</div>
      </div>
    </div>
  );
};

export default TimerCountdown;
