import { z } from "zod";

export const ShoeCategoryEnum = z.enum([
  "daily_trainer",
  "max_cushion",
  "tempo_speed",
  "race_day",
  "trail",
]);

export const RunnerTypeEnum = z.enum(["Neutral", "Mild Stability", "Stability"]);
export const SurfaceEnum = z.enum(["Road", "Trail", "All-Terrain"]);
export const PlateTypeEnum = z.enum(["None", "Nylon", "Carbon Fiber", "TPU"]);
export const CushionFeelEnum = z.enum(["Plush", "Balanced", "Firm"]);

export const ShoeSpecsSchema = z.object({
  weightGrams: z.number().positive(),
  dropMm: z.number().min(0),
  heelStackMm: z.number().positive(),
  forefootStackMm: z.number().positive(),
  foamType: z.string().min(1),
  plateType: PlateTypeEnum,
  cushionFeel: CushionFeelEnum,
});

export const ShoeVerdictSchema = z.object({
  summary: z.string().min(5),
  pros: z.array(z.string()).min(1),
  cons: z.array(z.string()).min(1),
});

export const RunningShoeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Harus format kebab-case slug"),
  brand: z.string().min(1),
  model: z.string().min(1),
  releaseYear: z.number().int().min(2015).max(2030),
  category: ShoeCategoryEnum,
  primaryUse: z.string().min(3),
  secondaryUse: z.string().nullable().optional(),
  targetPaceRange: z.string().min(3),
  runnerType: RunnerTypeEnum.default("Neutral"),
  surface: SurfaceEnum.default("Road"),
  specs: ShoeSpecsSchema,
  verdict: ShoeVerdictSchema,
  imageUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url(),
});

export type RunningShoeInput = z.infer<typeof RunningShoeSchema>;
