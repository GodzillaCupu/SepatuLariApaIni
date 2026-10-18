import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shoes, NewShoeRecord } from "../src/db/schema";

try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

const dbUrl = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log(`[Seed] Target Database: ${dbUrl.startsWith("libsql:") ? "Turso Cloud (" + dbUrl + ")" : dbUrl}`);

const client = createClient({ url: dbUrl, authToken });
const db = drizzle(client);

const initialShoes: NewShoeRecord[] = [
  {
    id: "asics-novablast-4",
    brand: "Asics",
    model: "Novablast 4",
    releaseYear: 2024,
    category: "daily_trainer",
    subCategory: "long_run",
    terrain: "road",
    primaryUse: "Daily Miles, Recovery, Long Runs",
    secondaryUse: "Tempo Runs",
    targetPaceRange: "5:00 - 6:30 min/km",
    runnerType: "Neutral",
    surface: "Road",
    weightGrams: 260,
    dropMm: 8.5,
    heelStackMm: 41.2,
    forefootStackMm: 32.7,
    foamType: "FF BLAST+ ECO",
    plateType: "None",
    cushionFeel: "Plush",
    verdictSummary:
      "Sepatu lari harian terbaik dengan pantulan energi tinggi dan bantalan tebal yang melindungi sendi kaki.",
    pros: JSON.stringify([
      "Bantalan FF Blast+ Eco sangat empuk & responsif",
      "Transisi kaki mulus berkat geometri rocker",
      "Outsole AHAR+ awet hingga 800+ km",
    ]),
    cons: JSON.stringify([
      "Agak tinggi dan kurang stabil saat belokan tajam",
      "Terasa hangat di cuaca tropis",
    ]),
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    sourceUrl: "https://runrepeat.com/asics-novablast-4",
  },
  {
    id: "nike-pegasus-41",
    brand: "Nike",
    model: "Pegasus 41",
    releaseYear: 2024,
    category: "daily_trainer",
    subCategory: "daily_easy",
    terrain: "road",
    primaryUse: "Daily Training, Easy Runs",
    secondaryUse: "Short Intervals",
    targetPaceRange: "5:15 - 7:00 min/km",
    runnerType: "Neutral",
    surface: "Road",
    weightGrams: 282,
    dropMm: 11.4,
    heelStackMm: 37.2,
    forefootStackMm: 25.8,
    foamType: "ReactX + Dual Air Zoom",
    plateType: "None",
    cushionFeel: "Balanced",
    verdictSummary:
      "Kuda beban legendaris Nike yang kini menggunakan busa ReactX baru dengan penghematan energi lebih baik.",
    pros: JSON.stringify([
      "Busa ReactX lebih lembut dari Pegasus 40",
      "Kombinasi dual Zoom Air memberi dorongan stabil",
      "Durabilitas outsole waffle tak tertandingi",
    ]),
    cons: JSON.stringify([
      "Bobot 282g sedikit lebih berat dari kompetitor",
      "Bantalan forefoot terasa standar",
    ]),
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
    sourceUrl: "https://runrepeat.com/nike-pegasus-41",
  },
  {
    id: "saucony-endorphin-speed-4",
    brand: "Saucony",
    model: "Endorphin Speed 4",
    releaseYear: 2024,
    category: "super_trainer",
    subCategory: "speed_tempo",
    terrain: "road",
    primaryUse: "Tempo Runs, Intervals, Half Marathon",
    secondaryUse: "Daily Miles",
    targetPaceRange: "4:15 - 5:30 min/km",
    runnerType: "Neutral",
    surface: "Road",
    weightGrams: 233,
    dropMm: 8.5,
    heelStackMm: 36.0,
    forefootStackMm: 27.5,
    foamType: "PWRRUN PB (PEBA)",
    plateType: "Nylon",
    cushionFeel: "Balanced",
    verdictSummary:
      "Raja sepatu tempo & super trainer. Plat nilon fleksibel dengan busa super PWRRUN PB menghadirkan kecepatan tanpa mengorbankan kenyamanan harian.",
    pros: JSON.stringify([
      "Pelat nilon berwing memberi dorongan tanpa kaku",
      "Busa PWRRUN PB sangat ringan dan bertenaga",
      "Upper jala sangat sejuk untuk cuaca panas",
    ]),
    cons: JSON.stringify([
      "Outsole tipis kurang cocok untuk jalanan berbatu",
      "Kerah tumit butuh runner's knot agar tidak slip",
    ]),
    imageUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80",
    sourceUrl: "https://runrepeat.com/saucony-endorphin-speed-4",
  },
  {
    id: "nike-vaporfly-3",
    brand: "Nike",
    model: "Vaporfly 3",
    releaseYear: 2023,
    category: "super_shoes",
    subCategory: "race_long",
    terrain: "road",
    primaryUse: "10K to Marathon Race Day",
    secondaryUse: "Time Trial",
    targetPaceRange: "3:30 - 4:45 min/km",
    runnerType: "Neutral",
    surface: "Road",
    weightGrams: 181,
    dropMm: 8.3,
    heelStackMm: 39.5,
    forefootStackMm: 31.2,
    foamType: "ZoomX (PEBA)",
    plateType: "Carbon Fiber",
    cushionFeel: "Plush",
    verdictSummary:
      "Super shoe pemecah rekor. Bobot ultra ringan 181 gram dengan pelat karbon agresif dan busa ZoomX paling membal.",
    pros: JSON.stringify([
      "Bobot super ringan hanya 181 gram",
      "Efisiensi energi dan dorongan pelat karbon maksimal",
      "Upper Flyknit sangat tipis dan bernapas",
    ]),
    cons: JSON.stringify([
      "Durabilitas terbatas (usia optimal 300-400 km)",
      "Sangat tidak stabil saat berjalan lambat",
    ]),
    imageUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
    sourceUrl: "https://runrepeat.com/nike-vaporfly-3",
  },
  {
    id: "asics-gel-nimbus-26",
    brand: "Asics",
    model: "Gel-Nimbus 26",
    releaseYear: 2024,
    category: "max_cushion",
    subCategory: "recovery_run",
    terrain: "road",
    primaryUse: "Recovery Run, Zone 2 Easy, Ultra Long Run",
    secondaryUse: "Walking & Standing",
    targetPaceRange: "6:00 - 8:00 min/km",
    runnerType: "Neutral",
    surface: "Road",
    weightGrams: 304,
    dropMm: 8.4,
    heelStackMm: 40.5,
    forefootStackMm: 32.1,
    foamType: "FF BLAST+ ECO & PureGEL",
    plateType: "None",
    cushionFeel: "Plush",
    verdictSummary:
      "Bantalan awan maksimal untuk lari pemulihan. PureGEL tersembunyi meredam hentakan tumit saat kaki lelah.",
    pros: JSON.stringify([
      "Kenyamanan tingkat tertinggi untuk lari santai",
      "Outsole hybrid grip lebih pakem di jalan basah",
      "Kerah rajut lembut memeluk pergelangan kaki",
    ]),
    cons: JSON.stringify([
      "Berat di atas 300 gram",
      "Kurang responsif jika ingin mempercepat pace",
    ]),
    imageUrl: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80",
    sourceUrl: "https://runrepeat.com/asics-gel-nimbus-26",
  },
  {
    id: "hoka-speedgoat-5",
    brand: "Hoka",
    model: "Speedgoat 5",
    releaseYear: 2023,
    category: "trail_daily",
    subCategory: "trail_race_long",
    terrain: "multi_ground",
    primaryUse: "Technical Trail, Ultra Trail",
    secondaryUse: "Mountain Hiking",
    targetPaceRange: "5:30 - 8:30 min/km",
    runnerType: "Neutral",
    surface: "Trail",
    weightGrams: 276,
    dropMm: 4.0,
    heelStackMm: 33.0,
    forefootStackMm: 29.0,
    foamType: "CMEVA Foam",
    plateType: "None",
    cushionFeel: "Balanced",
    verdictSummary:
      "Kambing gunung teruji di medan trail. Outsole Vibram Megagrip dengan lug 5mm mencengkeram kuat di lumpur maupun bebatuan curam.",
    pros: JSON.stringify([
      "Vibram Megagrip dengan Traction Lug sangat pakem",
      "Bantalan empuk melindungi kaki di turunan curam",
      "Toe cap kokoh melindungi jari dari benturan batu",
    ]),
    cons: JSON.stringify([
      "Upper jala agak lambat mengalirkan air saat basah",
      "Toe box agak sempit untuk kaki lebar",
    ]),
    imageUrl: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=600&auto=format&fit=crop&q=80",
    sourceUrl: "https://runrepeat.com/hoka-speedgoat-5",
  },
];

async function seed() {
  console.log(`[Seed] Memulai seeding ${initialShoes.length} sepatu ke database...`);

  // Buat tabel jika belum ada
  await client.execute(`
    CREATE TABLE IF NOT EXISTS shoes (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      release_year INTEGER NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT,
      terrain TEXT,
      primary_use TEXT NOT NULL,
      secondary_use TEXT,
      target_pace_range TEXT NOT NULL,
      runner_type TEXT NOT NULL DEFAULT 'Neutral',
      surface TEXT NOT NULL DEFAULT 'Road',
      weight_grams REAL NOT NULL,
      drop_mm REAL NOT NULL,
      heel_stack_mm REAL NOT NULL,
      forefoot_stack_mm REAL NOT NULL,
      foam_type TEXT NOT NULL,
      plate_type TEXT NOT NULL DEFAULT 'None',
      cushion_feel TEXT NOT NULL DEFAULT 'Balanced',
      verdict_summary TEXT NOT NULL,
      pros TEXT NOT NULL,
      cons TEXT NOT NULL,
      image_url TEXT,
      source_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  for (const shoe of initialShoes) {
    await db
      .insert(shoes)
      .values(shoe)
      .onConflictDoUpdate({
        target: shoes.id,
        set: { ...shoe, updatedAt: new Date().toISOString() },
      });
    console.log(`[Seed] Injected: ${shoe.brand} ${shoe.model} [${shoe.category}]`);
  }

  console.log("[Seed] Berhasil! Database siap digunakan.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed Error]", err);
  process.exit(1);
});
