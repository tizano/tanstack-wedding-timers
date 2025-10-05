import { neon, neonConfig } from "@neondatabase/serverless";
import { createServerOnlyFn } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";

import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
// neonConfig.poolQueryViaFetch = true

const sql = neon(process.env.DATABASE_URL!);

const getDatabase = createServerOnlyFn(() =>
  drizzle(sql, {
    schema,
  }),
);

export const db = getDatabase();
