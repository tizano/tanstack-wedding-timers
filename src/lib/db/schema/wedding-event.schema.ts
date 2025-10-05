import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import z from "zod";
import { user } from "./auth.schema";

export const PARTICIPANT_ROLES = [
  "OWNER",
  "COORDINATOR",
  "PARTICIPANT",
  "VIEW_ONLY",
] as const;

export const participantRoleEnum = pgEnum("participant_role", PARTICIPANT_ROLES);

// Nouvelles tables pour la gestion de timing
export const weddingEvent = pgTable("wedding_event", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  location: text("location"),
  isDemo: boolean("is_demo").default(false), // Pour mode démo/reset
  currentTimerId: text("current_timer_id"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const weddingParticipant = pgTable("wedding_participant", {
  id: text("id").primaryKey(),
  weddingEventId: text("wedding_event_id")
    .notNull()
    .references(() => weddingEvent.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: participantRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
  createSchemaFactory({ zodInstance: z });

export const selectWeddingEventSchema = createSelectSchema(weddingEvent);
export const createWeddingEventSchema = createInsertSchema(weddingEvent);
export const updateWeddingEventSchema = createUpdateSchema(weddingEvent);

export type WeddingEvent = z.infer<typeof selectWeddingEventSchema>;
export type NewWeddingEvent = z.infer<typeof createWeddingEventSchema>;
export type UpdateWeddingEvent = z.infer<typeof updateWeddingEventSchema>;
