import { updateTimerSchema } from "@/lib/db/schema/timer.schema";
import { timerService } from "@/lib/services/timer-service";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware";

// Schémas de validation
const getByIdSchema = z.object({ id: z.string() });
const getCurrentTimerSchema = z.object({ weddingEventId: z.string() });
const getAllTimersSchema = z.object({ weddingEventId: z.string() });
const startWeddingDemoSchema = z.object({ weddingEventId: z.string() });
const executeActionSchema = z.object({ actionId: z.string() });
const completeTimerSchema = z.object({ timerId: z.string() });
const checkAndStartPunctualTimersSchema = z.object({ weddingEventId: z.string() });
const resetWeddingSchema = z.object({ weddingEventId: z.string() });

const updateTimerSchemaInput = z.object({
  ...updateTimerSchema.shape,
  id: z.string(),
  cascadeUpdate: z.boolean().optional(),
  originalDurationMinutes: z.number().optional(),
});

const startTimerSchema = z.object({
  timerId: z.string(),
  weddingEventId: z.string(),
});

const startPunctualOrManualTimerSchema = z.object({
  timerId: z.string(),
  weddingEventId: z.string(),
});

const jumpToTimerSchema = z.object({
  timerId: z.string(),
  secondsBeforeAction: z.number().optional().default(15),
});

// Query functions (GET) - Public
export const getTimerById = createServerFn({ method: "GET" })
  .inputValidator(getByIdSchema)
  .handler(async ({ data }) => {
    return await timerService.getById(data.id);
  });

export const getCurrentTimer = createServerFn({ method: "GET" })
  .inputValidator(getCurrentTimerSchema)
  .handler(async ({ data }) => {
    return await timerService.getCurrentTimer(data.weddingEventId);
  });

export const getAllTimers = createServerFn({ method: "GET" })
  .inputValidator(getAllTimersSchema)
  .handler(async ({ data }) => {
    return await timerService.getAllTimers(data.weddingEventId);
  });

export const updateTimer = createServerFn({ method: "POST" })
  .inputValidator(updateTimerSchemaInput)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    console.log("Data received in updateTimer:", data);

    return await timerService.updateTimer(data.id, data);
  });

export const startWeddingDemo = createServerFn({ method: "POST" })
  .inputValidator(startWeddingDemoSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.startWeddingDemo(data.weddingEventId);
  });

export const startTimer = createServerFn({ method: "POST" })
  .inputValidator(startTimerSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.startTimer(data.timerId, data.weddingEventId);
  });

export const startPunctualOrManualTimer = createServerFn({ method: "POST" })
  .inputValidator(startPunctualOrManualTimerSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.startPunctualOrManualTimer(
      data.timerId,
      data.weddingEventId,
    );
  });

export const executeAction = createServerFn({ method: "POST" })
  .inputValidator(executeActionSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.executeAction(data.actionId);
  });

export const completeTimer = createServerFn({ method: "POST" })
  .inputValidator(completeTimerSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.completeTimer(data.timerId);
  });

export const checkAndStartPunctualTimers = createServerFn({ method: "POST" })
  .inputValidator(checkAndStartPunctualTimersSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.checkAndStartPunctualTimers(data.weddingEventId);
  });

export const checkAndStartAllPunctualTimers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    return await timerService.checkAndStartAllPunctualTimers();
  });

export const resetWedding = createServerFn({ method: "POST" })
  .inputValidator(resetWeddingSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.resetWedding(data.weddingEventId);
  });

export const jumpToTimer = createServerFn({ method: "POST" })
  .inputValidator(jumpToTimerSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.jumpToTimer(data.timerId, data.secondsBeforeAction);
  });
