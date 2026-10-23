import { z } from "zod";

export const ShoeCategoryEnum = z.enum([
  // Road
  "super_shoes",
  "super_trainer",
  "race_short",
  "race_long",
  "speed_tempo",
  "daily_trainer",
  "daily_easy",
  "long_run",
  "max_cushion",
  "recovery_run",
  "stability",
  "minimalist",
  // Trail by Session
  "trail_super_shoes",
  "trail_race_short",
  "trail_race_long",
  "trail_speed",
  "trail_daily",
  "trail_long_run",
  "trail_recovery",
  // Trail by Terrain
  "soft_ground",
  "firm_ground",
  "multi_ground",
  "technical_trail",
  "mountain_alpine",
  "desert_dry",
  // Specialty
  "track_spikes",
  "cross_training",
  // Legacy Aliases
  "race_day",
  "tempo_speed",
  "trail",
]);

export const RunnerTypeEnum = z.enum(["Neutral", "Mild Stability", "Stability"]);
export const SurfaceEnum = z.enum(["Road", "Trail", "All-Terrain"]);
export const PlateTypeEnum = z.enum(["None", "Nylon", "Carbon Fiber", "TPU"]);
export const CushionFeelEnum = z.enum(["Plush", "Balanced", "Firm"]);

/** Batas masuk akal data lab sepatu lari. Di luar rentang = hampir pasti salah scrape. */
export const SPEC_LIMITS = {
  weightGrams: { min: 70, max: 400 },
  dropMm: { min: 0, max: 14 },
  heelStackMm: { min: 15, max: 60 },
  forefootStackMm: { min: 10, max: 55 },
} as const;

const inRange = (limit: { min: number; max: number }) => z.number().min(limit.min).max(limit.max);

export const ShoeSpecsSchema = z
  .object({
    weightGrams: inRange(SPEC_LIMITS.weightGrams),
    dropMm: inRange(SPEC_LIMITS.dropMm),
    heelStackMm: inRange(SPEC_LIMITS.heelStackMm),
    forefootStackMm: inRange(SPEC_LIMITS.forefootStackMm),
    foamType: z.string().min(1),
    plateType: PlateTypeEnum,
    cushionFeel: CushionFeelEnum,
  })
  .refine((s) => s.heelStackMm >= s.forefootStackMm, {
    message: "heelStackMm harus >= forefootStackMm",
    path: ["heelStackMm"],
  });

export const ShoeVerdictSchema = z.object({
  summary: z.string().min(5),
  pros: z.array(z.string()).min(1),
  cons: z.array(z.string()).min(1),
});

export const PACE_RANGE_REGEX = /^\d{1,2}:\d{2} - \d{1,2}:\d{2} min\/km$/;

export const RunningShoeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Harus format kebab-case slug"),
  brand: z.string().min(1),
  model: z.string().min(1),
  /** null = tidak diketahui (disimpan sebagai 0 di DB karena kolom NOT NULL). */
  releaseYear: z.number().int().min(2015).max(2030).nullable(),
  category: ShoeCategoryEnum,
  subCategory: z.string().nullable().optional(),
  terrain: z.string().nullable().optional(),
  primaryUse: z.string().min(3),
  secondaryUse: z.string().nullable().optional(),
  targetPaceRange: z.string().regex(PACE_RANGE_REGEX, 'Format harus "m:ss - m:ss min/km"'),
  runnerType: RunnerTypeEnum.default("Neutral"),
  surface: SurfaceEnum.default("Road"),
  specs: ShoeSpecsSchema,
  verdict: ShoeVerdictSchema,
  imageUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url(),
});

export type RunningShoeInput = z.infer<typeof RunningShoeSchema>;
