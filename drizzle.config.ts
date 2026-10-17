import { defineConfig } from "drizzle-kit";

// Load environment variables (.env then .env.local override)
try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

const databaseUrl = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
const isTurso = databaseUrl.startsWith("libsql:");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...(isTurso ? { driver: "turso" as const } : {}),
  dbCredentials: {
    url: databaseUrl,
    ...(isTurso && process.env.TURSO_AUTH_TOKEN
      ? { authToken: process.env.TURSO_AUTH_TOKEN }
      : {}),
  },
});

