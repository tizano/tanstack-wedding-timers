import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DATABASE_URL_POOLER: z.url(),
    VITE_BASE_URL: z.url().default("http://localhost:5173"),
    BETTER_AUTH_SECRET: z.string().min(1),
    SEED_USER_PASSWORD: z.string().min(1),

    PUSHER_APP_ID: z.string().min(1),
    VITE_PUSHER_KEY: z.string().min(1),
    PUSHER_SECRET: z.string().min(1),
    VITE_PUSHER_CLUSTER: z.string().min(1),
    VITE_DEV_MODE: z.boolean().default(true),
  },
  runtimeEnv: process.env,
});
