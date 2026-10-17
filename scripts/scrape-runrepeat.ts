import * as cheerio from "cheerio";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shoes } from "../src/db/schema";
import { RunningShoeSchema } from "../src/schemas/shoe.schema";

const dbUrl = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url: dbUrl, authToken });
const db = drizzle(client);

interface ScrapedData {
  url: string;
  categoryOverride?: "daily_trainer" | "max_cushion" | "tempo_speed" | "race_day" | "trail";
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

  // Deteksi kategori otomatis dari kata kunci
  let category: "daily_trainer" | "max_cushion" | "tempo_speed" | "race_day" | "trail" =
    categoryOverride || "daily_trainer";

  const fullText = (html + " " + title).toLowerCase();
  if (!categoryOverride) {
    if (fullText.includes("trail") || fullText.includes("vibram") || fullText.includes("lugs")) {
      category = "trail";
    } else if (fullText.includes("carbon plate") || fullText.includes("marathon race") || fullText.includes("super shoe")) {
      category = "race_day";
    } else if (fullText.includes("tempo") || fullText.includes("speedwork") || fullText.includes("interval")) {
      category = "tempo_speed";
    } else if (fullText.includes("max cushion") || heelStackMm >= 40) {
      category = "max_cushion";
    }
  }

  // 6. Data Objek Sesuai Zod Schema
  const shoeData = {
    id: slug,
    brand,
    model,
    releaseYear: 2024,
    category,
    primaryUse: category === "daily_trainer" ? "Daily Miles, Easy Runs" : category === "race_day" ? "Marathon, Half-Marathon Race" : "Training & Runs",
    secondaryUse: "Long Runs",
    targetPaceRange: category === "race_day" ? "3:30 - 4:45 min/km" : category === "tempo_speed" ? "4:15 - 5:15 min/km" : "5:30 - 7:00 min/km",
    runnerType: "Neutral" as const,
    surface: category === "trail" ? ("Trail" as const) : ("Road" as const),
    specs: {
      weightGrams,
      dropMm,
      heelStackMm,
      forefootStackMm,
      foamType: "Standard Performance Foam",
      plateType: category === "race_day" ? ("Carbon Fiber" as const) : ("None" as const),
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
