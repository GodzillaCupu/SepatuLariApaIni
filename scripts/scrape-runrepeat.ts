import * as cheerio from "cheerio";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shoes } from "../src/db/schema";
import { RunningShoeSchema } from "../src/schemas/shoe.schema";
import { ShoeCategory, PlateType } from "../src/types";

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

interface ScrapedData {
  url: string;
  categoryOverride?: ShoeCategory;
  subCategoryOverride?: ShoeCategory;
}

/**
 * Mesin Klasifikasi Otomatis Sepatu Lari.
 * Menganalisis teks artikel RunRepeat, spesifikasi lab, dan memilih:
 * 1. `category` (potensi terbesar / best fit)
 * 2. `subCategory` (potensi kedua terbesar)
 * 3. `terrain` (medan spesifik untuk trail)
 */
function classifyShoe(params: {
  brand: string;
  model: string;
  fullText: string;
  verdictSummary: string;
  pros: string[];
  cons: string[];
  heelStackMm: number;
  weightGrams: number;
  dropMm: number;
  hasCarbonPlate: boolean;
  hasNylonPlate: boolean;
  hasPlate: boolean;
}): {
  category: ShoeCategory;
  subCategory?: ShoeCategory;
  terrain: string;
  primaryUse: string;
  secondaryUse?: string;
  targetPaceRange: string;
} {
  const corpus = (
    params.brand +
    " " +
    params.model +
    " " +
    params.verdictSummary +
    " " +
    params.pros.join(" ") +
    " " +
    params.cons.join(" ") +
    " " +
    params.fullText
  ).toLowerCase();

  const isExplicitTrail =
    params.fullText.includes("/catalog/trail") ||
    params.fullText.includes('class="trail') ||
    /"Terrain","terrain"[^}]+"Trail"/i.test(params.fullText) ||
    corpus.includes("trail running shoe") ||
    corpus.includes("trail shoe");
  const isExplicitRoad =
    params.fullText.includes("/catalog/road") ||
    /"Terrain","terrain"[^}]+"Road"/i.test(params.fullText) ||
    corpus.includes("road running shoe");

  const isTrail = isExplicitTrail && !isExplicitRoad;

  const scores: Record<ShoeCategory, number> = {
    super_shoes: 0,
    super_trainer: 0,
    race_short: 0,
    race_long: 0,
    speed_tempo: 0,
    daily_trainer: 0,
    daily_easy: 0,
    long_run: 0,
    max_cushion: 0,
    recovery_run: 0,
    stability: 0,
    minimalist: 0,
    trail_super_shoes: 0,
    trail_race_short: 0,
    trail_race_long: 0,
    trail_speed: 0,
    trail_daily: 0,
    trail_long_run: 0,
    trail_recovery: 0,
    soft_ground: 0,
    firm_ground: 0,
    multi_ground: 0,
    technical_trail: 0,
    mountain_alpine: 0,
    desert_dry: 0,
    track_spikes: 0,
    cross_training: 0,
    race_day: 0,
    tempo_speed: 0,
    trail: 0,
  };

  if (isTrail) {
    // ── Trail Categories Scoring ──
    if (params.hasCarbonPlate || corpus.includes("carbon")) scores.trail_super_shoes += 50;
    if (corpus.includes("super shoe") || corpus.includes("supershoe")) scores.trail_super_shoes += 35;

    if (corpus.includes("ultra") || corpus.includes("50k") || corpus.includes("100k") || corpus.includes("100 miles") || corpus.includes("utmb")) {
      scores.trail_race_long += 60;
    }
    if (params.heelStackMm >= 33) scores.trail_race_long += 25;
    if (corpus.includes("endurance") || corpus.includes("all-day")) scores.trail_race_long += 20;

    if (corpus.includes("short trail") || corpus.includes("skyrace") || corpus.includes("short distance")) {
      scores.trail_race_short += 50;
    }
    if (params.heelStackMm <= 28) scores.trail_race_short += 25;
    if (params.weightGrams <= 235) scores.trail_race_short += 20;

    if (corpus.includes("tempo") || corpus.includes("speed") || corpus.includes("fast trail") || corpus.includes("interval")) {
      scores.trail_speed += 45;
    }
    if (params.weightGrams <= 260) scores.trail_speed += 15;

    if (corpus.includes("daily") || corpus.includes("workhorse") || corpus.includes("versatile") || corpus.includes("all-around") || corpus.includes("everyday")) {
      scores.trail_daily += 45;
    }
    if (params.heelStackMm >= 26 && params.heelStackMm <= 36) scores.trail_daily += 20;

    if (corpus.includes("long run") || corpus.includes("long distance")) scores.trail_long_run += 40;
    if (params.heelStackMm >= 32) scores.trail_long_run += 20;

    if (corpus.includes("recovery") || corpus.includes("plush trail")) scores.trail_recovery += 40;
    if (params.heelStackMm >= 36) scores.trail_recovery += 20;

    // Default minimum untuk trail workhorse jika tidak terdeteksi spesifik
    scores.trail_daily += 25;
  } else {
    // ── Road Categories Scoring ──

    // 1. Super Shoes (Trifecta: Carbon + PEBA + Stack >= 35mm + Bobot < 220g)
    if (params.hasCarbonPlate) scores.super_shoes += 50;
    if (corpus.includes("super shoe") || corpus.includes("supershoe")) scores.super_shoes += 45;
    if (corpus.includes("race day") || corpus.includes("marathon race") || corpus.includes("personal best") || corpus.includes("pr")) scores.super_shoes += 35;
    if (params.weightGrams <= 220) scores.super_shoes += 30;
    if (params.heelStackMm >= 35) scores.super_shoes += 20;
    if (params.weightGrams > 265) scores.super_shoes -= 40;
    if (!params.hasPlate) scores.super_shoes -= 50;

    // 2. Super Trainer (Plate + Super Foam + Trainer/Long Run)
    if (corpus.includes("super trainer") || corpus.includes("super-trainer")) scores.super_trainer += 65;
    if ((params.hasPlate || corpus.includes("plate")) && (corpus.includes("trainer") || corpus.includes("training") || corpus.includes("daily") || corpus.includes("workout"))) {
      scores.super_trainer += 50;
    }
    if (params.hasNylonPlate || corpus.includes("nylon plate") || corpus.includes("wave plate") || corpus.includes("peba plate")) {
      scores.super_trainer += 40;
    }
    if (corpus.includes("peba") || corpus.includes("enerzy nxt") || corpus.includes("super foam") || corpus.includes("bouncy")) {
      scores.super_trainer += 30;
    }
    if (corpus.includes("long run") || corpus.includes("tempo")) scores.super_trainer += 20;

    // 3. Speed / Tempo
    if (corpus.includes("tempo") || corpus.includes("threshold")) scores.speed_tempo += 50;
    if (corpus.includes("interval") || corpus.includes("speedwork") || corpus.includes("fartlek") || corpus.includes("track workout")) scores.speed_tempo += 45;
    if (params.weightGrams <= 245) scores.speed_tempo += 25;
    if (params.heelStackMm >= 26 && params.heelStackMm <= 34) scores.speed_tempo += 20;
    if (params.weightGrams > 285) scores.speed_tempo -= 35;

    // 4. Race Short Distance (<= 13km / 5K / 10K)
    if (corpus.includes("5k") || corpus.includes("10k") || corpus.includes("short race")) scores.race_short += 45;
    if (params.weightGrams <= 205) scores.race_short += 30;
    if (params.heelStackMm <= 33) scores.race_short += 20;

    // 5. Race Long Distance (Half / Full Marathon)
    if (corpus.includes("marathon") || corpus.includes("half marathon") || corpus.includes("21k") || corpus.includes("42k")) scores.race_long += 40;
    if (params.hasCarbonPlate) scores.race_long += 25;
    if (params.heelStackMm >= 36) scores.race_long += 20;

    // 6. Max Cushion
    if (corpus.includes("max cushion") || corpus.includes("maximalist") || corpus.includes("maximum cushioning") || corpus.includes("high stack")) scores.max_cushion += 55;
    if (corpus.includes("plush") || corpus.includes("pillowy") || corpus.includes("cloud-like") || corpus.includes("marshmallow")) scores.max_cushion += 35;
    if (params.heelStackMm >= 40) scores.max_cushion += 45;
    else if (params.heelStackMm >= 37) scores.max_cushion += 25;
    if (params.weightGrams >= 280) scores.max_cushion += 15;
    if (params.heelStackMm < 33) scores.max_cushion -= 45;

    // 7. Long Run
    if (corpus.includes("long run") || corpus.includes("long-distance") || corpus.includes("high mileage")) scores.long_run += 50;
    if (corpus.includes("marathon training") || corpus.includes("weekly long run")) scores.long_run += 35;
    if (params.heelStackMm >= 33) scores.long_run += 20;

    // 8. Recovery Run
    if (corpus.includes("recovery") || corpus.includes("recovery run") || corpus.includes("slow jog") || corpus.includes("easy day")) scores.recovery_run += 55;
    if (corpus.includes("tired legs") || corpus.includes("zone 2") || corpus.includes("conversational")) scores.recovery_run += 30;
    if (params.heelStackMm >= 36) scores.recovery_run += 20;

    // 9. Stability
    if (corpus.includes("stability") || corpus.includes("overpronation") || corpus.includes("pronation support")) scores.stability += 60;
    if (corpus.includes("guiderails") || corpus.includes("medial post") || corpus.includes("flat feet")) scores.stability += 50;

    // 10. Minimalist / Barefoot
    if (corpus.includes("barefoot") || corpus.includes("minimalist") || corpus.includes("zero drop")) scores.minimalist += 60;
    if (params.heelStackMm <= 16) scores.minimalist += 50;

    // 11. Daily / Easy Trainer (Workhorse)
    if (corpus.includes("daily trainer") || corpus.includes("daily training") || corpus.includes("workhorse")) scores.daily_trainer += 55;
    if (corpus.includes("daily miles") || corpus.includes("everyday") || corpus.includes("base mileage")) scores.daily_trainer += 40;
    if (corpus.includes("easy run") || corpus.includes("versatile") || corpus.includes("do-it-all")) scores.daily_trainer += 30;
    if (!params.hasPlate) scores.daily_trainer += 20;
    if (params.weightGrams >= 235 && params.weightGrams <= 295) scores.daily_trainer += 15;
    if (params.heelStackMm >= 28 && params.heelStackMm <= 37) scores.daily_trainer += 15;
  }

  // Terrain detection
  let terrain = "road";
  if (isTrail) {
    if (corpus.includes("mud") || corpus.includes("soft ground") || corpus.includes("boggy") || corpus.includes("wet")) {
      terrain = "soft_ground";
    } else if (corpus.includes("hardpack") || corpus.includes("dry") || corpus.includes("firm ground")) {
      terrain = "firm_ground";
    } else if (corpus.includes("technical") || corpus.includes("rocky") || corpus.includes("scree") || corpus.includes("scrambling")) {
      terrain = "technical_trail";
    } else if (corpus.includes("alpine") || corpus.includes("mountain") || corpus.includes("gore-tex") || corpus.includes("snow")) {
      terrain = "mountain_alpine";
    } else if (corpus.includes("sand") || corpus.includes("desert") || corpus.includes("gaiter")) {
      terrain = "desert_dry";
    } else {
      terrain = "multi_ground";
    }
  }

  // Urutkan skor tertinggi
  const candidateKeys = (isTrail
    ? [
        "trail_super_shoes",
        "trail_race_long",
        "trail_race_short",
        "trail_speed",
        "trail_daily",
        "trail_long_run",
        "trail_recovery",
      ]
    : [
        "super_shoes",
        "super_trainer",
        "speed_tempo",
        "race_short",
        "race_long",
        "max_cushion",
        "long_run",
        "recovery_run",
        "stability",
        "minimalist",
        "daily_trainer",
      ]) as ShoeCategory[];

  const ranked = candidateKeys
    .map((cat) => ({ category: cat, score: scores[cat] || 0 }))
    .sort((a, b) => b.score - a.score);

  const topCategory = ranked[0]?.category || (isTrail ? "trail_daily" : "daily_trainer");
  let subCategory: ShoeCategory | undefined = undefined;

  if (ranked[1] && ranked[1].score > 15 && ranked[1].category !== topCategory) {
    subCategory = ranked[1].category;
  }

  // Tentukan deskripsi use & pace range
  const isSuper = topCategory === "super_shoes" || topCategory === "trail_super_shoes";
  const isSuperTrainer = topCategory === "super_trainer";
  const isSpeed = topCategory === "speed_tempo" || topCategory === "trail_speed";
  const isRace = isSuper || topCategory === "race_long" || topCategory === "race_short";

  let primaryUse = "Daily Miles, Easy Runs";
  let secondaryUse = "Long Runs";
  let targetPaceRange = "5:15 - 6:45 min/km";

  if (isSuper) {
    primaryUse = "Race Day (10K to Marathon), Time Trials";
    secondaryUse = "Race Pace Simulation";
    targetPaceRange = "3:30 - 4:45 min/km";
  } else if (isSuperTrainer) {
    primaryUse = "Tempo Runs, Fast Long Runs, Race Simulation";
    secondaryUse = "Daily Training";
    targetPaceRange = "4:00 - 5:15 min/km";
  } else if (isSpeed) {
    primaryUse = "Intervals, Tempo Runs, Track Workouts";
    secondaryUse = "5K/10K Races";
    targetPaceRange = "4:15 - 5:30 min/km";
  } else if (topCategory === "max_cushion") {
    primaryUse = "High Mileage, Recovery Runs, Joint Protection";
    secondaryUse = "Ultra Long Runs";
    targetPaceRange = "5:45 - 7:30 min/km";
  } else if (topCategory === "recovery_run") {
    primaryUse = "Active Recovery, Post-Race Slow Jogs (Zone 1/2)";
    secondaryUse = "Easy Walking";
    targetPaceRange = "6:00 - 8:00 min/km";
  } else if (topCategory === "long_run") {
    primaryUse = "Weekly Long Runs (18km+), Marathon Prep";
    secondaryUse = "Daily Miles";
    targetPaceRange = "5:00 - 6:30 min/km";
  } else if (topCategory === "stability") {
    primaryUse = "Overpronation Support, Daily Stability Mileage";
    secondaryUse = "Long Runs";
    targetPaceRange = "5:15 - 6:45 min/km";
  } else if (isTrail) {
    primaryUse = "Trail Running, Off-Road Adventure";
    secondaryUse = "Mountain Hiking";
    targetPaceRange = "5:30 - 8:30 min/km";
  }

  return {
    category: topCategory,
    subCategory,
    terrain,
    primaryUse,
    secondaryUse,
    targetPaceRange,
  };
}

export async function scrapeRunRepeatShoe({
  url,
  categoryOverride,
  subCategoryOverride,
}: ScrapedData) {
  let response: Response | null = null;
  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
      if (response.ok) break;
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  if (!response || !response.ok) {
    const statusMsg = response ? `${response.status} ${response.statusText}` : lastError?.message || "Koneksi gagal";
    throw new Error(`Gagal fetch ${url}. Detail: ${statusMsg}`);
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

  // 5. Image & Pelat & Busa
  const imageUrl =
    $("meta[property='og:image']").attr("content") ||
    $("picture img").first().attr("src") ||
    null;

  const fullText = (html + " " + title).toLowerCase();
  const hasCarbon = fullText.includes("carbon plate") || fullText.includes("carbon fiber");
  const hasNylon = fullText.includes("nylon plate") || fullText.includes("wave plate") || fullText.includes("tpu plate");
  const hasPlate = hasCarbon || hasNylon || fullText.includes("plate: yes") || fullText.includes("plated");

  const plateType: PlateType = hasCarbon
    ? "Carbon Fiber"
    : hasNylon
    ? "Nylon"
    : hasPlate
    ? "TPU"
    : "None";

  // Deteksi nama busa
  let foamType = "Standard Performance Foam";
  if (fullText.includes("ff blast+ eco") || fullText.includes("ff blast+")) foamType = "FF BLAST+ ECO";
  else if (fullText.includes("zoomx")) foamType = "ZoomX (PEBA)";
  else if (fullText.includes("reactx")) foamType = "ReactX";
  else if (fullText.includes("pwrrun pb")) foamType = "PWRRUN PB (PEBA)";
  else if (fullText.includes("fuelcell")) foamType = "FuelCell PEBA";
  else if (fullText.includes("fresh foam x") || fullText.includes("fresh foam")) foamType = "Fresh Foam X";
  else if (fullText.includes("enerzy nxt")) foamType = "Mizuno Enerzy NXT";
  else if (fullText.includes("lightstrike pro")) foamType = "Lightstrike Pro";
  else if (fullText.includes("cmeva")) foamType = "CMEVA";
  else if (fullText.includes("dna loft")) foamType = "DNA LOFT v3";

  // 6. Jalankan Mesin Klasifikasi Otomatis
  const classified = classifyShoe({
    brand,
    model,
    fullText,
    verdictSummary,
    pros,
    cons,
    heelStackMm,
    weightGrams,
    dropMm,
    hasCarbonPlate: hasCarbon,
    hasNylonPlate: hasNylon,
    hasPlate,
  });

  const category = categoryOverride || classified.category;
  const subCategory = subCategoryOverride || classified.subCategory;
  const terrain = classified.terrain;
  const isTrailShoe = terrain !== "road" || category.startsWith("trail_");

  const shoeData = {
    id: slug,
    brand,
    model,
    releaseYear: 2024,
    category,
    subCategory,
    terrain,
    primaryUse: classified.primaryUse,
    secondaryUse: classified.secondaryUse,
    targetPaceRange: classified.targetPaceRange,
    runnerType: (category === "stability" ? "Stability" : "Neutral") as any,
    surface: isTrailShoe ? ("Trail" as const) : ("Road" as const),
    specs: {
      weightGrams,
      dropMm,
      heelStackMm,
      forefootStackMm,
      foamType,
      plateType,
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

  console.log(
    `[Scraper] ✅ Tersimpan: ${validated.brand} ${validated.model} [${validated.category}${
      validated.subCategory ? ` / ${validated.subCategory}` : ""
    }] (${validated.id})`
  );
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
