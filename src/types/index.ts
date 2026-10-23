export type ShoeCategory =
  // Road Categories
  | "super_shoes"
  | "super_trainer"
  | "race_short"
  | "race_long"
  | "speed_tempo"
  | "daily_trainer"
  | "daily_easy"
  | "long_run"
  | "max_cushion"
  | "recovery_run"
  | "stability"
  | "minimalist"
  // Trail Categories (By Session)
  | "trail_super_shoes"
  | "trail_race_short"
  | "trail_race_long"
  | "trail_speed"
  | "trail_daily"
  | "trail_long_run"
  | "trail_recovery"
  // Trail Categories (By Terrain)
  | "soft_ground"
  | "firm_ground"
  | "multi_ground"
  | "technical_trail"
  | "mountain_alpine"
  | "desert_dry"
  // Specialty
  | "track_spikes"
  | "cross_training"
  // Legacy aliases for backward compatibility
  | "race_day"
  | "tempo_speed"
  | "trail";

export type RunnerType = "Neutral" | "Mild Stability" | "Stability";
export type SurfaceType = "Road" | "Trail" | "All-Terrain";
export type PlateType = "None" | "Nylon" | "Carbon Fiber" | "TPU";
export type CushionFeel = "Plush" | "Balanced" | "Firm";
export type Sizing = "true_to_size" | "narrow" | "wide" | "runs_small" | "runs_large" | "unknown";
export type LengthFit = "runs_small" | "true_to_size" | "runs_large" | "unknown";
export type WidthFit = "narrow" | "standard" | "wide" | "unknown";
export type Breathability = "cool" | "moderate" | "warm" | "unknown";

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
  subCategory?: string | null;
  terrain?: string | null;
  primaryUse: string;
  secondaryUse?: string | null;
  targetPaceRange: string;
  runnerType: RunnerType;
  surface: SurfaceType;
  sizing?: Sizing;
  lengthFit?: LengthFit;
  widthFit?: WidthFit;
  fitVotes?: number | null;
  breathability?: Breathability;
  upperMaterial?: string | null;
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
