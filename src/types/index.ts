export type ShoeCategory =
  | "daily_trainer"
  | "max_cushion"
  | "tempo_speed"
  | "race_day"
  | "trail";

export type RunnerType = "Neutral" | "Mild Stability" | "Stability";
export type SurfaceType = "Road" | "Trail" | "All-Terrain";
export type PlateType = "None" | "Nylon" | "Carbon Fiber" | "TPU";
export type CushionFeel = "Plush" | "Balanced" | "Firm";

export interface ShoeSpecs {
  weightGrams: number;
  dropMm: number;
  heelStackMm: number;
  forefootStackMm: number;
  foamType: string;
  plateType: PlateType;
  cushionFeel: CushionFeel;
}

export interface ShoeVerdict {
  summary: string;
  pros: string[];
  cons: string[];
}

export interface RunningShoe {
  id: string; // Slug kebab-case (e.g. "asics-novablast-4")
  brand: string;
  model: string;
  releaseYear: number;
  category: ShoeCategory;
  primaryUse: string;
  secondaryUse?: string | null;
  targetPaceRange: string;
  runnerType: RunnerType;
  surface: SurfaceType;
  specs: ShoeSpecs;
  verdict: ShoeVerdict;
  imageUrl?: string | null;
  sourceUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryMeta {
  key: ShoeCategory;
  label: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
  iconName: string;
}
