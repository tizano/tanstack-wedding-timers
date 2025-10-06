import { getAllTimers } from "@/lib/actions/timer.action";
import { Link, useNavigate } from "@tanstack/react-router";
import EnableDemoButton from "../demo/EnableDemoButton";
import { Button } from "../ui/button";
import TimerCard from "./TimerCard";

type TimerListProps = {
  timersWithActions: Awaited<ReturnType<typeof getAllTimers>>;
  isDemo?: boolean;
};
export default function TimerList({ timersWithActions, isDemo }: TimerListProps) {
  const navigate = useNavigate();

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
          <TimerCard
            key={timer.id}
            timerData={timer}
            actionsData={timer.actions}
            isDemo={isDemo}
          />
        ))}
      </div>
    </>
  );
}
