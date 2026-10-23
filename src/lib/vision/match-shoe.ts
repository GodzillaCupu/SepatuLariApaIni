import { normalizeName } from "../text";
import type { Detection } from "./schema";

export interface CatalogEntry {
  id: string;
  brand: string;
  model: string;
  releaseYear?: number | null;
}

export interface Candidate {
  id: string;
  score: number;
}

export interface MatchResult {
  /** id sepatu bila cukup yakin; selain itu null. */
  matchId: string | null;
  candidates: Candidate[];
}

export const MATCH_THRESHOLD = 0.8;
export const CANDIDATE_THRESHOLD = 0.5;
/** Selisih minimal skor #1 vs #2 agar dianggap pasti (hindari "Superblast" vs "Superblast 2"). */
export const MATCH_MARGIN = 0.05;

/** Singkatan umum → bentuk penuh ("SC Rebel" ≈ "SuperComp Rebel"). */
const ALIASES: Record<string, string> = { sc: "supercomp", fc: "fuelcell" };
/** Kata lini produk yang menempel di banyak model; bobotnya kecil agar tidak mendominasi kecocokan. */
const GENERIC = new Set(["fuelcell", "fresh", "foam", "x"]);
const GENERIC_WEIGHT = 0.3;
const weight = (t: string) => (GENERIC.has(t) ? GENERIC_WEIGHT : 1);

/** "v13" ≈ "13"; "1080v13" dipecah jadi "1080 v13"; "super comp" → "supercomp"; "sc" → "supercomp". */
function tokens(s: string): string[] {
  return normalizeName(s)
    .replace(/\bsuper comp\b/g, "supercomp")
    .replace(/(\d)v(\d)/g, "$1 v$2")
    .split(" ")
    .filter(Boolean)
    .map((t) => ALIASES[t] ?? t.replace(/^v(\d+)$/, "$1"));
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  let sizeA = 0;
  let sizeB = 0;
  a.forEach((x) => {
    sizeA += weight(x);
    if (b.has(x)) inter += weight(x);
  });
  b.forEach((x) => (sizeB += weight(x)));
  return (2 * inter) / (sizeA + sizeB);
}

function bigrams(s: string): Set<string> {
  const t = normalizeName(s).replace(/ /g, "");
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

/** Kemiripan teks 0–1: max(Dice token, Dice bigram karakter) → toleran typo & urutan kata. */
export function textSimilarity(a: string, b: string): number {
  if (!normalizeName(a) || !normalizeName(b)) return 0;
  return Math.max(dice(new Set(tokens(a)), new Set(tokens(b))), dice(bigrams(a), bigrams(b)));
}

/** Ada kata model non-generik & non-angka yang sama (bukan sekadar bigram karakter mirip). */
function sharesKeyword(a: string, b: string): boolean {
  const key = (s: string) => tokens(s).filter((t) => !GENERIC.has(t) && !/^\d+$/.test(t));
  const kb = new Set(key(b));
  return key(a).some((t) => kb.has(t));
}

function scoreParts(d: Pick<Detection, "brand" | "model" | "releaseYear">, e: CatalogEntry) {
  const brandSim = textSimilarity(d.brand, e.brand);
  const modelSim = textSimilarity(d.model, e.model);
  const yearBonus = d.releaseYear && e.releaseYear && d.releaseYear === e.releaseYear ? 0.05 : 0;
  return { score: Math.min(1, 0.3 * brandSim + 0.7 * modelSim + yearBonus), modelSim };
}

export function scoreEntry(d: Pick<Detection, "brand" | "model" | "releaseYear">, e: CatalogEntry): number {
  return scoreParts(d, e).score;
}

/** Typo ("Speedgoat5") lolos lewat kemiripan karakter tinggi; selain itu wajib berbagi kata kunci model. */
const TYPO_MODEL_SIM = 0.7;

export function matchShoe(detection: Detection, catalog: CatalogEntry[]): MatchResult {
  const unknown = (s: string) => normalizeName(s) === "unknown" || !normalizeName(s);
  if (unknown(detection.brand) && unknown(detection.model)) return { matchId: null, candidates: [] };

  const ranked = catalog
    .map((e) => ({ e, ...scoreParts(detection, e) }))
    .filter((r) => r.modelSim >= TYPO_MODEL_SIM || sharesKeyword(detection.model, r.e.model))
    .map((r) => ({ id: r.e.id, score: Math.round(r.score * 100) / 100 }))
    .sort((a, b) => b.score - a.score);

  const [first, second] = ranked;
  const sure =
    !!first &&
    first.score >= MATCH_THRESHOLD &&
    (!second || first.score - second.score >= MATCH_MARGIN) &&
    detection.confidence >= 0.4;

  return {
    matchId: sure ? first.id : null,
    candidates: ranked.filter((r) => r.score >= CANDIDATE_THRESHOLD).slice(0, 3),
  };
}
