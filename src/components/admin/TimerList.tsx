import { resetAllTimersActions } from "@/lib/actions/timer-actions.action";
import { getAllTimers } from "@/lib/actions/timer.action";
import { QUERY_KEYS } from "@/lib/constant/constant";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import EnableDemoButton from "../demo/EnableDemoButton";
import { Button } from "../ui/button";
import TimerCard from "./TimerCard";

type TimerListProps = {
  timersWithActions: Awaited<ReturnType<typeof getAllTimers>>;
  isDemo?: boolean;
};
export default function TimerList({ timersWithActions, isDemo }: TimerListProps) {
  const navigate = useNavigate();
  const resetTimers = useServerFn(resetAllTimersActions);
  const queryClient = useQueryClient();

  if (timersWithActions.length === 0) {
    return <div>No timers found.</div>;
  }

  const renderBannerDemoMode = () => {
    if (!isDemo) {
      return null;
    }
    return (
      <div
        className="mb-4 flex items-center justify-between border-l-4 border-amber-500 bg-yellow-100 p-4 text-amber-700 dark:bg-amber-700/60 dark:text-amber-200"
        role="alert"
      >
        <p className="font-bold">Demo Mode Enabled</p>
        <p>
          <span className="font-normal">
            Go to{" "}
            <Link to="/demo" target="_blank" className="underline">
              <strong>/demo</strong>
            </Link>{" "}
            on the main app
          </span>
        </p>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              resetTimers();
              queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
            }}
            className="cursor-pointer"
          >
            Reset timers actions
          </Button>
          <Button
            onClick={() =>
              navigate({
                to: "/dashboard/$weddingEventId",
                params: { weddingEventId: "wedding-event-1" },
              })
            }
            className="cursor-pointer"
          >
            Disable Demo Mode
          </Button>
        </div>
      </div>
    );
  };

  const renderDemoButtons = () => {
    if (isDemo) {
      return null;
    }
    return <EnableDemoButton />;
  };

  return (
    <>
      {renderBannerDemoMode()}
      <div className="mb-4">{renderDemoButtons()}</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {timersWithActions.map((timer) => (
          <TimerCard key={timer.id} timerData={timer} isDemo={isDemo} />
        ))}
      </div>
    </>
  );
}
