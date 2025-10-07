import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_BASE_URL: z.url().default("http://localhost:5173"),

    VITE_PUSHER_KEY: z.string().min(1),
    VITE_PUSHER_CLUSTER: z.string().min(1),
    VITE_DEV_MODE: z.boolean().default(true),
  },
  runtimeEnv: import.meta.env,
});
