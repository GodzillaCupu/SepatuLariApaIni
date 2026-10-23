import { describe, it, expect, vi } from "vitest";
import { confidenceLabel, predictShoes } from "../ondevice/predict";
import { parseIndex, loadIndex, IndexError, type IndexManifest } from "../ondevice/index-store";
import { l2normalize, quantizeInt8 } from "../ondevice/vector";

const v = (...n: number[]) => l2normalize(n);

function buildIndex(vectors: { shoeId: string; vec: Float32Array }[]) {
  const dim = vectors[0].vec.length;
  const bin = new Int8Array(vectors.length * dim);
  vectors.forEach((r, i) => bin.set(quantizeInt8(r.vec), i * dim));
  const manifest: IndexManifest = {
    version: 1,
    model: { name: "clip", repo: "x", dtype: "q8" },
    dim,
    dtype: "int8",
    count: vectors.length,
    shoes: new Set(vectors.map((r) => r.shoeId)).size,
    builtAt: "2026-01-01",
    rows: vectors.map((r, i) => ({ shoeId: r.shoeId, photo: i, mirrored: false })),
  };
  return { manifest, bin: bin.buffer as ArrayBuffer };
}

const data = [
  { shoeId: "a", vec: v(1, 0, 0) },
  { shoeId: "b", vec: v(0, 1, 0) },
  { shoeId: "c", vec: v(0, 0, 1) },
];

describe("confidenceLabel", () => {
  it("kuat: skor tinggi & jarak jelas", () => expect(confidenceLabel([{ shoeId: "a", score: 0.9 }, { shoeId: "b", score: 0.7 }])).toBe("kuat"));
  it("sedang: skor cukup", () => expect(confidenceLabel([{ shoeId: "a", score: 0.78 }, { shoeId: "b", score: 0.77 }])).toBe("sedang"));
  it("lemah: skor rendah / kosong", () => {
    expect(confidenceLabel([{ shoeId: "a", score: 0.5 }])).toBe("lemah");
    expect(confidenceLabel([])).toBe("lemah");
  });
});

describe("parseIndex / loadIndex", () => {
  it("parse biner → baris ter-normalisasi", () => {
    const { manifest, bin } = buildIndex(data);
    const idx = parseIndex(manifest, bin);
    expect(idx.rows).toHaveLength(3);
    expect(idx.rows[0].shoeId).toBe("a");
  });
  it("ukuran biner tak cocok → INDEX_INVALID", () => {
    const { manifest, bin } = buildIndex(data);
    expect(() => parseIndex(manifest, bin.slice(0, 5))).toThrow(IndexError);
  });
  it("404 → INDEX_MISSING (tidak di-cache)", async () => {
    const f = vi.fn(async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    await expect(loadIndex("zzz", f)).rejects.toMatchObject({ code: "INDEX_MISSING" });
    await expect(loadIndex("zzz", f)).rejects.toMatchObject({ code: "INDEX_MISSING" });
    expect(f).toHaveBeenCalledTimes(4);
  });
  it("sukses via fetch mock", async () => {
    const { manifest, bin } = buildIndex(data);
    const f = vi.fn(async (u: any) =>
      String(u).endsWith(".json") ? new Response(JSON.stringify(manifest)) : new Response(bin)
    ) as unknown as typeof fetch;
    const idx = await loadIndex("mock", f);
    expect(idx.rows).toHaveLength(3);
  });
});

describe("predictShoes (embedder & indeks di-inject)", () => {
  it("mengurutkan sepatu menurut kemiripan", async () => {
    const { manifest, bin } = buildIndex(data);
    const index = parseIndex(manifest, bin);
    const embedder = { embed: async () => v(0.1, 0.95, 0.1) };
    const r = await predictShoes("x", { embedder, index, topK: 2 });
    expect(r.top).toHaveLength(2);
    expect(r.top[0].shoeId).toBe("b");
    expect(r.timings.vectors).toBe(3);
  });
});
