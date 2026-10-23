/**
 * audit-data.ts — cek kualitas tabel `shoes` (READ-ONLY, tidak menulis apa pun).
 *
 *   npm run db:audit            # ringkasan + daftar pelanggaran
 *   npm run db:audit -- --json  # keluaran JSON untuk script lain
 *
 * Exit code 1 bila ada pelanggaran → bisa dipakai di CI / sebelum deploy.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shoes, ShoeRecord } from "../src/db/schema";
import { RunningShoeSchema } from "../src/schemas/shoe.schema";

try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

export interface Violation {
  id: string;
  issues: string[];
}

function parseJsonArray(text: string): string[] | null {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) && v.every((x) => typeof x === "string") ? v : null;
  } catch {
    return null;
  }
}

/** Ubah satu baris DB menjadi bentuk RunningShoe lalu validasi dengan Zod yang sama dengan scraper. */
export function auditRow(row: ShoeRecord): string[] {
  const pros = parseJsonArray(row.pros);
  const cons = parseJsonArray(row.cons);
  const issues: string[] = [];
  if (!pros) issues.push("pros bukan JSON array string");
  if (!cons) issues.push("cons bukan JSON array string");

  const result = RunningShoeSchema.safeParse({
    id: row.id,
    brand: row.brand,
    model: row.model,
    releaseYear: row.releaseYear === 0 ? null : row.releaseYear,
    category: row.category,
    subCategory: row.subCategory,
    terrain: row.terrain,
    primaryUse: row.primaryUse,
    secondaryUse: row.secondaryUse,
    targetPaceRange: row.targetPaceRange,
    runnerType: row.runnerType,
    surface: row.surface,
    specs: {
      weightGrams: row.weightGrams,
      dropMm: row.dropMm,
      heelStackMm: row.heelStackMm,
      forefootStackMm: row.forefootStackMm,
      foamType: row.foamType,
      plateType: row.plateType,
      cushionFeel: row.cushionFeel,
    },
    verdict: { summary: row.verdictSummary, pros: pros ?? [], cons: cons ?? [] },
    imageUrl: row.imageUrl,
    sourceUrl: row.sourceUrl,
  });
  if (!result.success) {
    for (const i of result.error.issues) issues.push(`${i.path.join(".")}: ${i.message}`);
  }

  // Heuristik tambahan: sidik jari nilai default scraper lama.
  if (row.weightGrams === 265 && row.dropMm === 8 && row.heelStackMm === 36 && row.forefootStackMm === 28) {
    issues.push("spec = default scraper lama (265g/8/36/28)");
  }
  return issues;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const url = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  const db = drizzle(client);

  const rows = await db.select().from(shoes);
  const violations: Violation[] = [];
  for (const row of rows) {
    const issues = auditRow(row);
    if (issues.length > 0) violations.push({ id: row.id, issues });
  }

  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  const byPlate: Record<string, number> = {};
  for (const r of rows) byPlate[r.plateType] = (byPlate[r.plateType] ?? 0) + 1;

  if (asJson) {
    console.log(JSON.stringify({ url, total: rows.length, violations, byCategory, byPlate }, null, 2));
  } else {
    console.log(`DB: ${url}`);
    console.log(`Total: ${rows.length} | Bermasalah: ${violations.length} | Bersih: ${rows.length - violations.length}`);
    console.log("Kategori:", byCategory);
    console.log("Plat    :", byPlate);
    for (const v of violations) {
      console.log(`\n❌ ${v.id}`);
      for (const i of v.issues) console.log(`   - ${i}`);
    }
  }
  process.exit(violations.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
