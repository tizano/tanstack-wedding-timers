import { TimerAction } from "@/lib/db/schema/timer.schema";
import { TimerStatus } from "@/lib/types/timer.type";
import { cn } from "@/lib/utils";
import { Image, ImagePlay, Video, Volume2 } from "lucide-react";
import { useState } from "react";
import StatusBadge from "../admin/StatusBadge";
import { Button } from "../ui/button";
import ActionCancelDialog from "./ActionCancelDialog";

type ActionItemProps = {
  action: TimerAction;
  onActionStart?: (action: TimerAction, onComplete: () => void) => void;
  currentAction?: TimerAction | null;
  shouldPulse?: boolean;
  isTimerCompleted?: boolean;
  isActionStarting?: (actionId: string) => boolean;
  onActionCancel?: (action: TimerAction, onComplete: () => void) => void;
};

const ActionItem = ({
  action,
  onActionStart,
  currentAction,
  shouldPulse = false,
  isTimerCompleted = false,
  isActionStarting,
  onActionCancel,
}: ActionItemProps) => {
  const isCurrentAction = currentAction?.id === action.id;
  const isStarting = isActionStarting?.(action.id) ?? false;
  const [isStartClicked, setIsStartClicked] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const renderActionIcon = (action: TimerAction) => {
    switch (action.type) {
      case "VIDEO":
        return <Video className="text-primary h-5 w-5" />;
      case "SOUND":
        return <Volume2 className="text-primary h-5 w-5" />;
      case "IMAGE_SOUND":
        return (
          <div className="flex flex-col gap-1">
            <Image className="text-primary h-5 w-5" />
            <Volume2 className="text-primary h-5 w-5" />
          </div>
        );
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
      return (
        <span>
          Triggers start <strong>at the end</strong> of the timer
        </span>
      );
    }
    if (action.triggerOffsetMinutes < 0) {
      return (
        <span>
          Trigger <strong>{Math.abs(action.triggerOffsetMinutes)} minutes before</strong>{" "}
          the end
        </span>
      );
    }
    return <span>Trigger manually</span>;
  };

  const getActionStatus = (action: TimerAction): TimerStatus => {
    // Utiliser directement le statut de l'action depuis la base de données
    if (action.status === "COMPLETED") {
      return "COMPLETED";
    }
    if (action.status === "RUNNING") {
      return "RUNNING";
    }
    // Si l'action est PENDING mais a été exécutée, c'est une incohérence
    // On se base sur executedAt pour les cas edge
    if (action.executedAt) {
      return "COMPLETED";
    }
    return "NOT_EXECUTED";
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = () => {
    setIsCancelling(true);
    setShowCancelDialog(false); // Fermer le dialog immédiatement
    onActionCancel?.(action, () => {
      // Callback appelé quand l'annulation est terminée (succès ou erreur)
      setIsCancelling(false);
    });
  };

  return (
    <>
      <ActionCancelDialog
        action={action}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />
      <div
        className={cn(
          "bg-muted/70 flex gap-3 rounded-lg border p-3",
          isCurrentAction && "border-green-500 bg-green-200/50 dark:bg-green-950",
          shouldPulse && "animate-pulse bg-orange-200/50 dark:bg-orange-950",
          isTimerCompleted && "items-center",
        )}
      >
        <div className={cn(!isTimerCompleted && "mt-1")}>{renderActionIcon(action)}</div>
        <div className="relative flex-1">
          <div
            className={cn(
              "font-medium",
              isTimerCompleted && "line-clamp-1 overflow-hidden text-ellipsis",
            )}
          >
            {action.contentEn}
          </div>
          {!isTimerCompleted && (
            <div className="text-muted-foreground flex flex-col gap-1 text-sm">
              <span>
                {action.type} • {renderActionUrl(action)}
              </span>
              {renderTriggerText(action)}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between gap-2">
          {action.status !== "COMPLETED" && (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setIsStartClicked(true);
                  onActionStart?.(action, () => {
                    // Callback appelé quand le démarrage est terminé (succès ou erreur)
                    setIsStartClicked(false);
                  });
                }}
                disabled={isStartClicked || isStarting || action.status === "RUNNING"}
              >
                {isStartClicked || isStarting ? "Running..." : "Start Action"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelClick}
                disabled={
                  isCancelling ||
                  (action.status !== "RUNNING" && !isStartClicked && !isStarting)
                }
              >
                {isCancelling ? "Canceling..." : "Cancel"}
              </Button>
            </div>
          )}
          <StatusBadge status={getActionStatus(action)} />
        </div>
      </div>
    </>
  );
};

export default ActionItem;
