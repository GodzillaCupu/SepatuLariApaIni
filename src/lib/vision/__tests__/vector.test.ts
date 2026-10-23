import { describe, it, expect } from "vitest";
import { l2normalize, dot, centroid, keepInliers, rankShoes } from "../ondevice/vector";

const v = (...n: number[]) => l2normalize(n);

describe("l2normalize / dot", () => {
  it("panjang 1", () => expect(dot(v(3, 4), v(3, 4))).toBeCloseTo(1));
  it("vektor nol tidak NaN", () => expect(Array.from(l2normalize([0, 0]))).toEqual([0, 0]));
  it("ortogonal = 0", () => expect(dot(v(1, 0), v(0, 1))).toBeCloseTo(0));
});

describe("keepInliers", () => {
  const cluster = [v(1, 0.02), v(1, -0.02), v(1, 0.05), v(1, -0.05), v(1, 0.01), v(1, 0)];
  it("membuang outlier jauh", () => {
    const vectors = [...cluster, v(0, 1)];
    const kept = keepInliers(vectors);
    expect(kept).not.toContain(6);
    expect(kept.length).toBe(6);
  });
  it("tidak membuang apa pun bila rapat", () => expect(keepInliers(cluster)).toEqual([0, 1, 2, 3, 4, 5]));
  it("menyisakan minimal minKeep", () => {
    const kept = keepInliers([v(1, 0), v(0, 1), v(-1, 0)], { minKeep: 2, k: 0 });
    expect(kept.length).toBeGreaterThanOrEqual(2);
  });
  it("n ≤ minKeep → semua", () => expect(keepInliers([v(1, 0), v(0, 1)])).toEqual([0, 1]));
});

describe("rankShoes", () => {
  const rows = [
    { shoeId: "a", vector: v(1, 0, 0) },
    { shoeId: "a", vector: v(0.9, 0.1, 0) },
    { shoeId: "b", vector: v(0, 1, 0) },
    { shoeId: "c", vector: v(0.7, 0.7, 0) },
  ];
  it("urut menurun & agregasi per sepatu", () => {
    const r = rankShoes(v(1, 0, 0), rows, { topK: 3, topN: 1 });
    expect(r.map((x) => x.shoeId)).toEqual(["a", "c", "b"]);
    expect(r[0].score).toBeCloseTo(1);
  });
  it("topK membatasi hasil", () => expect(rankShoes(v(1, 0, 0), rows, { topK: 2 })).toHaveLength(2));
  it("centroid ter-normalisasi", () => expect(dot(centroid([v(1, 0), v(0, 1)]), centroid([v(1, 0), v(0, 1)]))).toBeCloseTo(1));
});

import { quantizeInt8, dequantizeInt8, selectReferenceVectors } from "../ondevice/vector";

describe("quantizeInt8", () => {
  it("round-trip hampir identik", () => {
    const a = v(0.3, -0.5, 0.8, 0.1);
    expect(dot(a, dequantizeInt8(quantizeInt8(a)))).toBeGreaterThan(0.999);
  });
});

describe("selectReferenceVectors", () => {
  const seeds = [v(1, 0.05), v(1, -0.05)];
  it("menerima kandidat dekat seed, menolak yang jauh", () => {
    const r = selectReferenceVectors(seeds, [v(1, 0.1), v(0, 1), v(0.9, 0.3)], { accept: 0.9 });
    expect(r.candidates).toContain(0);
    expect(r.candidates).not.toContain(1);
  });
  it("tanpa seed → kosong", () => expect(selectReferenceVectors([], [v(1, 0)])).toEqual({ seeds: [], candidates: [] }));
});
