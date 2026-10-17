import { db } from "@/db";
import { shoes, ShoeRecord } from "@/db/schema";
import { eq, like, or, and, desc } from "drizzle-orm";
import { RunningShoe, ShoeCategory, CategoryMeta } from "@/types";
import { FALLBACK_SHOES } from "@/data/fallback-shoes";
import { CATEGORIES_META } from "@/constants/categories";

export { CATEGORIES_META };

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
  try {
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
    if (rows && rows.length > 0) {
      return rows.map(formatShoeRecord);
    }
  } catch (err) {
    console.warn("[ShoeService] Database unavailable, falling back to static dataset:", err);
  }

  // Fallback to static catalog if DB is offline or not yet migrated
  return FALLBACK_SHOES.filter((shoe) => {
    if (filter?.category && shoe.category !== filter.category) return false;
    if (filter?.brand && shoe.brand.toLowerCase() !== filter.brand.toLowerCase()) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      if (!shoe.brand.toLowerCase().includes(q) && !shoe.model.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  }).slice(0, filter?.limit || undefined);
}

export async function getShoeById(id: string): Promise<RunningShoe | null> {
  try {
    const rows = await db.select().from(shoes).where(eq(shoes.id, id)).limit(1);
    if (rows && rows.length > 0) {
      return formatShoeRecord(rows[0]);
    }
  } catch (err) {
    console.warn("[ShoeService] Database unavailable for getShoeById:", err);
  }

  return FALLBACK_SHOES.find((s) => s.id === id) || null;
}

export async function getCategoriesSummary() {
  return Object.values(CATEGORIES_META);
}

