import { db } from "@/lib/db";
import { timer } from "@/lib/db/schema/timer.schema";
import { updateWeddingEventSchema } from "@/lib/db/schema/wedding-event.schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Schéma de validation
const updateDemoWeddingEventSchema = z.object({
  ...updateWeddingEventSchema.shape,
  id: z.string(),
});

// Mutation function (POST) - Protected
export const updateDemoWeddingEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateDemoWeddingEventSchema.parse(data))
  // .middleware([authMiddleware])
  .handler(async ({ data }) => {
    // TODO: Ajouter vérification auth ici
    // const request = getWebRequest();
    // const session = await auth.api.getSession({ headers: request.headers });
    // if (!session) throw new Error('Unauthorized');

    const timers = await db
      .select()
      .from(timer)
      .where(eq(timer.weddingEventId, data.id))
      .orderBy(timer.orderIndex);

    // Update all the timers with the new scheduledStartTime set only the date to now and keep the time
    const updateAllTimers = async () => {
      // scheduledStartTime: new Date('2025-10-25T16:00:00.000Z')
      // replace the date part of the scheduledStartTime with today's date before the T

      const now = new Date();
      const todayDateString = now.toISOString().split("T")[0]; // "2025-10-25"

      for (const t of timers) {
        if (t.scheduledStartTime) {
          const newScheduledStartTime = new Date(
            todayDateString + "T" + t.scheduledStartTime.toISOString().split("T")[1],
          );
          await db
            .update(timer)
            .set({
              scheduledStartTime: newScheduledStartTime,
            })
            .where(eq(timer.id, t.id));
        }
      }
    };

    await updateAllTimers();
  });
