import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TimerAction } from "@/lib/db/schema/timer.schema";

type ActionCancelDialogProps = {
  action: TimerAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export default function ActionCancelDialog({
  action,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: ActionCancelDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Action?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel the action "
            <strong>{action.contentEn}</strong>"?
            {action.status === "RUNNING" && (
              <span className="mt-2 block text-orange-600 dark:text-orange-400">
                This action is currently running and will be stopped immediately.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>No, keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Cancelling..." : "Yes, cancel action"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
