import { timerActionService } from "@/lib/services/timer-action-service";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware";

// Schémas de validation
const getNextActionSchema = z.object({
  timerId: z.string(),
  actionId: z.string().optional(),
});
const getCurrentActionSchema = z.object({ timerId: z.string() });
const startActionSchema = z.object({ actionId: z.string() });
const completeActionSchema = z.object({ actionId: z.string() });
const resetTimerActionsSchema = z.object({ timerId: z.string() });
const jumpToBeforeNextActionSchema = z.object({
  timerId: z.string(),
  secondsBefore: z.number().default(15),
});

// Query functions (GET)
export const getNextAction = createServerFn({ method: "GET" })
  .inputValidator(getNextActionSchema)
  .handler(async ({ data }) => {
    return await timerActionService.getNextAction(data.timerId, data.actionId);
  });

export const getCurrentAction = createServerFn({ method: "GET" })
  .inputValidator(getCurrentActionSchema)
  .handler(async ({ data }) => {
    return await timerActionService.getCurrentAction(data.timerId);
  });

export const getAllActionsFromWeddingDemo = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    return await timerActionService.getAllActionsFromWeddingDemo();
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

export const jumpToBeforeNextAction = createServerFn({ method: "POST" })
  .inputValidator(jumpToBeforeNextActionSchema)
  .handler(async ({ data }) => {
    return await timerActionService.jumpToBeforeNextAction(
      data.timerId,
      data.secondsBefore,
    );
  });
