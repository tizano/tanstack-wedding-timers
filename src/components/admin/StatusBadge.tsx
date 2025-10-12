import { TimerStatus } from "@/lib/types/timer.type";
import { Badge } from "../ui/badge";

type StatusBadgeProps = {
  status: TimerStatus;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={status}>{status}</Badge>;
}
