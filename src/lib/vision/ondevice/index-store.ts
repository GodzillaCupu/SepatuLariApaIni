import { dequantizeInt8, type IndexRow } from "./vector";

export const DEFAULT_MODEL = "clip";
export const INDEX_VERSION = 1;

export interface IndexManifest {
  version: number;
  model: { name: string; repo: string; dtype: string };
  dim: number;
  dtype: "int8";
  count: number;
  shoes: number;
  builtAt: string;
  rows: { shoeId: string; photo: number; mirrored: boolean }[];
}

export interface LoadedIndex {
  manifest: IndexManifest;
  rows: IndexRow[];
}

export class IndexError extends Error {
  constructor(public code: "INDEX_MISSING" | "INDEX_INVALID", message: string) {
    super(message);
    this.name = "IndexError";
  }
}

/** Ubah manifest + biner int8 jadi baris indeks. Murni → dites tanpa jaringan. */
export function parseIndex(manifest: IndexManifest, bin: ArrayBuffer): LoadedIndex {
  const { dim, count } = manifest;
  if (!dim || !count || manifest.rows.length !== count || bin.byteLength !== dim * count) {
    throw new IndexError("INDEX_INVALID", "Indeks visual rusak/tidak sinkron. Bangun ulang dengan: npm run vision:embed");
  }
  const rows: IndexRow[] = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = { shoeId: manifest.rows[i].shoeId, vector: dequantizeInt8(new Int8Array(bin, i * dim, dim)) };
  }
  return { manifest, rows };
}

const cache = new Map<string, Promise<LoadedIndex>>();

/** Muat indeks sekali per model (di-cache di memori). */
export function loadIndex(model: string = DEFAULT_MODEL, fetchImpl: typeof fetch = fetch): Promise<LoadedIndex> {
  const key = `${model}-v${INDEX_VERSION}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async () => {
    const [mRes, bRes] = await Promise.all([
      fetchImpl(`/vision/manifest-${key}.json`),
      fetchImpl(`/vision/index-${key}.bin`),
    ]);
    if (!mRes.ok || !bRes.ok) {
      throw new IndexError("INDEX_MISSING", "Indeks visual belum tersedia. Jalankan: npm run vision:embed");
    }
    return parseIndex((await mRes.json()) as IndexManifest, await bRes.arrayBuffer());
  })();
  cache.set(key, p);
  p.catch(() => cache.delete(key)); // jangan cache kegagalan
  return p;
}
