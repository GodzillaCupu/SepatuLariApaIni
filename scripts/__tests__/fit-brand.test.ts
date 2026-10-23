import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { splitBrandModel, canonicalBrand } from "../lib/brands";
import {
  classifyLengthFit,
  classifyWidthFit,
  classifySizing,
  classifyBreathability,
  normalizeUpperMaterial,
} from "../lib/classify-fit";
import { parseRunRepeatHtml } from "../lib/runrepeat-parser";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "../__fixtures__", `${name}.html`), "utf8");

describe("splitBrandModel", () => {
  it.each([
    ["New Balance Fresh Foam X 1080v13", null, "New Balance", "Fresh Foam X 1080v13"],
    ["New Balance FuelCell SuperComp Elite v4", "New Balance", "New Balance", "FuelCell SuperComp Elite v4"],
    ["Under Armour Velociti Elite 2", null, "Under Armour", "Velociti Elite 2"],
    ["Topo Athletic Ultrafly 5", null, "Topo Athletic", "Ultrafly 5"],
    ["La Sportiva Bushido III", null, "La Sportiva", "Bushido III"],
    ["Inov-8 Trailfly Ultra G 300", null, "Inov-8", "Trailfly Ultra G 300"],
    ["HOKA Speedgoat 5", "HOKA", "HOKA", "Speedgoat 5"],
    ["Hoka One One Clifton 8", null, "HOKA", "Clifton 8"],
    ["On Cloudmonster 2", null, "On", "Cloudmonster 2"],
    ["Onitsuka Tiger Magic Speed", null, null, null],
  ])("%s", (title, fact, brand, model) => {
    expect(splitBrandModel(title, fact)).toEqual({ brand, model });
  });
  it("brand tak dikenal + fakta cocok → pakai fakta", () => {
    expect(splitBrandModel("Zorro Racer 2", "Zorro")).toEqual({ brand: "Zorro", model: "Racer 2" });
  });
  it("canonicalBrand", () => {
    expect(canonicalBrand("new balance")).toBe("New Balance");
    expect(canonicalBrand("asics")).toBe("ASICS");
    expect(canonicalBrand("nope")).toBeNull();
  });
});

describe("sizing", () => {
  it("length dari bar + votes", () => {
    expect(classifyLengthFit(2, 251)).toBe("true_to_size");
    expect(classifyLengthFit(0, 100)).toBe("runs_small");
    expect(classifyLengthFit(4, 100)).toBe("runs_large");
    expect(classifyLengthFit(2, 5)).toBe("unknown");
    expect(classifyLengthFit(null, 100)).toBe("unknown");
    expect(classifyLengthFit(null, 83, "slightly small")).toBe("runs_small");
    expect(classifyLengthFit(null, 83, "slightly large")).toBe("runs_large");
    expect(classifyLengthFit(2, 83, "true to size")).toBe("true_to_size");
  });
  it("width: Width/fit utama, toebox cadangan", () => {
    expect(classifyWidthFit("Narrow", "Medium")).toBe("narrow");
    expect(classifyWidthFit(null, "Wide")).toBe("wide");
    expect(classifyWidthFit("-", "Medium")).toBe("standard");
    expect(classifyWidthFit(null, null)).toBe("unknown");
  });
  it("gabungan", () => {
    expect(classifySizing("true_to_size", "standard")).toBe("true_to_size");
    expect(classifySizing("true_to_size", "narrow")).toBe("narrow");
    expect(classifySizing("runs_small", "wide")).toBe("runs_small");
    expect(classifySizing("unknown", "standard")).toBe("unknown");
  });
});

describe("breathability", () => {
  it("label lab menang", () => {
    expect(classifyBreathability("Breathable", null, "Gore-Tex")).toBe("cool");
    expect(classifyBreathability("Moderate", null, "")).toBe("moderate");
    expect(classifyBreathability("Warm", null, "mesh")).toBe("warm");
  });
  it("skor lama bila label kosong", () => {
    expect(classifyBreathability(null, 4, "")).toBe("cool");
    expect(classifyBreathability(null, 3, "")).toBe("moderate");
    expect(classifyBreathability(null, 2, "")).toBe("warm");
  });
  it("kata kunci upper bila lainnya kosong", () => {
    expect(classifyBreathability(null, null, "Gore-Tex membrane")).toBe("warm");
    expect(classifyBreathability(null, null, "Engineered mesh")).toBe("cool");
    expect(classifyBreathability("-", null, "")).toBe("unknown");
  });
  it("material", () => expect(normalizeUpperMaterial("Mesh | Reflective")).toBe("Mesh, Reflective"));
});

describe("fixtures fit & breathability", () => {
  it("ASICS Novablast 4", () => {
    const p = parseRunRepeatHtml(fixture("asics-novablast-4"));
    expect(p.fitVotes).toBe(251);
    expect(p.lengthFit).toBe("true_to_size");
    expect(p.widthFit).toBe("narrow");
    expect(p.sizing).toBe("narrow");
    expect(p.breathability).toBe("moderate");
    expect(p.upperMaterial).toBe("Mesh, Reflective");
  });
  it("HOKA Speedgoat 5", () => {
    const p = parseRunRepeatHtml(fixture("hoka-speedgoat-5"));
    expect(p.brand).toBe("HOKA");
    expect(p.fitVotes).toBe(452);
    expect(p.sizing).toBe("narrow");
    expect(p.breathability).toBe("moderate");
  });
});
