import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // PostgreSQL
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("petitemaison_user"),
  DB_PASSWORD: z.string().default("PetiteMaison_P@ss2025!"),
  DB_NAME: z.string().default("petite_maison"),

  // App
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // JWT
  JWT_SECRET: z.string().default("dev-secret-change-in-production-min-32-chars!!"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
