import { ShoeCategory } from "../../src/types";

/**
 * Mesin Klasifikasi Otomatis Sepatu Lari.
 * Menganalisis teks artikel RunRepeat, spesifikasi lab, dan memilih:
 * 1. `category` (potensi terbesar / best fit)
 * 2. `subCategory` (potensi kedua terbesar)
 * 3. `terrain` (medan spesifik untuk trail)
 */
export function classifyShoe(params: {
  brand: string;
  model: string;
  verdictSummary: string;
  /** Teks artikel review saja (BUKAN seluruh HTML — menu/related-shoes bikin false positive). */
  articleText?: string;
  /** Fakta terstruktur RunRepeat: "Road" | "Trail". */
  terrainFact?: string | null;
  /** Fakta "Type" mis. "Maximalist", "Lightweight". */
  typeFact?: string | null;
  /** Baris "Pace" di tabel RunRepeat, mis. ["Daily running","Tempo"]. */
  paceTags?: string[];
  /** Fakta "Arch support" mis. "Neutral" | "Stability". */
  archSupport?: string | null;
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
    (params.articleText ?? "")
  ).toLowerCase();

  const terrainFact = params.terrainFact?.toLowerCase();
  const isTrail = terrainFact
    ? terrainFact.includes("trail")
    : corpus.includes("trail running shoe") || corpus.includes("trail shoe");

  const paceTags = (params.paceTags ?? []).map((t) => t.toLowerCase());
  const typeFact = (params.typeFact ?? "").toLowerCase();
  const archSupport = (params.archSupport ?? "").toLowerCase();

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
    if (corpus.includes("race day") || corpus.includes("marathon race") || corpus.includes("personal best")) scores.super_shoes += 35;
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

  // ── Sinyal terstruktur RunRepeat (lebih tepercaya dari kata kunci teks) ──
  if (!isTrail) {
    if (paceTags.some((t) => t.includes("daily"))) scores.daily_trainer += 30;
    if (paceTags.some((t) => t.includes("tempo") || t.includes("speed"))) scores.speed_tempo += 30;
    if (paceTags.some((t) => t.includes("competition") || t.includes("race"))) {
      scores.race_short += 20;
      scores.race_long += 20;
    }
    if (typeFact.includes("maximalist")) scores.max_cushion += 30;
    if (archSupport.includes("stab") || archSupport.includes("motion control")) scores.stability += 40;
    // Syarat keras: super shoes wajib ber-plat; super trainer wajib ber-plat
    if (!params.hasPlate) {
      scores.super_shoes -= 100;
      scores.super_trainer -= 100;
    }
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
