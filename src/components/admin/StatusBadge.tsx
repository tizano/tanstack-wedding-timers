import type { STATUSES } from "@/lib/db/schema/timer.schema";
import { Badge } from "../ui/badge";

type TimerStatus =
  | (typeof STATUSES)[number]
  | "EXECUTED"
  | "NOT_EXECUTED"
  | "MANUAL"
  | "PUNCTUAL";

type StatusBadgeProps = {
  status: TimerStatus;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={status}>{status}</Badge>;
}
