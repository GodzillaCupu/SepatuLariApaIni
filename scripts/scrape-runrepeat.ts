import * as cheerio from "cheerio";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shoes } from "../src/db/schema";
import { RunningShoeSchema } from "../src/schemas/shoe.schema";

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

import { ShoeCategory } from "../src/types";

interface ScrapedData {
  url: string;
  categoryOverride?: ShoeCategory;
}

export async function scrapeRunRepeatShoe({ url, categoryOverride }: ScrapedData) {
  console.log(`[Scraper] Mengambil data dari: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal fetch ${url}. Status: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. Ekstrak Judul & Brand
  const rawTitle = $("h1").first().text().trim() || $("title").text().split("|")[0].trim();
  const title = rawTitle.replace(/\s+review$/i, "").trim();
  const titleParts = title.split(" ");
  const brand = titleParts[0] || "Unknown";
  const model = titleParts.slice(1).join(" ") || "Unknown";
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // 2. Helper Ekstrak Nilai Lab
  const findMetric = (keywords: string[]): string => {
    for (const kw of keywords) {
      const match = $(`*:contains("${kw}")`)
        .filter((_, el) => $(el).children().length <= 2)
        .last()
        .text()
        .trim();
      if (match) return match;
    }
    return "";
  };

  // Ekstrak Berat (gram)
  const weightText = findMetric(["Weight", "weight"]);
  const weightMatch = weightText.match(/(\d+)\s*g/i) || weightText.match(/(\d+(?:\.\d+)?)\s*oz/i);
  let weightGrams = 265;
  if (weightMatch) {
    if (weightText.includes("oz") && !weightText.includes("g")) {
      weightGrams = Math.round(parseFloat(weightMatch[1]) * 28.3495);
    } else {
      weightGrams = parseInt(weightMatch[1], 10);
    }
  }

  // Ekstrak Drop (mm)
  const dropText = findMetric(["Drop", "Heel-to-toe drop"]);
  const dropMatch = dropText.match(/(\d+(?:\.\d+)?)\s*mm/i);
  const dropMm = dropMatch ? parseFloat(dropMatch[1]) : 8;

  // Ekstrak Heel Stack & Forefoot Stack
  const heelText = findMetric(["Heel stack"]);
  const heelMatch = heelText.match(/(\d+(?:\.\d+)?)\s*mm/i);
  const heelStackMm = heelMatch ? parseFloat(heelMatch[1]) : 36;

  const forefootText = findMetric(["Forefoot stack"]);
  const forefootMatch = forefootText.match(/(\d+(?:\.\d+)?)\s*mm/i);
  const forefootStackMm = forefootMatch ? parseFloat(forefootMatch[1]) : 28;

  // 3. Pros & Cons
  const pros: string[] = [];
  $(".pros li, .good-reasons li, [class*='pros'] li").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 3) pros.push(text);
  });

  const cons: string[] = [];
  $(".cons li, .bad-reasons li, [class*='cons'] li").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 3) cons.push(text);
  });

  // 4. Verdict & Summary
  const verdictSummary =
    $("meta[name='description']").attr("content") ||
    $(".bottom-line, .verdict p").first().text().trim() ||
    `Review lab dan uji lari untuk ${brand} ${model}.`;

  // 5. Image & Category
  const imageUrl =
    $("meta[property='og:image']").attr("content") ||
    $("picture img").first().attr("src") ||
    null;

  // Deteksi kategori otomatis dari kata kunci & spesifikasi
  let category: ShoeCategory = categoryOverride || "daily_trainer";
  let subCategory: string | undefined = undefined;
  let terrain: string | undefined = "road";

  const fullText = (html + " " + title).toLowerCase();
  const hasCarbon = fullText.includes("carbon plate") || fullText.includes("carbon fiber");
  const hasPlate = hasCarbon || fullText.includes("nylon plate") || fullText.includes("tpu plate") || fullText.includes("plate");
  const isTrail = fullText.includes("trail") || fullText.includes("vibram") || fullText.includes("lugs");

  if (!categoryOverride) {
    if (isTrail) {
      terrain = "multi_ground";
      if (hasCarbon) {
        category = "trail_super_shoes";
      } else if (fullText.includes("ultra") || heelStackMm >= 35) {
        category = "trail_daily";
        subCategory = "trail_race_long";
      } else {
        category = "trail_daily";
      }
    } else if (hasCarbon || fullText.includes("super shoe")) {
      category = "super_shoes";
      subCategory = "race_long";
    } else if (fullText.includes("super trainer") || (hasPlate && fullText.includes("peba"))) {
      category = "super_trainer";
      subCategory = "speed_tempo";
    } else if (fullText.includes("tempo") || fullText.includes("speedwork") || fullText.includes("interval")) {
      category = "speed_tempo";
    } else if (fullText.includes("max cushion") || heelStackMm >= 38) {
      category = "max_cushion";
      subCategory = "recovery_run";
    } else if (fullText.includes("stability") || fullText.includes("guiderails") || fullText.includes("overpronation")) {
      category = "stability";
    } else {
      category = "daily_trainer";
      subCategory = "daily_easy";
    }
  }

  // 6. Data Objek Sesuai Zod Schema
  const isRace = category === "super_shoes" || category === "race_long" || category === "race_short";
  const isSpeed = category === "super_trainer" || category === "speed_tempo";
  const isTrailShoe = isTrail || category.startsWith("trail_");

  const shoeData = {
    id: slug,
    brand,
    model,
    releaseYear: 2024,
    category,
    subCategory,
    terrain: isTrailShoe ? terrain : "road",
    primaryUse: isRace
      ? "Marathon, Half-Marathon Race"
      : isSpeed
      ? "Tempo Runs, Speed Intervals"
      : isTrailShoe
      ? "Trail Running & Outdoor"
      : category === "max_cushion"
      ? "Recovery Runs & High Mileage"
      : "Daily Miles, Easy Runs",
    secondaryUse: "Long Runs",
    targetPaceRange: isRace
      ? "3:30 - 4:45 min/km"
      : isSpeed
      ? "4:15 - 5:30 min/km"
      : "5:30 - 7:00 min/km",
    runnerType: (category === "stability" ? "Stability" : "Neutral") as any,
    surface: isTrailShoe ? ("Trail" as const) : ("Road" as const),
    specs: {
      weightGrams,
      dropMm,
      heelStackMm,
      forefootStackMm,
      foamType: "Standard Performance Foam",
      plateType: hasCarbon ? ("Carbon Fiber" as const) : hasPlate ? ("Nylon" as const) : ("None" as const),
      cushionFeel: heelStackMm > 38 ? ("Plush" as const) : ("Balanced" as const),
    },
    verdict: {
      summary: verdictSummary.slice(0, 300),
      pros: pros.length > 0 ? pros.slice(0, 4) : ["Bantalan empuk dan stabil", "Bahan upper bernapas nyaman"],
      cons: cons.length > 0 ? cons.slice(0, 3) : ["Harga retail premium"],
    },
    imageUrl,
    sourceUrl: url,
  };

  // Validasi lewat Zod
  const validated = RunningShoeSchema.parse(shoeData);

  // 7. Simpan / Upsert ke SQLite
  const dbRecord = {
    id: validated.id,
    brand: validated.brand,
    model: validated.model,
    releaseYear: validated.releaseYear,
    category: validated.category,
    subCategory: validated.subCategory,
    terrain: validated.terrain,
    primaryUse: validated.primaryUse,
    secondaryUse: validated.secondaryUse,
    targetPaceRange: validated.targetPaceRange,
    runnerType: validated.runnerType,
    surface: validated.surface,
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
    imageUrl: validated.imageUrl,
    sourceUrl: validated.sourceUrl,
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(shoes)
    .values(dbRecord)
    .onConflictDoUpdate({
      target: shoes.id,
      set: dbRecord,
    });

  console.log(`[Scraper] Berhasil simpan sepatu: ${validated.brand} ${validated.model} (${validated.id})`);
  return validated;
}

// Support CLI run: npx tsx scripts/scrape-runrepeat.ts <url>
if (require.main === module) {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.error("Gunakan: npx tsx scripts/scrape-runrepeat.ts <url_runrepeat>");
    process.exit(1);
  }

  scrapeRunRepeatShoe({ url: urlArg })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Scraper Error]", err);
      process.exit(1);
    });
}
