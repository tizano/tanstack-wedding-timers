import { type Timer } from "@/lib/db/schema/timer.schema";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { startTimer } from "@/lib/actions/timer.action";
import { MUTATION_KEYS } from "@/lib/constant/constant";
import { useTimerWithPusher } from "@/lib/hooks/useTimerWithPusher";
import { TimerWithActions } from "@/lib/types/timer.type";
import { cn, formatTimezoneAgnosticDate } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import ActionList from "../timer/ActionList";
import TimerCountdown from "../timer/TimerCountdown";
import { Button } from "../ui/button";
import StatusBadge from "./StatusBadge";

type TimerCardProps = {
  timerData: TimerWithActions;
  isCurrent?: boolean;
  isDemo?: boolean;
};

export default function TimerCard({ timerData, isCurrent, isDemo }: TimerCardProps) {
  const navigate = useNavigate();

  const { timeLeft, isExpired, currentAction } = useTimerWithPusher({
    timer: timerData,
    startTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes ?? 0,
    onExpire: () => {
      console.log("Timer expired for:", timerData.name);
    },
    onActionTrigger: (action) => {
      console.log("Action triggered:", action.title, action.type);
    },
  });

  const { mutate: mutateDisplayTimer } = useMutation({
    mutationKey: [MUTATION_KEYS.START_TIMER],
    mutationFn: async () => {
      // Simulate an API call to display the timer
      return await startTimer({
        data: {
          timerId: timerData.id,
        },
      });
    },
    onSuccess: () => {
      console.log("Timer displayed successfully");
      toast.success("Timer displayed successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isManualTimer = timerData.isManual;

  const isPunctualTimer =
    !timerData.isManual &&
    timerData.durationMinutes === 0 &&
    timerData.scheduledStartTime !== null;

  const timerNeedsToStart = isExpired && timerData.status === "PENDING";
  const timerIsStarted = isExpired && timerData.status === "RUNNING";
  const timerIsCompleted = timerData.status === "COMPLETED";

  // Timer actions pulse effect when it needs to start
  // to draw attention to the admin
  // when the timer is pending and the scheduled start time has passed
  const pulseClassName = timerNeedsToStart ? " animate-pulse bg-[#A5D6A7]" : "";

  const shouldShowCountdown = !isManualTimer;

  const renderCountdown = () => {
    if (!shouldShowCountdown) {
      return null;
    }

    if (timerIsCompleted) {
      return (
        <div className="text-center">
          <div className="text-primary text-2xl font-bold">Event Completed</div>
        </div>
      );
    }

    if (timerIsStarted) {
      return (
        <div className="text-center">
          <div className="text-primary text-2xl font-bold">Event Started !</div>
        </div>
      );
    }

    if (timerNeedsToStart) {
      return (
        <div className="text-center">
          <div className="text-primary text-2xl font-bold">
            {isPunctualTimer ? "Event time reached!" : "Ready to start!"}
          </div>
        </div>
      );
    }

    // Default: show countdown (for pending timers)
    return (
      <div className="text-center">
        <TimerCountdown timeLeft={timeLeft} />
      </div>
    );
  };

  const renderStatusBadge = (status: Timer["status"]) => {
    return (
      <div className="flex justify-center gap-2">
        {isManualTimer && <StatusBadge status="MANUAL" />}
        {isPunctualTimer && <StatusBadge status="PUNCTUAL" />}
        {!isManualTimer && !isPunctualTimer && <StatusBadge status={status} />}
      </div>
    );
  };

  return (
    <Card
      className={cn(
        "mx-auto w-full max-w-2xl",
        isDemo && "overflow-hidden pt-0",
        pulseClassName,
        timerIsCompleted && "cursor-not-allowed bg-blue-100/80 opacity-60",
        isCurrent && "border-2 border-blue-400 bg-blue-100/80",
      )}
    >
      <div>
        {isDemo && (
          <div className="flex items-center justify-center bg-yellow-100 p-2 text-center text-amber-700">
            <p className="font-bold">Demo</p>
          </div>
        )}
        {isCurrent && (
          <div className="flex items-center justify-center bg-blue-100 p-2 text-center text-blue-700">
            <p className="font-bold">Currently displayed</p>
          </div>
        )}
      </div>
      <CardHeader className="text-center">
        {timerData.name && (
          <CardTitle className="text-2xl font-bold text-balance">
            {timerData.name}
          </CardTitle>
        )}
        {timerData.scheduledStartTime && (
          <div className="text-muted-foreground flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-bold">
              {formatTimezoneAgnosticDate(timerData.scheduledStartTime, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>
        )}
        {timerData.durationMinutes !== null && timerData.durationMinutes > 0 && (
          <div className="text-muted-foreground flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{timerData.durationMinutes} minutes</span>
          </div>
        )}

        {isPunctualTimer && (
          <div className="text-muted-foreground mt-4 text-sm">
            <i>Punctual Timer (no duration)</i>
          </div>
        )}
        {isManualTimer && (
          <div className="text-muted-foreground mt-4 text-sm">
            <i>Manual Timer (no scheduled start or duration)</i>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Countdown Display */}
        {!isManualTimer && renderCountdown()}

        {timerData.durationMinutes !== null &&
          timerData.durationMinutes > 0 &&
          !isCurrent && (
            <div className="flex items-center justify-center">
              <Button disabled={timerIsCompleted} onClick={() => mutateDisplayTimer()}>
                Display this timer
              </Button>
            </div>
          )}

        {/* Status Badge */}
        {renderStatusBadge(timerData.status)}

        {/* Actions */}
        <ActionList
          actions={timerData.actions}
          currentAction={currentAction}
          display="list"
          shouldPulse={timerIsStarted || timerNeedsToStart}
        />
      </CardContent>
      <CardFooter className="flex-1 items-end">
        <Button
          disabled={timerIsCompleted}
          className="mt-1 w-full"
          onClick={() => {
            // Trigger the action for the manual timer
            navigate({ to: `/dashboard/timers/${timerData.id}` });
          }}
        >
          Edit the timer
        </Button>
      </CardFooter>
    </Card>
  );
}
