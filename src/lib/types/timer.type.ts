import { Timer, TimerAction } from "../db/schema/timer.schema";

export type TimerWithActions = Timer & {
  actions: TimerAction[];
};
