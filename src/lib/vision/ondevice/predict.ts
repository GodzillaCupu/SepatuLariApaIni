import { rankShoes, type Prediction } from "./vector";
import { loadIndex, type LoadedIndex } from "./index-store";
import { getEmbedder, type Embedder, type EmbedProgress } from "./embedder";

export type Confidence = "kuat" | "sedang" | "lemah";

export interface PredictResult {
  top: Prediction[];
  confidence: Confidence;
  timings: { modelMs: number; embedMs: number; rankMs: number; vectors: number };
}

/**
 * Keyakinan kasar dari skor (cosine) dan jarak #1–#2. Ambang awal; kalibrasi ulang dengan
 * hasil `npm run vision:eval`. Sengaja tidak ditampilkan sebagai persen.
 */
export function confidenceLabel(top: Prediction[]): Confidence {
  if (top.length === 0) return "lemah";
  const s1 = top[0].score;
  const gap = s1 - (top[1]?.score ?? 0);
  if (s1 >= 0.85 && gap >= 0.03) return "kuat";
  if (s1 >= 0.75) return "sedang";
  return "lemah";
}

export interface PredictDeps {
  embedder?: Embedder;
  index?: LoadedIndex;
  onProgress?: (p: EmbedProgress) => void;
  topK?: number;
}

/** Foto (URL/data-URL) → top-K sepatu. Semua lokal; embedder & indeks bisa di-inject untuk tes. */
export async function predictShoes(imageUrl: string, deps: PredictDeps = {}): Promise<PredictResult> {
  const t0 = performance.now();
  const [embedder, index] = await Promise.all([
    deps.embedder ?? getEmbedder(deps.onProgress),
    deps.index ?? loadIndex(),
  ]);
  const t1 = performance.now();
  const q = await embedder.embed(imageUrl);
  const t2 = performance.now();
  const top = rankShoes(q, index.rows, { topK: deps.topK ?? 5 });
  const t3 = performance.now();
  return {
    top,
    confidence: confidenceLabel(top),
    timings: { modelMs: Math.round(t1 - t0), embedMs: Math.round(t2 - t1), rankMs: Math.round(t3 - t2), vectors: index.rows.length },
  };
}
