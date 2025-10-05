import { cn } from '@/lib/utils';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
const TimerCountdown = ({ timeLeft }: { timeLeft: TimeLeft }) => {
  return (
    <div
      className={cn(
        'grid grid-cols-4 gap-4',
        timeLeft.days === 0 ? 'grid-cols-3' : 'grid-cols-4'
      )}
    >
      {timeLeft.days > 0 && (
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{timeLeft.days}</div>
          <div className="text-sm text-muted-foreground">Days</div>
        </div>
      )}
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">{timeLeft.hours}</div>
        <div className="text-sm text-muted-foreground">Hours</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">
          {timeLeft.minutes}
        </div>
        <div className="text-sm text-muted-foreground">Minutes</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">
          {timeLeft.seconds}
        </div>
        <div className="text-sm text-muted-foreground">Seconds</div>
      </div>
    </div>
  );
};

export default TimerCountdown;
