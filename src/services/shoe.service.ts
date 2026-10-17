import { db } from "@/db";
import { shoes, ShoeRecord } from "@/db/schema";
import { eq, like, or, and, desc } from "drizzle-orm";
import { RunningShoe, ShoeCategory, CategoryMeta } from "@/types";

export const CATEGORIES_META: Record<ShoeCategory, CategoryMeta> = {
  daily_trainer: {
    key: "daily_trainer",
    label: "Daily Trainer",
    badgeColor: "text-emerald-700",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    description: "Sepatu serbaguna untuk latihan harian, recovery run, dan long run santai.",
    iconName: "Activity",
  },
  max_cushion: {
    key: "max_cushion",
    label: "Max Cushion",
    badgeColor: "text-amber-700",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    description: "Bantalan tebal maksimal untuk meredam impak, menjaga sendi saat recovery run.",
    iconName: "Shield",
  },
  tempo_speed: {
    key: "tempo_speed",
    label: "Tempo / Speed",
    badgeColor: "text-orange-700",
    badgeBg: "bg-orange-50",
    badgeBorder: "border-orange-200",
    description: "Ringan dan responsif untuk lari tempo, interval, dan fartlek cepat.",
    iconName: "Zap",
  },
  race_day: {
    key: "race_day",
    label: "Race Day",
    badgeColor: "text-red-700",
    badgeBg: "bg-red-50",
    badgeBorder: "border-red-200",
    description: "Super shoe dengan busa PEBA & pelat karbon untuk personal best dan maraton.",
    iconName: "Trophy",
  },
  trail: {
    key: "trail",
    label: "Trail Running",
    badgeColor: "text-purple-700",
    badgeBg: "bg-purple-50",
    badgeBorder: "border-purple-200",
    description: "Grip ekstra dan proteksi kaki untuk medan tanah, batu, dan alam bebas.",
    iconName: "Mountain",
  },
};

function formatShoeRecord(record: ShoeRecord): RunningShoe {
  let prosArray: string[] = [];
  let consArray: string[] = [];

  try {
    prosArray = JSON.parse(record.pros);
  } catch {
    prosArray = record.pros ? [record.pros] : [];
  }

  try {
    consArray = JSON.parse(record.cons);
  } catch {
    consArray = record.cons ? [record.cons] : [];
  }

  return {
    id: record.id,
    brand: record.brand,
    model: record.model,
    releaseYear: record.releaseYear,
    category: record.category as ShoeCategory,
    primaryUse: record.primaryUse,
    secondaryUse: record.secondaryUse,
    targetPaceRange: record.targetPaceRange,
    runnerType: record.runnerType as any,
    surface: record.surface as any,
    specs: {
      weightGrams: record.weightGrams,
      dropMm: record.dropMm,
      heelStackMm: record.heelStackMm,
      forefootStackMm: record.forefootStackMm,
      foamType: record.foamType,
      plateType: record.plateType as any,
      cushionFeel: record.cushionFeel as any,
    },
    verdict: {
      summary: record.verdictSummary,
      pros: prosArray,
      cons: consArray,
    },
    imageUrl: record.imageUrl,
    sourceUrl: record.sourceUrl,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getAllShoes(filter?: {
  category?: string;
  brand?: string;
  search?: string;
  limit?: number;
}): Promise<RunningShoe[]> {
  const conditions = [];

  if (filter?.category) {
    conditions.push(eq(shoes.category, filter.category));
  }
  if (filter?.brand) {
    conditions.push(eq(shoes.brand, filter.brand));
  }
  if (filter?.search) {
    const q = `%${filter.search}%`;
    conditions.push(or(like(shoes.brand, q), like(shoes.model, q)));
  }

  const query = db
    .select()
    .from(shoes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(shoes.releaseYear));

  if (filter?.limit) {
    query.limit(filter.limit);
  }

  const rows = await query;
  return rows.map(formatShoeRecord);
}

export async function getShoeById(id: string): Promise<RunningShoe | null> {
  const rows = await db.select().from(shoes).where(eq(shoes.id, id)).limit(1);
  if (!rows || rows.length === 0) return null;
  return formatShoeRecord(rows[0]);
}

export async function getCategoriesSummary() {
  return Object.values(CATEGORIES_META);
}
