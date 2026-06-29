import { Pool } from "pg";
import { env } from "../config/env";
import { logger } from "../config/logger";

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  logger.error("Unexpected pool error", { error: err.message });
});

pool.on("connect", () => {
  logger.debug("New client connected to PostgreSQL");
});

export async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    logger.info("PostgreSQL connection OK");
    return true;
  } catch (err) {
    logger.error("PostgreSQL connection failed", { error: (err as Error).message });
    return false;
  }
}
