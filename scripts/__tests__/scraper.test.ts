import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseRunRepeatHtml, parseGrams, parseMm, detectPlate, detectFoam, shortSummary } from "../lib/runrepeat-parser";
import { buildShoeFromPage, NeedsReviewError } from "../scrape-runrepeat";
import { RunningShoeSchema } from "../../src/schemas/shoe.schema";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "../__fixtures__", `${name}.html`), "utf8");

describe("parseGrams / parseMm", () => {
  it("ambil gram dari 'oz / g'", () => expect(parseGrams("9.1 oz / 259g")).toBe(259));
  it("konversi oz bila tidak ada gram", () => expect(parseGrams("9 oz")).toBe(255));
  it("undefined / sampah → null", () => {
    expect(parseGrams(undefined)).toBeNull();
    expect(parseGrams("-")).toBeNull();
    expect(parseMm("-")).toBeNull();
  });
  it("parse mm desimal", () => expect(parseMm("39.2 mm")).toBe(39.2));
});

describe("detectPlate (per kalimat, abaikan negasi/perbandingan)", () => {
  it("klaim positif carbon", () =>
    expect(detectPlate("The shoe has a full-length carbon plate. It is fast.")).toBe("Carbon Fiber"));
  it("sebutan polos carbon plate tanpa negasi", () =>
    expect(detectPlate("The Vaporfly 4's carbon plate is slightly thinner this year.")).toBe("Carbon Fiber"));
  it("klaim positif nylon", () =>
    expect(detectPlate("It features a nylon plate that adds snap.")).toBe("Nylon"));
  it("tanpa kata plat → None", () => expect(detectPlate("soft daily trainer")).toBe("None"));
  it.each([
    "The Megablast doesn’t include a carbon plate, yet it performed here as if it did.",
    "One of the unique features of the EVO SL is its plate-free design.",
    "Runners who dislike carbon plates but crave world-class performance.",
    "The Nimbus 26 turned out to be almost mirroring the stiffness of a carbon-plated shoe.",
    "Stiffer than many carbon-plated shoes, so forget about a flexible feel.",
    "The Superblast 2 still doesn't include a nylon or carbon plate.",
  ])("negasi/perbandingan → None: %s", (sentence) => expect(detectPlate(sentence)).toBe("None"));
});

describe("detectFoam (brand-aware)", () => {
  it("cocok untuk brand sendiri", () => expect(detectFoam("FF BLAST+ ECO foam", "ASICS")).toBe("FF BLAST+ ECO"));
  it("abaikan busa kompetitor", () => expect(detectFoam("rival uses Fresh Foam X", "HOKA")).toBeNull());
});

describe("shortSummary", () => {
  it("buang prefix 'X review:' dan batasi panjang", () => {
    const s = shortSummary("ASICS Novablast 4 review: " + "Kalimat panjang. ".repeat(40));
    expect(s.startsWith("Kalimat")).toBe(true);
    expect(s.length).toBeLessThanOrEqual(221);
  });
});

describe("fixture: ASICS Novablast 4 (road daily trainer)", () => {
  const page = parseRunRepeatHtml(fixture("asics-novablast-4"));
  it("spec lab dari kolom pertama (bukan sepatu mirip)", () => {
    expect(page.brand).toBe("ASICS");
    expect(page.model).toBe("Novablast 4");
    expect(page.weightGrams).toBe(259);
    expect(page.dropMm).toBe(9);
    expect(page.heelStackMm).toBe(39.2);
    expect(page.forefootStackMm).toBe(30.2);
  });
  it("tidak salah deteksi plat", () => expect(page.plateType).toBe("None"));
  it("pros/cons terambil", () => {
    expect(page.pros.length).toBeGreaterThan(3);
    expect(page.cons.length).toBeGreaterThan(0);
  });
  it("kategori masuk akal (bukan super shoes)", () => {
    const shoe = buildShoeFromPage(page, { url: "https://runrepeat.com/asics-novablast-4" });
    expect(shoe.category).not.toBe("super_shoes");
    expect(shoe.category).not.toBe("super_trainer");
    expect(RunningShoeSchema.safeParse(shoe).success).toBe(true);
  });
});

describe("fixture: HOKA Speedgoat 5 (trail)", () => {
  const page = parseRunRepeatHtml(fixture("hoka-speedgoat-5"));
  it("label 'Heel stack lab' terbaca", () => {
    expect(page.weightGrams).toBe(277);
    expect(page.heelStackMm).toBe(27.5);
    expect(page.forefootStackMm).toBe(23.7);
    expect(page.releaseYear).toBe(2022);
  });
  it("terrain trail → kategori trail_*", () => {
    const shoe = buildShoeFromPage(page, { url: "https://runrepeat.com/hoka-speedgoat-5" });
    expect(shoe.category.startsWith("trail")).toBe(true);
    expect(shoe.surface).toBe("Trail");
  });
});

describe("buildShoeFromPage menolak data tidak lengkap", () => {
  it("spec hilang → NeedsReviewError (tidak ada default diam-diam)", () => {
    const page = { ...parseRunRepeatHtml(fixture("asics-novablast-4")), weightGrams: null };
    expect(() => buildShoeFromPage(page, { url: "https://runrepeat.com/x" })).toThrow(NeedsReviewError);
  });
  it("nilai tidak masuk akal → NeedsReviewError", () => {
    const page = { ...parseRunRepeatHtml(fixture("asics-novablast-4")), weightGrams: 3 };
    expect(() => buildShoeFromPage(page, { url: "https://runrepeat.com/x" })).toThrow(NeedsReviewError);
  });
});

describe("RunningShoeSchema", () => {
  it("tolak pace range bukan format min/km", () => {
    const base = buildShoeFromPage(parseRunRepeatHtml(fixture("asics-novablast-4")), { url: "https://runrepeat.com/x" });
    expect(RunningShoeSchema.safeParse({ ...base, targetPaceRange: "Road" }).success).toBe(false);
  });
  it("tolak heel < forefoot", () => {
    const base = buildShoeFromPage(parseRunRepeatHtml(fixture("asics-novablast-4")), { url: "https://runrepeat.com/x" });
    expect(
      RunningShoeSchema.safeParse({ ...base, specs: { ...base.specs, heelStackMm: 20, forefootStackMm: 30 } }).success
    ).toBe(false);
  });
});
