import * as cheerio from "cheerio";
import type { PlateType } from "../../src/types";
import { splitBrandModel } from "./brands";
import {
  classifyBreathability,
  classifyLengthFit,
  classifySizing,
  classifyWidthFit,
  normalizeUpperMaterial,
  type Breathability,
  type LengthFit,
  type Sizing,
  type WidthFit,
} from "./classify-fit";

/**
 * Parser murni halaman review RunRepeat (tanpa network / DB → mudah dites).
 *
 * Sumber data (hasil discovery HTML RunRepeat):
 *  - Tabel perbandingan: <tr><th><span.fact-label>…</span></th><td.similar-comparison-data-first>
 *    <span.fact-value>…</span></td>…</tr>. Kolom PERTAMA = sepatu yang direview,
 *    kolom lain = sepatu mirip (JANGAN dipakai). Baris "Weight lab / Weight brand"
 *    punya 2 label & 2 value per sel.
 *  - Blok fakta: <span.rr_facts__name>Terrain:</span> + nilai di sebelahnya.
 *  - Pros/Cons: .good-bad.gb-type-good / .gb-type-bad > li
 */

export interface ParsedPage {
  title: string;
  brand: string | null;
  model: string | null;
  weightGrams: number | null;
  dropMm: number | null;
  heelStackMm: number | null;
  forefootStackMm: number | null;
  releaseYear: number | null;
  terrain: string | null;
  type: string | null;
  archSupport: string | null;
  paceTags: string[];
  softness: string | null;
  plateType: PlateType;
  foamType: string | null;
  pros: string[];
  cons: string[];
  summary: string;
  articleText: string;
  imageUrl: string | null;
  sizing: Sizing;
  lengthFit: LengthFit;
  widthFit: WidthFit;
  fitVotes: number | null;
  breathability: Breathability;
  upperMaterial: string | null;
}

const OZ_TO_G = 28.3495;

export function parseGrams(text: string | undefined): number | null {
  if (!text) return null;
  const g = text.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (g) return Math.round(parseFloat(g[1]));
  const oz = text.match(/(\d+(?:\.\d+)?)\s*oz\b/i);
  if (oz) return Math.round(parseFloat(oz[1]) * OZ_TO_G);
  return null;
}

export function parseMm(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*mm\b/i);
  return m ? parseFloat(m[1]) : null;
}

const clean = (t: string) => t.replace(/\s+/g, " ").trim();

/** label → nilai kolom pertama (sepatu itu sendiri) dari tabel perbandingan. */
function readComparisonRows($: cheerio.CheerioAPI): Map<string, string> {
  const rows = new Map<string, string>();
  $("tr").each((_, tr) => {
    const labels = $(tr)
      .find("th .fact-label")
      .map((__, el) => clean($(el).text()))
      .get();
    if (labels.length === 0) return;
    const firstCell = $(tr).find("td.similar-comparison-data-first").first();
    if (firstCell.length === 0) return;
    const values = firstCell
      .find(".fact-value")
      .map((__, el) => clean($(el).text()))
      .get();
    labels.forEach((label, i) => {
      const key = label.toLowerCase();
      if (!rows.has(key) && values[i] !== undefined) rows.set(key, values[i]);
    });
    // Baris multi-nilai tanpa label berpasangan (mis. "Pace": Daily running, Tempo)
    if (labels.length === 1 && values.length > 1) rows.set(`${labels[0].toLowerCase()}[]`, values.join("|"));
  });
  return rows;
}

/** nama fakta (tanpa ':') → teks nilai pada blok "Specs (brand)". */
function readFacts($: cheerio.CheerioAPI): Map<string, string> {
  const facts = new Map<string, string>();
  $(".rr_facts__name").each((_, el) => {
    const name = clean($(el).text()).replace(/:$/, "").toLowerCase();
    if (!name || facts.has(name)) return;
    // Nama ada di <th>, nilai di <td> pada <tr> yang sama.
    const tr = $(el).closest("tr");
    const value = clean(tr.find("td").first().text());
    facts.set(name, value);
  });
  return facts;
}

/** Voting ukuran: "… fits true to size (251 votes)" + indeks bar `.this-shoe` (0-4). */
function readFitVote($: cheerio.CheerioAPI): { votes: number | null; barIndex: number | null } {
  const votesMatch = clean($(".size-distribution-text").first().text()).match(/\((\d[\d,]*)\s+votes?\)/i);
  const votes = votesMatch ? parseInt(votesMatch[1].replace(/,/g, ""), 10) : null;
  const bars = $(".size-distribution-container .size-distribution-bar");
  const idx = bars.toArray().findIndex((el) => $(el).hasClass("this-shoe"));
  return { votes, barIndex: idx >= 0 ? idx : null };
}

/** Kalimat yang membahas plat TAPI bukan klaim bahwa sepatu ini memilikinya. */
const PLATE_NEGATIVE =
  /\b(no|not|without|lack(?:s|ing)?|doesn['’]t|don['’]t|isn['’]t|never|dislike|prefer|avoid|recommend|rather than|instead of|unlike|rivals?|alternatives?|compared|than|like the|such as|on par with|mirroring|almost|desiring|seeking|crave|satisfy)\b|plate-?(?:free|less)|non-?plated/i;
const PLATE_POSITIVE: Array<[RegExp, PlateType]> = [
  [/\b(?:has|have|features?|featuring|includes?|houses?|packs?|with|embedded|sandwich(?:es|ed)?|equipped)\b[^.]{0,50}\bcarbon(?:[- ](?:fiber|fibre))?[- ]?(?:plate|fiber|fibre)/i, "Carbon Fiber"],
  [/\bfull-length carbon\b|\bcarbon(?:[- ](?:fiber|fibre))? plate\b[^.]{0,30}\b(?:runs|sits|propels|provides|adds|delivers)/i, "Carbon Fiber"],
  // Sebutan polos "carbon plate" pada kalimat tanpa negasi/perbandingan = klaim milik sepatu ini
  [/\bcarbon(?:[- ](?:fiber|fibre))?[- ]plate\b|\bcarbon-plated\b/i, "Carbon Fiber"],
  [/\b(?:has|have|features?|featuring|includes?|houses?|packs?|with|embedded|equipped)\b[^.]{0,50}\b(?:nylon|pebax|wave)[- ]?plate/i, "Nylon"],
  [/\b(?:has|have|features?|featuring|includes?|with|embedded)\b[^.]{0,50}\btpu[- ]?plate/i, "TPU"],
];

/**
 * Deteksi plat per KALIMAT: hanya klaim positif ("has a carbon plate") yang dihitung.
 * Kalimat negasi/perbandingan ("doesn't include a carbon plate", "stiffer than carbon-plated
 * shoes", "for runners who dislike plates") diabaikan — itu penyebab false positive sebelumnya.
 */
export function detectPlate(text: string): PlateType {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const found = new Set<PlateType>();
  for (const sentence of sentences) {
    if (!/plate|carbon/i.test(sentence)) continue;
    if (PLATE_NEGATIVE.test(sentence)) continue;
    for (const [re, type] of PLATE_POSITIVE) if (re.test(sentence)) found.add(type);
  }
  if (found.has("Carbon Fiber")) return "Carbon Fiber";
  if (found.has("Nylon")) return "Nylon";
  if (found.has("TPU")) return "TPU";
  return "None";
}

/** [brand regex, foam regex, nama]. Busa hanya dicocokkan untuk brand-nya sendiri
 *  (artikel sering menyebut busa kompetitor → false positive). */
const FOAM_PATTERNS: Array<[RegExp, RegExp, string]> = [
  [/asics/, /ff blast\+ eco|ff blast\+/, "FF BLAST+ ECO"],
  [/asics/, /flytefoam/, "FlyteFoam"],
  [/nike/, /zoomx/, "ZoomX (PEBA)"],
  [/nike/, /react ?x\b/, "ReactX"],
  [/saucony/, /pwrrun pb/, "PWRRUN PB (PEBA)"],
  [/saucony/, /pwrrun\+?/, "PWRRUN"],
  [/new balance/, /fuel ?cell/, "FuelCell"],
  [/new balance/, /fresh foam x/, "Fresh Foam X"],
  [/mizuno/, /enerzy nxt/, "Mizuno Enerzy NXT"],
  [/adidas/, /lightstrike pro/, "Lightstrike Pro"],
  [/adidas/, /lightstrike/, "Lightstrike"],
  [/hoka/, /cmeva/, "CMEVA"],
  [/hoka/, /profly/, "PROFLY"],
  [/brooks/, /dna loft/, "DNA LOFT v3"],
  [/brooks/, /dna flash/, "DNA FLASH"],
  [/puma/, /nitro ?elite|nitrofoam/, "Nitrofoam"],
];

export function detectFoam(text: string, brand: string | null): string | null {
  const t = text.toLowerCase();
  const b = (brand ?? "").toLowerCase();
  for (const [brandRe, foamRe, name] of FOAM_PATTERNS) {
    if (brandRe.test(b) && foamRe.test(t)) return name;
  }
  return null;
}

/** Potong ringkasan: buang prefix "X review:" dan batasi ± 220 char di batas kalimat. */
export function shortSummary(raw: string, limit = 220): string {
  const noPrefix = clean(raw).replace(/^.{0,80}? review:\s*/i, "");
  if (noPrefix.length <= limit) return noPrefix;
  const cut = noPrefix.slice(0, limit);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
}

export function parseRunRepeatHtml(html: string): ParsedPage {
  const $ = cheerio.load(html);
  const rows = readComparisonRows($);
  const facts = readFacts($);

  const rawTitle = clean($("h1").first().text()) || clean($("title").text().split("|")[0]);
  const title = rawTitle.replace(/^cut in half:\s*/i, "").replace(/\s+review$/i, "").trim();

  const { brand, model } = splitBrandModel(title, facts.get("brand") ?? null);

  // Lab dulu; fallback ke angka brand bila lab tidak ada.
  // Label bervariasi antar halaman ("Heel lab" vs "Heel stack lab").
  const pick = (...keys: string[]) => keys.map((k) => rows.get(k)).find((v) => v !== undefined);
  const weightGrams = parseGrams(pick("weight lab")) ?? parseGrams(pick("weight brand"));
  const dropMm = parseMm(pick("drop lab")) ?? parseMm(pick("drop brand"));
  const heelStackMm =
    parseMm(pick("heel lab", "heel stack lab")) ?? parseMm(pick("heel brand", "heel stack brand"));
  const forefootStackMm =
    parseMm(pick("forefoot lab", "forefoot stack lab")) ??
    parseMm(pick("forefoot brand", "forefoot stack brand"));

  const yearMatch = (facts.get("release date") ?? "").match(/(20\d{2})/);
  const releaseYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  const pros = $(".good-bad.gb-type-good li")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter((t) => t.length > 3);
  const cons = $(".good-bad.gb-type-bad li")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter((t) => t.length > 3);

  const description =
    $("meta[name='description']").attr("content") ??
    $("meta[property='og:description']").attr("content") ??
    "";

  // Teks artikel: hanya paragraf review (bukan menu / tabel "sepatu mirip")
  const articleText = clean(
    $(".rr-text-section")
      .map((_, el) => $(el).text())
      .get()
      .join(" ")
  );

  let imageUrl: string | null = null;
  $("script[type='application/ld+json']").each((_, el) => {
    if (imageUrl) return;
    try {
      const j = JSON.parse($(el).contents().text());
      if (j?.["@type"] === "Product") {
        const img = Array.isArray(j.image) ? j.image[0] : j.image;
        if (typeof img === "string") imageUrl = img;
      }
    } catch {
      /* JSON-LD rusak → abaikan */
    }
  });
  imageUrl = imageUrl ?? $("meta[property='og:image']").attr("content") ?? null;

  const { votes: fitVotes, barIndex } = readFitVote($);
  const lengthFit = classifyLengthFit(barIndex, fitVotes);
  const widthFit = classifyWidthFit(rows.get("width / fit") ?? null, rows.get("toebox width") ?? null);
  const upperMaterial = normalizeUpperMaterial(facts.get("material"));
  const oldScoreMatch = (rows.get("breathability (old method)") ?? "").match(/\b([1-5](?:\.\d)?)\b/);
  const breathability = classifyBreathability(
    rows.get("breathability") ?? facts.get("breathability") ?? null,
    oldScoreMatch ? parseFloat(oldScoreMatch[1]) : null,
    `${upperMaterial ?? ""} ${facts.get("technology") ?? ""} ${facts.get("features") ?? ""}`
  );

  const evidence = `${articleText} ${description} ${facts.get("technology") ?? ""} ${facts.get("features") ?? ""}`;

  return {
    title,
    brand,
    model,
    weightGrams,
    dropMm,
    heelStackMm,
    forefootStackMm,
    releaseYear,
    terrain: facts.get("terrain") ?? null,
    type: facts.get("type") ?? null,
    archSupport: facts.get("arch support") ?? null,
    paceTags: (rows.get("pace[]") ?? rows.get("pace") ?? "").split("|").filter(Boolean),
    softness: rows.get("midsole softness") ?? null,
    plateType: detectPlate(evidence),
    foamType: detectFoam(evidence, brand),
    pros,
    cons,
    summary: shortSummary(description),
    articleText,
    imageUrl,
    sizing: classifySizing(lengthFit, widthFit),
    lengthFit,
    widthFit,
    fitVotes,
    breathability,
    upperMaterial,
  };
}
