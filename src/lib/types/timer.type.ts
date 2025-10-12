import { STATUSES, Timer, TimerAction } from "../db/schema/timer.schema";

export type TimerWithActions = Timer & {
  actions: TimerAction[];
};

export type TimerStatus =
  | (typeof STATUSES)[number]
  | "EXECUTED"
  | "NOT_EXECUTED"
  | "MANUAL"
  | "PUNCTUAL";
