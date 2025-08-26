import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { DbPool } from "@vercel/functions/db-connections";

export const pool = new Pool({
  idleTimeoutMillis: 5000,
  min: 1,
  connectionString: process.env.DB_URL,
});

// Attach the pool to ensure idle connections close before suspension
attachDatabasePool(pool as DbPool);
