import type { RunningShoe } from "@/types";

export type Leader = "min" | "max";

/** Indeks nilai terbaik (min/max). Seri → semua indeks seri. Nilai kosong diabaikan. */
export function leaderIndexes(values: Array<number | null | undefined>, mode: Leader): number[] {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length < 2) return [];
  const best = mode === "min" ? Math.min(...nums) : Math.max(...nums);
  if (nums.every((v) => v === best)) return [];
  return values.flatMap((v, i) => (v === best ? [i] : []));
}

/** Lebar bar 0–100 relatif terhadap nilai terbesar (untuk visual selisih). */
export function barWidths(values: Array<number | null | undefined>): number[] {
  const max = Math.max(0, ...values.filter((v): v is number => typeof v === "number"));
  if (max === 0) return values.map(() => 0);
  return values.map((v) => (typeof v === "number" ? Math.round((v / max) * 100) : 0));
}

/** Selisih a→b dengan tanda, mis. "+12 g". */
export function diffLabel(a: number | null | undefined, b: number | null | undefined, unit: string): string {
  if (typeof a !== "number" || typeof b !== "number") return "-";
  const d = Math.round((b - a) * 10) / 10;
  if (d === 0) return `sama (${unit})`;
  return `${d > 0 ? "+" : ""}${d} ${unit}`;
}

export type MetricKey = "weight" | "drop" | "heel" | "forefoot";

export const METRICS: Array<{
  key: MetricKey;
  label: string;
  unit: string;
  get: (s: RunningShoe) => number | undefined;
  /** Sorot nilai terbaik; undefined = tidak ada "lebih baik", hanya visual. */
  leader?: Leader;
  leaderHint?: string;
}> = [
  { key: "weight", label: "Berat", unit: "g", get: (s) => s.specs?.weightGrams, leader: "min", leaderHint: "Paling ringan" },
  { key: "drop", label: "Drop", unit: "mm", get: (s) => s.specs?.dropMm },
  { key: "heel", label: "Stack tumit", unit: "mm", get: (s) => s.specs?.heelStackMm },
  { key: "forefoot", label: "Stack depan", unit: "mm", get: (s) => s.specs?.forefootStackMm },
];

/** Baris teks yang berbeda antar sepatu (dipakai untuk sorot "beda"). */
export function differs(values: Array<string | null | undefined>): boolean {
  const set = new Set(values.map((v) => (v ?? "").toLowerCase()));
  return set.size > 1;
}

/** Parse `?ids=a,b,c` → unik, maks `max`, tanpa kosong. */
export function parseIds(raw: string | null | undefined, max = 3): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))).slice(0, max);
}
