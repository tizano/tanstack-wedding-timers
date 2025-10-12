import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { cn } from "@/lib/utils";
import ActionItem from "./ActionItem";

type ActionListProps = {
  actions: TimerAction[];
  currentAction: TimerAction | null;
  isDemo?: boolean;
  onActionStart?: (action: TimerAction) => void;
};

export default function ActionList({
  actions,
  isDemo,
  onActionStart,
  currentAction,
}: ActionListProps) {
  if (!actions.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-center text-lg font-semibold">Scheduled Actions</h3>
      <div
        className={cn(
          "space-y-2 text-left",
          isDemo && "grid grid-cols-1 gap-2 space-y-0 xl:grid-cols-2",
        )}
      >
        {actions.map((action) => (
          <ActionItem
            key={action.id}
            action={action}
            isDemo={isDemo}
            onActionStart={onActionStart}
            currentAction={currentAction}
          />
        ))}
      </div>
    </div>
  );
}
