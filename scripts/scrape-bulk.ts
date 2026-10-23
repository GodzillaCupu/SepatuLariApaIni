/**
 * scrape-bulk.ts — Bulk & Catalog Scraper untuk RunRepeat
 *
 * Cara pakai:
 *   1. Per sepatu (masukkan link spesifik):
 *      npx tsx scripts/scrape-bulk.ts https://runrepeat.com/mizuno-neo-vista-2 https://runrepeat.com/asics-novablast-4
 *
 *   2. Otomatis dari halaman katalog RunRepeat (dengan limit):
 *      npx tsx scripts/scrape-bulk.ts --catalog https://runrepeat.com/catalog/running-shoes --limit 10
 *
 *   3. Dari file JSON:
 *      npx tsx scripts/scrape-bulk.ts --file scripts/urls.json
 *
 * Opsi tambahan:
 *   --concurrency <n>   Jumlah request paralel (default: 2)
 *   --delay <ms>        Jeda antar request (default: 3000ms untuk hindari rate-limit)
 *   --limit <n>         Batas maksimal sepatu dari katalog (default: 20)
 *   --dry-run           Fetch + parse + validasi, TANPA menulis ke database
 *   --from-db           Re-scrape semua sepatu yang sudah ada di DB (pakai source_url & id lama)
 *   --report <file>     Tulis hasil (success/needs_review/failed) ke file JSON
 */

import * as path from "path";
import * as fs from "fs";
import * as cheerio from "cheerio";
import { createClient } from "@libsql/client";
import { scrapeRunRepeatShoe, NeedsReviewError } from "./scrape-runrepeat";
import { ShoeCategory } from "../src/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface UrlEntry {
  url: string;
  /** Pertahankan id lama saat re-scrape baris DB. */
  idOverride?: string;
  categoryOverride?: ShoeCategory;
  subCategoryOverride?: ShoeCategory;
}

interface JobResult {
  url: string;
  status: "success" | "failed" | "needs_review" | "skipped";
  shoe?: string;
  error?: string;
  durationMs: number;
}

// ─────────────────────────────────────────────
// Extract URLs from Catalog Page
// ─────────────────────────────────────────────

async function fetchCatalogUrls(catalogUrl: string, limit: number): Promise<UrlEntry[]> {
  console.log(`\n[Catalog] 🌐 Mengambil daftar sepatu dari katalog: ${catalogUrl}`);

  const response = await fetch(catalogUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal fetch catalog (${response.status}): ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const foundUrls = new Set<string>();

  $("a").each((_, el) => {
    let href = $(el).attr("href");
    if (!href) return;

    if (href.startsWith("/")) {
      href = `https://runrepeat.com${href}`;
    }

    const match = href.match(/^https:\/\/runrepeat\.com\/([a-z0-9]+(?:-[a-z0-9]+)+)$/i);
    if (match) {
      const slug = match[1].toLowerCase();
      const ignoredPrefixes = [
        "catalog",
        "guides",
        "ranking",
        "rankings",
        "best",
        "compare",
        "deals",
        "reviews",
        "about",
        "contact",
        "privacy-policy",
        "terms-of-use",
        "newsletter",
        "brand",
      ];
      const isIgnored = ignoredPrefixes.some((prefix) => slug === prefix || slug.startsWith(`${prefix}-`));
      if (!isIgnored) {
        foundUrls.add(href.split("#")[0].split("?")[0]);
      }
    }
  });

  const urlList = Array.from(foundUrls).slice(0, limit);
  console.log(`[Catalog] Ditemukan ${foundUrls.size} link sepatu unik. Diambil ${urlList.length} sepatu sesuai limit (${limit}).\n`);
  return urlList.map((url) => ({ url }));
}

// ─────────────────────────────────────────────
// Parse CLI Args
// ─────────────────────────────────────────────

async function parseArgs(argv: string[]): Promise<{
  urls: UrlEntry[];
  concurrency: number;
  delayMs: number;
  dryRun: boolean;
  reportPath: string | null;
}> {
  const args = argv.slice(2);
  let concurrency = 2;
  let delayMs = 3000;
  let dryRun = false;
  let catalogLimit = 20;
  let catalogUrl: string | null = null;
  let fromDb = false;
  let reportPath: string | null = null;
  const urls: UrlEntry[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--concurrency" && args[i + 1]) {
      concurrency = Math.max(1, parseInt(args[++i], 10) || 2);
    } else if (arg === "--delay" && args[i + 1]) {
      delayMs = Math.max(0, parseInt(args[++i], 10) || 3000);
    } else if (arg === "--limit" && args[i + 1]) {
      catalogLimit = Math.max(1, parseInt(args[++i], 10) || 20);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--from-db") {
      fromDb = true;
    } else if (arg === "--report" && args[i + 1]) {
      reportPath = args[++i];
    } else if (arg === "--catalog" && args[i + 1]) {
      catalogUrl = args[++i];
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

  if (fromDb) {
    const dbUrl = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
    const dbClient = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
    const res = await dbClient.execute("SELECT id, source_url FROM shoes ORDER BY id");
    for (const row of res.rows) {
      const sourceUrl = String(row.source_url);
      if (/^https:\/\/runrepeat\.com\//.test(sourceUrl)) {
        urls.push({ url: sourceUrl, idOverride: String(row.id) });
      } else {
        console.warn(`[From-DB] ⚠️  ${row.id}: source_url tidak valid (${sourceUrl}) → perlu review manual`);
      }
    }
    console.log(`[From-DB] ${urls.length} URL dimuat dari ${dbUrl}`);
  }

  if (catalogUrl) {
    try {
      const catalogEntries = await fetchCatalogUrls(catalogUrl, catalogLimit);
      urls.push(...catalogEntries);
    } catch (err) {
      console.error(`[Catalog Error] Gagal memuat katalog:`, err);
    }
  }

  return { urls, concurrency, delayMs, dryRun, reportPath };
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
// Worker — Scrape Satu Sepatu
// ─────────────────────────────────────────────

async function scrapeOne(
  entry: UrlEntry,
  index: number,
  total: number,
  dryRun: boolean
): Promise<JobResult> {
  const start = Date.now();
  const label = `[${index + 1}/${total}]`;

  console.log(`\n${label} 🔍 Scraping: ${entry.url}`);

  try {
    const result = await scrapeRunRepeatShoe({ ...entry, dryRun });
    const durationMs = Date.now() - start;
    console.log(
      `${label} ✅ Berhasil: ${result.brand} ${result.model} -> [${result.category}${
        result.subCategory ? ` / ${result.subCategory}` : ""
      }] (${formatDuration(durationMs)})`
    );
    return {
      url: entry.url,
      status: "success",
      shoe: `${result.brand} ${result.model}`,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    if (err instanceof NeedsReviewError) {
      console.warn(`${label} ⚠️  Perlu review: ${err.reasons.join("; ")}`);
      return { url: entry.url, status: "needs_review", error: err.reasons.join("; "), durationMs };
    }
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
  delayMs: number,
  dryRun: boolean
): Promise<JobResult[]> {
  const results: JobResult[] = [];
  const total = entries.length;
  let nextIndex = 0;

  async function worker(workerId: number): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= total) break;

      if (index > 0 && delayMs > 0) {
        console.log(`[Worker-${workerId}] ⏳ Jeda ${formatDuration(delayMs)}...`);
        await sleep(delayMs);
      }

      const res = await scrapeOne(entries[index], index, total, dryRun);
      results.push(res);
    }
  }

  const workerCount = Math.min(concurrency, total);
  const workers = Array.from({ length: workerCount }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  return results;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const { urls, concurrency, delayMs, dryRun, reportPath } = await parseArgs(process.argv);

  if (urls.length === 0) {
    console.log(`
ℹ️  RunRepeat Shoe & Catalog Scraper

Pilihan Pemakaian:
  1. Per Sepatu (satu atau banyak link):
     npx tsx scripts/scrape-bulk.ts https://runrepeat.com/mizuno-neo-vista-2 https://runrepeat.com/asics-novablast-4

  2. Otomatis dari Katalog RunRepeat:
     npx tsx scripts/scrape-bulk.ts --catalog https://runrepeat.com/catalog/running-shoes --limit 10

  3. Dari File Daftar URL:
     npx tsx scripts/scrape-bulk.ts --file scripts/urls.json

Opsi:
  --concurrency <n>   Jumlah request paralel (default: 2)
  --delay <ms>        Jeda antar request (default: 3000ms)
  --limit <n>         Batas jumlah sepatu dari katalog (default: 20)
  --dry-run           Fetch + parse + validasi tanpa menulis ke DB
  --from-db           Re-scrape semua sepatu yang sudah ada di DB
  --report <file>     Simpan hasil ke file JSON

  4. Perbaiki data lama di DB (disarankan: --dry-run dulu):
     npx tsx scripts/scrape-bulk.ts --from-db --dry-run --report scripts/report.json
`);
    process.exit(0);
  }

  printSeparator();
  console.log(`🚀 Memulai Bulk Scraping: ${urls.length} target URL`);
  console.log(`   Concurrency: ${concurrency} | Delay: ${formatDuration(delayMs)}`);
  if (dryRun) console.log("   ⚠️  MODE: DRY-RUN (fetch + validasi, TIDAK menulis database)");
  printSeparator();

  const startTime = Date.now();
  const results = await runWithConcurrency(urls, concurrency, delayMs, dryRun);
  const totalDuration = Date.now() - startTime;

  // Ringkasan
  const success = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const needsReview = results.filter((r) => r.status === "needs_review").length;

  printSeparator();
  console.log(`📊 Ringkasan Selesai (${formatDuration(totalDuration)}):`);
  console.log(`   ✅ Berhasil: ${success}/${urls.length}`);
  if (needsReview > 0) {
    console.log(`   ⚠️  Perlu review: ${needsReview}/${urls.length}`);
  }
  if (failed > 0) {
    console.log(`   ❌ Gagal:    ${failed}/${urls.length}`);
  }
  if (reportPath) {
    fs.writeFileSync(path.resolve(process.cwd(), reportPath), JSON.stringify(results, null, 2));
    console.log(`   📝 Laporan: ${reportPath}`);
  }
  printSeparator();

  process.exit(failed > 0 && success === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[Fatal Error]", err);
  process.exit(1);
});
