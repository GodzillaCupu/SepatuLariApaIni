import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shoes } from "../src/db/schema";
import { RunningShoeSchema, RunningShoeInput } from "../src/schemas/shoe.schema";
import { ShoeCategory } from "../src/types";
import { classifyShoe } from "./lib/classify-shoe";
import { parseRunRepeatHtml, ParsedPage } from "./lib/runrepeat-parser";

try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

const dbUrl = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url: dbUrl, authToken });
const db = drizzle(client);

export interface ScrapedData {
  url: string;
  categoryOverride?: ShoeCategory;
  subCategoryOverride?: ShoeCategory;
  /** Pertahankan id lama (mis. saat re-scrape baris yang sudah ada di DB). */
  idOverride?: string;
  /** Parse + validasi saja, jangan tulis ke DB. */
  dryRun?: boolean;
}

/** Halaman berhasil di-fetch tapi datanya tidak lengkap/tidak masuk akal → butuh review manual. */
export class NeedsReviewError extends Error {
  constructor(public url: string, public reasons: string[]) {
    super(`needs_review ${url}: ${reasons.join("; ")}`);
    this.name = "NeedsReviewError";
  }
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function fetchHtml(url: string): Promise<string> {
  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(30_000), // jangan pernah hang selamanya
      });
      if (response.ok) break;
      // 404 tidak akan sembuh dengan retry
      if (response.status === 404) break;
    } catch (err) {
      lastError = err;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
  }

  if (!response || !response.ok) {
    const statusMsg = response
      ? `${response.status} ${response.statusText}`
      : lastError instanceof Error
      ? lastError.message
      : "Koneksi gagal";
    throw new Error(`Gagal fetch ${url}. Detail: ${statusMsg}`);
  }
  return response.text();
}

/**
 * Fungsi murni: HTML → data sepatu tervalidasi. Tanpa default diam-diam:
 * metrik wajib yang tidak ketemu → NeedsReviewError (tidak boleh masuk DB).
 */
export function buildShoeFromPage(
  page: ParsedPage,
  opts: Pick<ScrapedData, "url" | "categoryOverride" | "subCategoryOverride" | "idOverride">
): RunningShoeInput {
  const missing: string[] = [];
  if (!page.brand) missing.push("brand");
  if (!page.model) missing.push("model");
  if (page.weightGrams === null) missing.push("weight");
  if (page.dropMm === null) missing.push("drop");
  if (page.heelStackMm === null) missing.push("heel stack");
  if (page.forefootStackMm === null) missing.push("forefoot stack");
  if (missing.length > 0) throw new NeedsReviewError(opts.url, [`spec tidak ditemukan: ${missing.join(", ")}`]);

  const weightGrams = page.weightGrams as number;
  const dropMm = page.dropMm as number;
  const heelStackMm = page.heelStackMm as number;
  const forefootStackMm = page.forefootStackMm as number;
  const brand = page.brand as string;
  const model = page.model as string;

  const hasCarbon = page.plateType === "Carbon Fiber";
  const hasNylon = page.plateType === "Nylon";
  const hasPlate = page.plateType !== "None";

  const classified = classifyShoe({
    brand,
    model,
    verdictSummary: page.summary,
    articleText: page.articleText,
    terrainFact: page.terrain,
    typeFact: page.type,
    paceTags: page.paceTags,
    archSupport: page.archSupport,
    pros: page.pros,
    cons: page.cons,
    heelStackMm,
    weightGrams,
    dropMm,
    hasCarbonPlate: hasCarbon,
    hasNylonPlate: hasNylon,
    hasPlate,
  });

  const category = opts.categoryOverride || classified.category;
  const subCategory = opts.subCategoryOverride || classified.subCategory;
  const terrain = classified.terrain;
  const isTrailShoe = terrain !== "road" || category.startsWith("trail_");

  const softness = (page.softness ?? "").toLowerCase();
  const cushionFeel = softness.includes("soft")
    ? ("Plush" as const)
    : softness.includes("firm")
    ? ("Firm" as const)
    : ("Balanced" as const);

  const arch = (page.archSupport ?? "").toLowerCase();
  const shoeData = {
    id: opts.idOverride || slugify(page.title),
    brand,
    model,
    releaseYear: page.releaseYear,
    category,
    subCategory: subCategory ?? null,
    terrain,
    primaryUse: classified.primaryUse,
    secondaryUse: classified.secondaryUse ?? null,
    targetPaceRange: classified.targetPaceRange,
    runnerType: arch.includes("stab") || category === "stability" ? ("Stability" as const) : ("Neutral" as const),
    surface: isTrailShoe ? ("Trail" as const) : ("Road" as const),
    sizing: page.sizing,
    lengthFit: page.lengthFit,
    widthFit: page.widthFit,
    fitVotes: page.fitVotes,
    breathability: page.breathability,
    upperMaterial: page.upperMaterial,
    specs: {
      weightGrams,
      dropMm,
      heelStackMm,
      forefootStackMm,
      foamType: page.foamType ?? "Tidak disebutkan",
      plateType: page.plateType,
      cushionFeel,
    },
    verdict: {
      summary: page.summary || `Review lab dan uji lari untuk ${brand} ${model}.`,
      pros: page.pros.slice(0, 4),
      cons: page.cons.slice(0, 3),
    },
    imageUrl: page.imageUrl,
    sourceUrl: opts.url,
  };

  const parsed = RunningShoeSchema.safeParse(shoeData);
  if (!parsed.success) {
    throw new NeedsReviewError(
      opts.url,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }
  return parsed.data;
}

export async function scrapeRunRepeatShoe(input: ScrapedData) {
  const html = await fetchHtml(input.url);
  const page = parseRunRepeatHtml(html);
  const validated = buildShoeFromPage(page, input);

  if (input.dryRun) {
    console.log(
      `[Scraper] 🧪 Dry-run OK: ${validated.brand} ${validated.model} [${validated.category}] ` +
        `${validated.sizing}/${validated.breathability} ${validated.specs.weightGrams}g drop ${validated.specs.dropMm} stack ${validated.specs.heelStackMm}/${validated.specs.forefootStackMm} plat ${validated.specs.plateType}`
    );
    return validated;
  }

  // Semua kolom opsional dinormalisasi ke null (JANGAN undefined — drizzle bisa menggeser kolom).
  const dbRecord = {
    id: validated.id,
    brand: validated.brand,
    model: validated.model,
    releaseYear: validated.releaseYear ?? 0, // 0 = tahun tidak diketahui (kolom NOT NULL)
    category: validated.category,
    subCategory: validated.subCategory ?? null,
    terrain: validated.terrain ?? null,
    primaryUse: validated.primaryUse,
    secondaryUse: validated.secondaryUse ?? null,
    targetPaceRange: validated.targetPaceRange,
    runnerType: validated.runnerType,
    surface: validated.surface,
    sizing: validated.sizing,
    lengthFit: validated.lengthFit,
    widthFit: validated.widthFit,
    fitVotes: validated.fitVotes ?? null,
    breathability: validated.breathability,
    upperMaterial: validated.upperMaterial ?? null,
    weightGrams: validated.specs.weightGrams,
    dropMm: validated.specs.dropMm,
    heelStackMm: validated.specs.heelStackMm,
    forefootStackMm: validated.specs.forefootStackMm,
    foamType: validated.specs.foamType,
    plateType: validated.specs.plateType,
    cushionFeel: validated.specs.cushionFeel,
    verdictSummary: validated.verdict.summary,
    pros: JSON.stringify(validated.verdict.pros),
    cons: JSON.stringify(validated.verdict.cons),
    imageUrl: validated.imageUrl ?? null,
    sourceUrl: validated.sourceUrl,
    updatedAt: new Date().toISOString(),
  };

  await db.insert(shoes).values(dbRecord).onConflictDoUpdate({ target: shoes.id, set: dbRecord });

  console.log(
    `[Scraper] ✅ Tersimpan: ${validated.brand} ${validated.model} [${validated.category}${
      validated.subCategory ? ` / ${validated.subCategory}` : ""
    }] (${validated.id})`
  );
  return validated;
}

// Support CLI run: npx tsx scripts/scrape-runrepeat.ts <url> [--dry-run]
if (require.main === module) {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.error("Gunakan: npx tsx scripts/scrape-runrepeat.ts <url_runrepeat> [--dry-run]");
    process.exit(1);
  }

  scrapeRunRepeatShoe({ url: urlArg, dryRun: process.argv.includes("--dry-run") })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Scraper Error]", err);
      process.exit(1);
    });
}
