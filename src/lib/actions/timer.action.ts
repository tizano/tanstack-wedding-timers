import { updateTimerSchema } from "@/lib/db/schema/timer.schema";
import { timerService } from "@/lib/services/timer-service";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware";

// Schémas de validation
const getByIdSchema = z.object({ id: z.string() });
const getCurrentTimerSchema = z.object({ weddingEventId: z.string() });
const getAllTimersSchema = z.object({ weddingEventId: z.string() });
const startWeddingDemoSchema = z.object({
  weddingEventId: z.string(),
  weddingEventIdToCopyFrom: z.string(),
});
const completeTimerSchema = z.object({ timerId: z.string() });
const resetWeddingSchema = z.object({
  weddingEventId: z.string(),
  weddingEventIdToCopyFrom: z.string(),
});

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

// Query functions (GET) - Public
export const getTimerById = createServerFn({ method: "GET" })
  .inputValidator(getByIdSchema)
  .handler(async ({ data }) => {
    const timer = await timerService.getById(data.id);
    return timer || null;
  });

export const getCurrentTimer = createServerFn({ method: "GET" })
  .inputValidator(getCurrentTimerSchema)
  .handler(async ({ data }) => {
    const currentTimer = await timerService.getCurrentTimer(data.weddingEventId);
    return currentTimer || null;
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
    return await timerService.updateTimer(data.id, data);
  });

export const startWeddingDemo = createServerFn({ method: "POST" })
  .inputValidator(startWeddingDemoSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.startWeddingDemo(
      data.weddingEventId,
      data.weddingEventIdToCopyFrom,
    );
  });

export const startTimer = createServerFn({ method: "POST" })
  .inputValidator(startTimerSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.startTimer(data.timerId, data.weddingEventId);
  });

export const completeTimer = createServerFn({ method: "POST" })
  .inputValidator(completeTimerSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.completeTimer(data.timerId);
  });

export const resetWedding = createServerFn({ method: "POST" })
  .inputValidator(resetWeddingSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return await timerService.resetWeddingFromNormal(
      data.weddingEventId,
      data.weddingEventIdToCopyFrom,
    );
  });
