import { timerActionService } from "@/lib/services/timer-action-service";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware";

// Schémas de validation
const getNextActionSchema = z.object({
  timerId: z.string(),
  actionId: z.string(),
});
const startActionSchema = z.object({ actionId: z.string() });
const completeActionSchema = z.object({ actionId: z.string() });
const resetTimerActionsSchema = z.object({ timerId: z.string() });

// Query functions (GET)
export const getNextActionFromCurrent = createServerFn({ method: "GET" })
  .inputValidator(getNextActionSchema)
  .handler(async ({ data }) => {
    return await timerActionService.getNextActionFromCurrent(data.timerId, data.actionId);
  });

// Mutation functions (POST)
export const startAction = createServerFn({ method: "POST" })
  .inputValidator(startActionSchema)
  .handler(async ({ data }) => {
    return await timerActionService.startAction(data.actionId);
  });

export const completeAction = createServerFn({ method: "POST" })
  .inputValidator(completeActionSchema)
  .handler(async ({ data }) => {
    return await timerActionService.completeAction(data.actionId);
  });

export const resetTimerActions = createServerFn({ method: "POST" })
  .inputValidator(resetTimerActionsSchema)
  .middleware([authMiddleware])

  .handler(async ({ data }) => {
    return await timerActionService.resetTimerActions(data.timerId);
  });

export const resetAllTimersActions = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    return await timerActionService.resetAllTimersActions();
  });
