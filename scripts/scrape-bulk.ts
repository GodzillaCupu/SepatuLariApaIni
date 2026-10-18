/**
 * scrape-bulk.ts — Bulk scraper untuk banyak URL RunRepeat sekaligus.
 *
 * Cara pakai:
 *   1. Dari file JSON:
 *      npx tsx scripts/scrape-bulk.ts --file scripts/urls.json
 *
 *   2. Dari argumen CLI (pisah spasi):
 *      npx tsx scripts/scrape-bulk.ts https://runrepeat.com/asics-novablast-4 https://runrepeat.com/nike-pegasus-41
 *
 *   3. Dengan kategori override (hanya berlaku jika --file):
 *      Buat urls.json dengan format: [{ "url": "...", "categoryOverride": "race_day" }]
 *
 * Opsi tambahan:
 *   --concurrency <n>   Jumlah request paralel bersamaan (default: 2)
 *   --delay <ms>        Jeda antar setiap request dalam milidetik (default: 3000)
 *   --dry-run           Hanya tampilkan daftar URL tanpa scraping
 *   --file <path>       Path ke file JSON berisi daftar URL
 */

import * as path from "path";
import * as fs from "fs";
import { scrapeRunRepeatShoe } from "./scrape-runrepeat";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Category = "daily_trainer" | "max_cushion" | "tempo_speed" | "race_day" | "trail";

interface UrlEntry {
  url: string;
  categoryOverride?: Category;
}

interface JobResult {
  url: string;
  status: "success" | "failed" | "skipped";
  shoe?: string;  // "<brand> <model>"
  error?: string;
  durationMs: number;
}

// ─────────────────────────────────────────────
// Parse CLI Args
// ─────────────────────────────────────────────

function parseArgs(argv: string[]): {
  urls: UrlEntry[];
  concurrency: number;
  delayMs: number;
  dryRun: boolean;
} {
  const args = argv.slice(2);
  let concurrency = 2;
  let delayMs = 3000;
  let dryRun = false;
  const urls: UrlEntry[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--concurrency" && args[i + 1]) {
      concurrency = Math.max(1, parseInt(args[++i], 10) || 2);
    } else if (arg === "--delay" && args[i + 1]) {
      delayMs = Math.max(0, parseInt(args[++i], 10) || 3000);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--file" && args[i + 1]) {
      const filePath = path.resolve(process.cwd(), args[++i]);
      if (!fs.existsSync(filePath)) {
        console.error(`[Bulk] ❌ File tidak ditemukan: ${filePath}`);
        process.exit(1);
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error(`[Bulk] ❌ Gagal parsing JSON dari: ${filePath}`);
        process.exit(1);
      }
      // Support: array of strings atau array of objects
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string") {
            urls.push({ url: item });
          } else if (typeof item === "object" && item !== null && "url" in item) {
            urls.push(item as UrlEntry);
          }
        }
      } else {
        console.error("[Bulk] ❌ Format JSON harus berupa array.");
        process.exit(1);
      }
    } else if (arg.startsWith("http")) {
      urls.push({ url: arg });
    }
  }

  return { urls, concurrency, delayMs, dryRun };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function printSeparator() {
  console.log("─".repeat(60));
}

// ─────────────────────────────────────────────
// Worker — scrape satu URL
// ─────────────────────────────────────────────

async function scrapeOne(entry: UrlEntry, index: number, total: number): Promise<JobResult> {
  const start = Date.now();
  const label = `[${index + 1}/${total}]`;

  console.log(`\n${label} 🔍 Mulai scraping: ${entry.url}`);
  if (entry.categoryOverride) {
    console.log(`${label}    ↳ Category override: ${entry.categoryOverride}`);
  }

  try {
    const result = await scrapeRunRepeatShoe(entry);
    const durationMs = Date.now() - start;
    console.log(`${label} ✅ Selesai: ${result.brand} ${result.model} (${formatDuration(durationMs)})`);
    return {
      url: entry.url,
      status: "success",
      shoe: `${result.brand} ${result.model}`,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`${label} ❌ Gagal: ${errorMsg} (${formatDuration(durationMs)})`);
    return {
      url: entry.url,
      status: "failed",
      error: errorMsg,
      durationMs,
    };
  }
}

// ─────────────────────────────────────────────
// Concurrency Pool
// ─────────────────────────────────────────────

async function runWithConcurrency(
  entries: UrlEntry[],
  concurrency: number,
  delayMs: number
): Promise<JobResult[]> {
  const results: JobResult[] = [];
  const total = entries.length;

  // Shared index counter (closure-safe)
  let nextIndex = 0;

  async function worker(workerId: number): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= total) break;

      // Jeda antar request kecuali request pertama per worker
      if (index > 0 && delayMs > 0) {
        console.log(`[Worker-${workerId}] ⏳ Jeda ${formatDuration(delayMs)} sebelum request berikutnya...`);
        await sleep(delayMs);
      }

      const result = await scrapeOne(entries[index], index, total);
      results[index] = result;
    }
  }

  // Spawn N workers
  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  return results;
}

// ─────────────────────────────────────────────
// Print Summary
// ─────────────────────────────────────────────

function printSummary(results: JobResult[], totalMs: number) {
  printSeparator();
  console.log("\n📊 RINGKASAN HASIL SCRAPING");
  printSeparator();

  const success = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");

  console.log(`✅ Berhasil  : ${success.length}`);
  console.log(`❌ Gagal     : ${failed.length}`);
  console.log(`📦 Total     : ${results.length}`);
  console.log(`⏱  Durasi    : ${formatDuration(totalMs)}`);

  if (success.length > 0) {
    console.log("\n✅ Sepatu yang berhasil disimpan:");
    for (const r of success) {
      console.log(`   • ${r.shoe} (${formatDuration(r.durationMs)})`);
    }
  }

  if (failed.length > 0) {
    console.log("\n❌ URL yang gagal:");
    for (const r of failed) {
      console.log(`   • ${r.url}`);
      console.log(`     Error: ${r.error}`);
    }
  }

  printSeparator();
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const { urls, concurrency, delayMs, dryRun } = parseArgs(process.argv);

  if (urls.length === 0) {
    console.error(`
[Bulk] ❌ Tidak ada URL yang diberikan.

Cara penggunaan:
  # Dari file JSON:
  npx tsx scripts/scrape-bulk.ts --file scripts/urls.json

  # Langsung dari argumen CLI:
  npx tsx scripts/scrape-bulk.ts https://runrepeat.com/asics-novablast-4 https://runrepeat.com/nike-pegasus-41

  # Dengan opsi:
  npx tsx scripts/scrape-bulk.ts --concurrency 3 --delay 5000 --file scripts/urls.json
    `);
    process.exit(1);
  }

  printSeparator();
  console.log("🚀 SCRAPER BULK — RunRepeat");
  printSeparator();
  console.log(`📋 Total URL    : ${urls.length}`);
  console.log(`⚡ Concurrency  : ${concurrency} request paralel`);
  console.log(`⏳ Delay        : ${formatDuration(delayMs)} antar request`);
  if (dryRun) console.log("🔍 Mode         : DRY RUN (tidak ada data yang disimpan)");
  printSeparator();

  if (dryRun) {
    console.log("\n📋 Daftar URL yang akan di-scrape:");
    urls.forEach((entry, i) => {
      const cat = entry.categoryOverride ? ` [${entry.categoryOverride}]` : "";
      console.log(`  ${i + 1}. ${entry.url}${cat}`);
    });
    console.log(`\n[Dry Run] Selesai. Jalankan tanpa --dry-run untuk mulai scraping.`);
    return;
  }

  const startTime = Date.now();
  const results = await runWithConcurrency(urls, concurrency, delayMs);
  const totalMs = Date.now() - startTime;

  printSummary(results, totalMs);

  // Exit code non-zero jika ada yang gagal
  const anyFailed = results.some((r) => r.status === "failed");
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error("[Bulk] Fatal error:", err);
  process.exit(1);
});
