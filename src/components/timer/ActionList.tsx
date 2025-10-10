import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { Image, ImagePlay, Video, Volume2 } from "lucide-react";
import StatusBadge from "../admin/StatusBadge";
import { Button } from "../ui/button";

type ActionListProps = {
  actions: TimerAction[];
  isDemo?: boolean;
  onActionStart?: (action: TimerAction) => void;
};

export default function ActionList({ actions, isDemo, onActionStart }: ActionListProps) {
  if (!actions.length) return null;

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
    if (action.triggerOffsetMinutes === 0 && action.triggerOffsetMinutes === null) {
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

  return (
    <div className="space-y-3">
      <h3 className="text-center text-lg font-semibold">Scheduled Actions</h3>
      <div className="space-y-2 text-left">
        {actions.map((action) => (
          <div key={action.id} className="bg-muted/50 flex gap-3 rounded-lg p-3">
            <div className="mt-1">{renderActionIcon(action)}</div>
            <div className="relative flex-1">
              <div className="pr-28 font-medium">{action.contentEn}</div>
              <div className="text-muted-foreground flex flex-col gap-1 text-sm">
                <span>
                  {action.type} • {renderActionUrl(action)}
                </span>
                {action.displayDurationSec !== null && (
                  <span>
                    {" "}
                    Display content during {action.displayDurationSec}s after the media
                    end
                  </span>
                )}
                {renderTriggerText(action)}
              </div>
              {!isDemo && (
                <div className="absolute top-0 right-0">
                  <StatusBadge status={action.executedAt ? "EXECUTED" : "NOT_EXECUTED"} />
                </div>
              )}
            </div>
            {isDemo && (
              <Button
                variant="outline"
                className="mt-2"
                size="sm"
                onClick={() => {
                  console.log(`Manually triggering action ${action.id}`);
                  onActionStart?.(action);
                }}
              >
                Trigger Action
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
