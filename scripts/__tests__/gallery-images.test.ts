import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseRunRepeatHtml } from "../lib/runrepeat-parser";
import { classifyGalleryLabel, parseGalleryImages } from "../lib/gallery-images";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "../__fixtures__", `${name}.html`), "utf8");

describe("classifyGalleryLabel", () => {
  it.each(["", "2", "review"])("foto sepatu utuh: %j", (l) => expect(classifyGalleryLabel(l)).toBe("product"));
  it.each(["dremel-toe", "breathability-smoke-test", "shock-absorption", "microscope"])("uji lab: %j", (l) =>
    expect(classifyGalleryLabel(l)).toBe("lab")
  );
  it.each(["heel-tab", "tongue", "outsole"])("detail bagian: %j", (l) => expect(classifyGalleryLabel(l)).toBe("detail"));
});

describe("parseGalleryImages (fixture RunRepeat)", () => {
  it("Novablast 4: banyak foto, dedupe ukuran, foto utama pertama", () => {
    const page = parseRunRepeatHtml(fixture("asics-novablast-4"));
    const imgs = page.galleryImages;
    expect(imgs.length).toBeGreaterThan(20);
    expect(imgs[0].label).toBe("primary");
    expect(imgs[0].url).toContain("product_primary/40234/");
    expect(new Set(imgs.map((i) => i.url)).size).toBe(imgs.length);
    expect(imgs.filter((i) => i.usable).length).toBeGreaterThanOrEqual(5);
    // hanya galeri sepatu ini (bukan sepatu "mirip")
    expect(imgs.every((i) => /\/(40234)\//.test(i.url))).toBe(true);
    // ukuran tidak ada yang thumbnail 120 bila ada versi lebih besar
    expect(imgs.some((i) => i.url.endsWith("-120.jpg"))).toBe(false);
  });

  it("Speedgoat 5: gambar uji lab tidak usable", () => {
    const imgs = parseRunRepeatHtml(fixture("hoka-speedgoat-5")).galleryImages;
    const smoke = imgs.find((i) => i.url.includes("breathability-smoke-test"));
    expect(smoke?.kind).toBe("lab");
    expect(smoke?.usable).toBe(false);
    expect(imgs.filter((i) => i.usable).length).toBeGreaterThanOrEqual(1);
  });

  it("HTML tanpa galeri → []", () => expect(parseGalleryImages("<html></html>")).toEqual([]));
});
