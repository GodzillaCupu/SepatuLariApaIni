import { describe, it, expect, vi } from "vitest";
import { matchShoe, textSimilarity, type CatalogEntry } from "../match-shoe";
import { resolveApiKey } from "../key";
import { handleDetect } from "../handler";
import { detectShoeWithGemini } from "../gemini";

const catalog: CatalogEntry[] = [
  { id: "asics-novablast-4", brand: "ASICS", model: "Novablast 4", releaseYear: 2024 },
  { id: "asics-novablast-5", brand: "ASICS", model: "Novablast 5", releaseYear: 2025 },
  { id: "new-balance-fresh-foam-x-1080v13", brand: "New Balance", model: "Fresh Foam X 1080v13", releaseYear: 2024 },
  { id: "hoka-speedgoat-5", brand: "HOKA", model: "Speedgoat 5", releaseYear: 2022 },
  { id: "asics-superblast", brand: "ASICS", model: "Superblast", releaseYear: 2023 },
  { id: "asics-superblast-2", brand: "ASICS", model: "Superblast 2", releaseYear: 2024 },
];
const det = (brand: string, model: string, confidence = 0.9, releaseYear?: number) => ({ brand, model, confidence, releaseYear });

describe("matchShoe", () => {
  it("cocok persis", () => {
    expect(matchShoe(det("ASICS", "Novablast 4"), catalog).matchId).toBe("asics-novablast-4");
  });
  it("toleran huruf besar/kecil & tanda baca", () => {
    expect(matchShoe(det("asics", "NOVABLAST-4"), catalog).matchId).toBe("asics-novablast-4");
  });
  it("brand 2 kata & v13 vs 13", () => {
    expect(matchShoe(det("New Balance", "Fresh Foam X 1080 v13"), catalog).matchId).toBe(
      "new-balance-fresh-foam-x-1080v13"
    );
  });
  it("typo kecil", () => {
    expect(matchShoe(det("Hoka", "Speedgoat5"), catalog).matchId).toBe("hoka-speedgoat-5");
  });
  it("model berdekatan → tidak pasti, tapi jadi kandidat", () => {
    const r = matchShoe(det("ASICS", "Superblast 3"), catalog);
    expect(r.matchId).toBeNull();
    expect(r.candidates.map((c) => c.id)).toContain("asics-superblast-2");
  });
  it("unknown / tidak ada di katalog", () => {
    expect(matchShoe(det("unknown", "unknown", 0.1), catalog)).toEqual({ matchId: null, candidates: [] });
    expect(matchShoe(det("Zorro", "Racer 9"), catalog).matchId).toBeNull();
  });
  it("confidence model rendah → tidak auto-match", () => {
    expect(matchShoe(det("ASICS", "Novablast 4", 0.2), catalog).matchId).toBeNull();
  });
  it("SC Rebel v5 → SuperComp Rebel menang, bukan Rebel v5 / SC Trainer", () => {
    const nb: CatalogEntry[] = [
      { id: "nb-sc-rebel", brand: "New Balance", model: "SuperComp Rebel", releaseYear: 2026 },
      { id: "nb-rebel-v5", brand: "New Balance", model: "FuelCell Rebel v5" },
      { id: "nb-sc-trainer-v3", brand: "New Balance", model: "FuelCell SuperComp Trainer v3" },
      { id: "nb-sc-elite-v5", brand: "New Balance", model: "FuelCell SuperComp Elite v5" },
    ];
    for (const model of ["FuelCell SC Rebel", "SC Rebel"]) {
      const r = matchShoe(det("New Balance", model), nb);
      expect(r.candidates[0]?.id).toBe("nb-sc-rebel");
      expect(r.matchId).toBe("nb-sc-rebel");
    }
    // Versi "v5" tebakan AI → ambigu dengan Rebel v5: tidak auto-match, tapi SuperComp Rebel tetap #1.
    const guess = matchShoe(det("New Balance", "SC Rebel v5"), nb);
    expect(guess.candidates[0]?.id).toBe("nb-sc-rebel");
    expect(guess.candidates.map((c) => c.id)).not.toContain("nb-sc-trainer-v3");
  });
  it("model tidak ada di katalog → tidak ada kandidat bigram-saja", () => {
    const r = matchShoe(det("ASICS", "Novablast 3"), [
      { id: "asics-superblast", brand: "ASICS", model: "Superblast" },
      { id: "asics-gel-kayano-32", brand: "ASICS", model: "Gel Kayano 32" },
    ]);
    expect(r.matchId).toBeNull();
    expect(r.candidates).toEqual([]);
  });
  it("textSimilarity kosong = 0", () => expect(textSimilarity("", "abc")).toBe(0));
});

describe("resolveApiKey", () => {
  it("BYOK menang", () => {
    expect(resolveApiKey(" k1 ", { GEMINI_API_KEY: "srv", NODE_ENV: "development" })).toEqual({ key: "k1", source: "byok" });
  });
  it("key server hanya non-production", () => {
    expect(resolveApiKey(null, { GEMINI_API_KEY: "srv", NODE_ENV: "development" })).toEqual({ key: "srv", source: "server-dev" });
    expect(resolveApiKey(null, { GEMINI_API_KEY: "srv", NODE_ENV: "production" })).toBeNull();
  });
  it("tanpa key", () => expect(resolveApiKey("", {})).toBeNull());
});

const okGemini = (payload: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(payload), { status })) as unknown as typeof fetch;
const geminiBody = (obj: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const img = "A".repeat(200);

describe("detectShoeWithGemini", () => {
  it("parse JSON valid & kirim key via header (bukan URL)", async () => {
    const f = okGemini(geminiBody({ brand: "ASICS", model: "Novablast 4", confidence: 0.9 }));
    const d = await detectShoeWithGemini({ apiKey: "KEY", image: img, mimeType: "image/jpeg", fetchImpl: f });
    expect(d.model).toBe("Novablast 4");
    const [url, init] = (f as any).mock.calls[0];
    expect(String(url)).not.toContain("KEY");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("KEY");
  });
  it.each([
    [400, "KEY_INVALID"],
    [403, "KEY_INVALID"],
    [429, "QUOTA"],
    [500, "UPSTREAM"],
  ])("HTTP %i → %s", async (status, code) => {
    await expect(
      detectShoeWithGemini({ apiKey: "k", image: img, mimeType: "image/png", fetchImpl: okGemini({}, status) })
    ).rejects.toMatchObject({ code });
  });
  it("terima visibleText & reasoning opsional", async () => {
    const f = okGemini(geminiBody({ brand: "New Balance", model: "SC Rebel", confidence: 0.8, visibleText: "sc rebel", reasoning: "teks lidah" }));
    const d = await detectShoeWithGemini({ apiKey: "k", image: img, mimeType: "image/jpeg", fetchImpl: f });
    expect(d.visibleText).toBe("sc rebel");
    expect(d.reasoning).toBe("teks lidah");
  });
  it("JSON rusak → BAD_RESPONSE", async () => {
    const f = okGemini({ candidates: [{ content: { parts: [{ text: "bukan json" }] } }] });
    await expect(detectShoeWithGemini({ apiKey: "k", image: img, mimeType: "image/png", fetchImpl: f })).rejects.toMatchObject({
      code: "BAD_RESPONSE",
    });
  });
});

describe("handleDetect", () => {
  const deps = (over: Partial<Parameters<typeof handleDetect>[2]> = {}) => ({
    loadCatalog: async () => catalog,
    env: { NODE_ENV: "production" } as { GEMINI_API_KEY?: string; NODE_ENV?: string },
    fetchImpl: okGemini(geminiBody({ brand: "ASICS", model: "Novablast 4", confidence: 0.95 })),
    ...over,
  });
  const body = { image: img, mimeType: "image/jpeg" };

  it("production tanpa BYOK → 401 KEY_REQUIRED", async () => {
    const r = await handleDetect(body, null, deps({ env: { GEMINI_API_KEY: "srv", NODE_ENV: "production" } }));
    expect(r.status).toBe(401);
    expect((r.body as any).error.code).toBe("KEY_REQUIRED");
  });
  it("BYOK → 200 + match", async () => {
    const r = await handleDetect(body, "mykey", deps());
    expect(r.status).toBe(200);
    expect((r.body as any).match.matchId).toBe("asics-novablast-4");
    expect((r.body as any).keySource).toBe("byok");
  });
  it("dev: key server dipakai", async () => {
    const r = await handleDetect(body, null, deps({ env: { GEMINI_API_KEY: "srv", NODE_ENV: "development" } }));
    expect(r.status).toBe(200);
    expect((r.body as any).keySource).toBe("server-dev");
  });
  it("body tidak valid → 400", async () => {
    expect((await handleDetect({ image: "x", mimeType: "image/gif" }, "k", deps())).status).toBe(400);
  });
  it("error Gemini diteruskan", async () => {
    const r = await handleDetect(body, "k", deps({ fetchImpl: okGemini({}, 429) }));
    expect(r.status).toBe(429);
  });
});
