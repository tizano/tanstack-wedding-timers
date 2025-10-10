import { type Timer } from "@/lib/db/schema/timer.schema";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateTimer } from "@/lib/actions/timer.action";
import { useTimerWithActions } from "@/lib/hooks/useTimerWithActions";
import { TimerWithActions } from "@/lib/types/timer.type";
import { cn, formatTimezoneAgnosticDate } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import ActionList from "../timer/ActionList";
import TimerCountdown from "../timer/TimerCountdown";
import { Button } from "../ui/button";
import StatusBadge from "./StatusBadge";

type TimerCardProps = {
  timerData: TimerWithActions;

  isDemo?: boolean;
};

export default function TimerCard({ timerData, isDemo }: TimerCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { timeLeft, isExpired } = useTimerWithActions({
    startTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes ?? 0,
    actions: timerData.actions,
    onExpire: () => {
      console.log("Timer expired for:", timerData.name);
    },
    onActionTrigger: (action) => {
      console.log("Action triggered:", action.title, action.type);
    },
  });

  const isManualTimer =
    timerData.durationMinutes === 0 && timerData.scheduledStartTime === null;

  const isPunctualTimer =
    timerData.durationMinutes === 0 && timerData.scheduledStartTime !== null;

  const timerIsPending = !isExpired && timerData.status === "PENDING";
  const timerNeedsToStart = isExpired && timerData.status === "PENDING";
  const timerIsStarted = isExpired && timerData.status === "RUNNING";
  const timerIsCompleted = isExpired && timerData.status === "COMPLETED";

  // Derived state - no need for useState
  const pulseClassName = timerNeedsToStart ? "animate-pulse bg-[#A5D6A7]" : "";

  const { mutate, isPending } = useMutation({
    mutationKey: ["updateTimer", timerData.id],
    mutationFn: async () => {
      /**
       * TODO : Call an action to startActionTimer
       * It should update the timer status to RUNNING and set the start time
       * Also, it should execute the first action immediately
       **/
      return await updateTimer({
        data: {
          id: timerData.id,
          status: "RUNNING",
        },
      });
    },
    onSuccess: () => {
      // Optionally refetch or update the timer data after mutation
      queryClient.invalidateQueries({ queryKey: ["timers"] });
      toast.success("Timer action triggered successfully!");
    },
    onError: () => {
      toast.error("Failed to trigger timer action.");
    },
  });

  const handleStartTimer = () => {
    mutate();
  };

  const renderCountdown = () => {
    if (timerIsStarted) {
      return (
        <div className="text-center">
          <div className="text-primary text-2xl font-bold">Event Started !</div>
        </div>
      );
    }
    if (timerIsPending) {
      return (
        <div className="text-center">
          <TimerCountdown timeLeft={timeLeft} />
        </div>
      );
    }
    if (timerNeedsToStart) {
      return (
        <div className="text-center">
          <div className="text-primary text-2xl font-bold">Ready to start!</div>
          <TimerCountdown timeLeft={timeLeft} />
        </div>
      );
    }
    if (timerIsCompleted) {
      return (
        <div className="text-center">
          <div className="text-primary text-2xl font-bold">Event Completed</div>
        </div>
      );
    }
    return null;
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

  const renderTriggerActionButton = () => {
    if (timerIsPending && isDemo) {
      return (
        <div className="text-muted-foreground mt-4 flex flex-col items-center text-sm">
          <Button
            className={cn("mt-1", isPending && "cursor-not-allowed opacity-50")}
            onClick={() => {
              handleStartTimer();
            }}
          >
            {isPending ? "Starting actions" : "Start timer actions"}
          </Button>
        </div>
      );
    }
    if (!isDemo && (timerIsPending || timerNeedsToStart)) {
      return (
        <div className="text-muted-foreground mt-4 flex flex-col items-center text-sm">
          <Button
            className={cn(
              "mt-1",
              (isPending || !isExpired) && "cursor-not-allowed opacity-50",
            )}
            onClick={() => {
              handleStartTimer();
            }}
          >
            {isPending ? "Starting actions" : "Start timer actions"}
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      className={cn(
        "mx-auto w-full max-w-2xl",
        isDemo && "overflow-hidden pt-0",
        pulseClassName,
        timerIsCompleted && "pointer-events-none opacity-70",
      )}
    >
      {isDemo && (
        <div className="mb-0 flex items-center justify-center bg-yellow-100 p-2 text-center text-amber-700">
          <p className="font-bold">Demo</p>
        </div>
      )}
      <CardHeader className="text-center">
        {timerData.name && (
          <CardTitle className="text-2xl font-bold text-balance">
            {timerData.name}
          </CardTitle>
        )}
        {timerData.scheduledStartTime && (
          <div className="text-muted-foreground flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
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
        {renderCountdown()}
        {/* Status Badge */}
        {renderStatusBadge(timerData.status)}

        {renderTriggerActionButton()}

        {/* Actions */}
        <ActionList actions={timerData.actions} />
      </CardContent>
      <CardFooter className="flex-1 items-end">
        <Button
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
