/**
 * Matematika vektor murni untuk prediktor on-device. Dipakai bersama oleh script build
 * (scripts/embed-catalog.ts, eval-vision.ts) dan klien browser → satu sumber kebenaran.
 * Tanpa dependensi, tanpa alias "@/" (dibaca juga oleh tsx).
 */

export function l2normalize(v: ArrayLike<number>): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

/** Dot product; untuk vektor ter-L2-normalisasi = cosine similarity. */
export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function centroid(vectors: ArrayLike<number>[]): Float32Array {
  const dim = vectors[0].length;
  const sum = new Float32Array(dim);
  for (const v of vectors) for (let i = 0; i < dim; i++) sum[i] += v[i];
  return l2normalize(sum);
}

/**
 * Buang foto yang janggal terhadap centroid sepatunya (mis. frame gerinda, grafik uji).
 * Ambang = mean − max(k·σ, minGap) dari cosine-ke-centroid (minGap mencegah cluster rapat kehilangan foto sah). Selalu menyisakan minimal `minKeep` foto terdekat.
 * Mengembalikan indeks vektor yang DIPERTAHANKAN (urut naik).
 */
export function keepInliers(vectors: ArrayLike<number>[], opts: { k?: number; minKeep?: number; minGap?: number } = {}): number[] {
  const { k = 1.5, minKeep = 2, minGap = 0.05 } = opts;
  const n = vectors.length;
  if (n <= minKeep) return vectors.map((_, i) => i);
  const c = centroid(vectors);
  const sims = vectors.map((v) => dot(v, c));
  const mean = sims.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(sims.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const threshold = mean - Math.max(k * sd, minGap);
  const keep = new Set<number>();
  sims.forEach((s, i) => s >= threshold && keep.add(i));
  if (keep.size < minKeep) {
    sims
      .map((s, i) => [s, i] as const)
      .sort((a, b) => b[0] - a[0])
      .slice(0, minKeep)
      .forEach(([, i]) => keep.add(i));
  }
  return Array.from(keep).sort((a, b) => a - b);
}

export interface IndexRow {
  shoeId: string;
  vector: ArrayLike<number>;
}

export interface Prediction {
  shoeId: string;
  /** 0..1 (cosine). Hanya untuk urutan; UI tidak menampilkannya sebagai persen. */
  score: number;
}

/**
 * Skor sepatu = rata-rata `topN` similarity tertinggi atas semua vektornya (topN=1 → max).
 * Top-2 lebih tahan terhadap satu foto yang kebetulan mirip.
 */
export function rankShoes(query: ArrayLike<number>, rows: IndexRow[], opts: { topK?: number; topN?: number } = {}): Prediction[] {
  const { topK = 5, topN = 2 } = opts;
  const perShoe = new Map<string, number[]>();
  for (const r of rows) {
    const list = perShoe.get(r.shoeId) ?? [];
    list.push(dot(query, r.vector));
    perShoe.set(r.shoeId, list);
  }
  const out: Prediction[] = [];
  perShoe.forEach((sims, shoeId) => {
    sims.sort((a, b) => b - a);
    const top = sims.slice(0, Math.min(topN, sims.length));
    out.push({ shoeId, score: top.reduce((a, b) => a + b, 0) / top.length });
  });
  return out.sort((a, b) => b.score - a.score || a.shoeId.localeCompare(b.shoeId)).slice(0, topK);
}

/** Kuantisasi int8 untuk vektor ter-L2-normalisasi (komponen ∈ [-1,1]) → indeks 4× lebih kecil. */
export function quantizeInt8(v: ArrayLike<number>): Int8Array {
  const out = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = Math.max(-127, Math.min(127, Math.round(v[i] * 127)));
  return out;
}

export function dequantizeInt8(q: ArrayLike<number>): Float32Array {
  return l2normalize(Array.from(q as ArrayLike<number>, (x) => x / 127));
}

/**
 * Pilih foto layak untuk satu sepatu. `seeds` = foto yang diyakini sepatu utuh (usable),
 * `candidates` = sisanya (detail/lab, mungkin bagus mungkin sampah). Kandidat diterima bila
 * cosine ke centroid seed ≥ accept. Seed sendiri disaring dengan keepInliers.
 * Mengembalikan indeks yang diterima pada masing-masing larik.
 */
export function selectReferenceVectors(
  seeds: ArrayLike<number>[],
  candidates: ArrayLike<number>[],
  opts: { accept?: number } = {}
): { seeds: number[]; candidates: number[] } {
  const { accept = 0.72 } = opts;
  if (seeds.length === 0) return { seeds: [], candidates: [] };
  const keptSeeds = keepInliers(seeds);
  const c = centroid(keptSeeds.map((i) => seeds[i]));
  const keptCandidates = candidates.map((v, i) => [dot(v, c), i] as const).filter(([s]) => s >= accept).map(([, i]) => i);
  return { seeds: keptSeeds, candidates: keptCandidates };
}
