import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { Image, ImagePlay, Video, Volume2 } from "lucide-react";
import StatusBadge from "./StatusBadge";

type ActionListProps = { actions: TimerAction[] };

export default function ActionList({ actions }: ActionListProps) {
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
  return (
    <div className="space-y-3">
      <h3 className="text-center text-lg font-semibold">Scheduled Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <div key={action.id} className="bg-muted/50 flex gap-3 rounded-lg p-3">
            <div className="mt-1">{renderActionIcon(action)}</div>
            <div className="relative flex-1">
              <div className="pr-28 font-medium">{action.contentEn}</div>
              <div className="text-muted-foreground flex flex-col gap-1 text-sm">
                <span>
                  {action.type} •{" "}
                  {action.displayDurationSec && (
                    <span> • {action.displayDurationSec}s</span>
                  )}
                </span>
                <span>{action.url}</span>
              </div>
              <div className="absolute top-0 right-0">
                <StatusBadge status={action.executedAt ? "EXECUTED" : "NOT_EXECUTED"} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
