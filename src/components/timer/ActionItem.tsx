import { TimerAction } from "@/lib/db/schema/timer.schema";
import { TimerStatus } from "@/lib/types/timer.type";
import { cn } from "@/lib/utils";
import { Image, ImagePlay, Video, Volume2 } from "lucide-react";
import StatusBadge from "../admin/StatusBadge";
import { Button } from "../ui/button";

type ActionItemProps = {
  action: TimerAction;
  isDemo?: boolean;
  onActionStart?: (action: TimerAction) => void;
  currentAction?: TimerAction | null;
};

const ActionItem = ({
  action,
  onActionStart,
  isDemo,
  currentAction,
}: ActionItemProps) => {
  const isCurrent = currentAction?.id === action.id;

  const renderActionIcon = (action: TimerAction) => {
    switch (action.type) {
      case "VIDEO":
        return <Video className="text-primary h-5 w-5" />;
      case "SOUND":
        return <Volume2 className="text-primary h-5 w-5" />;
      case "IMAGE":
        return <Image className="text-primary h-5 w-5" />;
      case "GALLERY":
        return <ImagePlay className="text-primary h-5 w-5" />;
      default:
        return null;
    }
  };
  const renderActionUrl = (action: TimerAction) => {
    const stringToReplace = /\/assets\/(images|sounds|videos)/;
    if (action.urls.length) {
      return (
        <ul>
          {action.urls.map((url) => (
            <li key={url}>{url.replace(stringToReplace, "")}</li>
          ))}
        </ul>
      );
    }
    if (action.url) {
      return action.url.replace(stringToReplace, "");
    }
    return "No asset found";
  };

  const renderTriggerText = (action: TimerAction) => {
    if (action.triggerOffsetMinutes === 0) {
      return <span>Triggers start at the end of the timer</span>;
    }
    if (action.triggerOffsetMinutes < 0) {
      return (
        <span>
          Trigger {Math.abs(action.triggerOffsetMinutes)} minutes before the end
        </span>
      );
    }
    return <span>Trigger manually</span>;
  };

  const getActionStatus = (action: TimerAction, isCurrent: boolean): TimerStatus => {
    if (isCurrent) {
      return action.executedAt ? "RUNNING" : "NOT_EXECUTED";
    }
    return action.executedAt ? "COMPLETED" : "NOT_EXECUTED";
  };

  return (
    <div
      className={cn(
        "bg-muted/70 flex gap-3 rounded-lg border p-3",
        isCurrent && "border-green-500 bg-green-50 dark:bg-green-950",
      )}
    >
      <div className="mt-1">{renderActionIcon(action)}</div>
      <div className="relative flex-1">
        <div className="font-medium">{action.contentEn}</div>
        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <span>
            {action.type} • {renderActionUrl(action)}
          </span>
          {action.displayDurationSec !== null && (
            <span>
              {" "}
              Display content during {action.displayDurationSec}s after the media end
            </span>
          )}
          {renderTriggerText(action)}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="mt-2"
          size="sm"
          onClick={() => {
            console.log(`Manually triggering action ${action.id}`);
            onActionStart?.(action);
          }}
        >
          Start Action
        </Button>
        <StatusBadge status={getActionStatus(action, isCurrent)} />
      </div>
    </div>
  );
};

export default ActionItem;
