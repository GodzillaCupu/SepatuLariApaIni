import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema";
import { count } from "drizzle-orm";

try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

async function checkConnection() {
  const url = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  const isTurso = url.startsWith("libsql:");

  console.log("==========================================");
  console.log("🔍 Checking Database Connection");
  console.log("==========================================");
  console.log(`Type:       ${isTurso ? "Turso Cloud (Remote)" : "Local SQLite File"}`);
  console.log(`URL:        ${url}`);
  console.log(`Auth Token: ${authToken ? "Configured (Length: " + authToken.length + ")" : "Not set"}`);
  console.log("------------------------------------------");

  if (isTurso && !authToken) {
    console.warn("⚠️ Warning: TURSO_DATABASE_URL is set to Turso (libsql://) but TURSO_AUTH_TOKEN is missing!");
  }

  try {
    const client = createClient({ url, authToken });
    const db = drizzle(client, { schema });

    console.log("⏳ Connecting and pinging database...");
    const pingResult = await client.execute("SELECT 1 as ping");
    console.log("✅ Connection successful! (Ping result:", pingResult.rows[0], ")");

    try {
      const [{ count: totalShoes }] = await db.select({ count: count() }).from(schema.shoes);
      console.log(`📊 'shoes' table found with ${totalShoes} record(s).`);
    } catch (tableErr: unknown) {
      console.warn("⚠️ Note: Table 'shoes' might not be created yet in this database.");
      console.warn("   Run 'npm run db:push' to push the schema, then 'npm run db:seed' to seed data.");
    }

    console.log("==========================================");
  } catch (err: unknown) {
    console.error("❌ Connection failed!");
    console.error(err);
    console.log("==========================================");
    process.exit(1);
  }
}

checkConnection();
