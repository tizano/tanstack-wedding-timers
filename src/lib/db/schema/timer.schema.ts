import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import z from "zod";
import { user } from "./auth.schema";
import { weddingEvent } from "./wedding-event.schema";

export const STATUSES = ["PENDING", "RUNNING", "COMPLETED"] as const;
export const ASSET_TYPES = ["GALLERY", "IMAGE", "SOUND", "VIDEO", "IMAGE_SOUND"] as const;

// Enums
export const statusEnum = pgEnum("status", STATUSES);
export const assetTypeEnum = pgEnum("asset_type", ASSET_TYPES);

export const timer = pgTable("timer", {
  id: text("id").primaryKey(),
  weddingEventId: text("wedding_event_id")
    .notNull()
    .references(() => weddingEvent.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  scheduledStartTime: timestamp("scheduled_start_time"),
  durationMinutes: numeric("duration_minutes", { mode: "number" }).default(0), // 0 ou null = punctual (pas de countdown)

  status: statusEnum("status").default("PENDING").notNull(),
  isManual: boolean("is_manual").default(false).notNull(), // Gardé, pour trigger manuel indépendamment

  orderIndex: integer("order_index").notNull().default(0),

  createdById: text("created_by_id")
    .notNull()
    .references(() => user.id),
  lastModifiedById: text("last_modified_by_id").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const timerAction = pgTable("timer_action", {
  id: text("id").primaryKey(),
  timerId: text("timer_id")
    .notNull()
    .references(() => timer.id, { onDelete: "cascade" }),

  type: assetTypeEnum("type").notNull(), // SOUND, VIDEO, IMAGE, TEXT, GALLERY
  status: statusEnum("status").default("PENDING").notNull(),
  triggerOffsetMinutes: integer("trigger_offset_minutes").notNull().default(0), // Seulement si duration > 0, peut être négatif
  // si triggerOffsetMinutes = 0 à la fin du timer
  // si triggerOffsetMinutes < 0 avant la fin (-15 pour 15 min avant la fin du timer)
  title: text("title"),
  url: text("url"), // pour sons/vidéos/images
  urls: text("urls")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`), // pour galeries
  // Multilingue pour les textes
  contentFr: text("content_fr"),
  contentEn: text("content_en"),
  contentBr: text("content_br"),

  orderIndex: integer("order_index").notNull().default(0),
  displayDurationSec: integer("display_duration_sec"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  executedAt: timestamp("executed_at"),
});

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
  createSchemaFactory({ zodInstance: z });

export const selectTimerSchema = createSelectSchema(timer);
export const createTimerSchema = createInsertSchema(timer);
export const updateTimerSchema = createUpdateSchema(timer);

export type Timer = z.infer<typeof selectTimerSchema>;
export type NewTimer = z.infer<typeof createTimerSchema>;
export type UpdateTimer = z.infer<typeof updateTimerSchema>;

export const selectTimerActionSchema = createSelectSchema(timerAction);
export const createTimerActionSchema = createInsertSchema(timerAction);
export const updateTimerActionSchema = createUpdateSchema(timerAction);

export type TimerAction = z.infer<typeof selectTimerActionSchema>;
export type NewTimerAction = z.infer<typeof createTimerActionSchema>;
export type UpdateTimerAction = z.infer<typeof updateTimerActionSchema>;
