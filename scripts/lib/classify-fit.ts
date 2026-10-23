/**
 * DEFINISI SENDIRI: sizing & breathability. Sumber kebenaran tunggal — ubah
 * ambang/aturan di sini, semua scrape berikutnya ikut.
 *
 * ── SIZING ─────────────────────────────────────────────────────────────────
 * Dua sumbu terpisah:
 *  - lengthFit (panjang) dari voting pembeli RunRepeat. Ada 5 bar distribusi:
 *      idx 0,1 → runs_small | idx 2 → true_to_size | idx 3,4 → runs_large.
 *    Teks voting ("fits slightly small") dipakai lebih dulu bila ada; "slightly" dihitung sama
 *    dengan small/large. Voting < MIN_FIT_VOTES dianggap tidak cukup → unknown.
 *  - widthFit (lebar) dari lab: baris "Width / fit" (utama), lalu "Toebox width".
 *      Narrow → narrow | Medium/Average/Standard → standard | Wide → wide.
 * Hasil gabungan `sizing` (yang tampil di UI), urutan prioritas:
 *  1. lengthFit menyimpang (runs_small / runs_large)  → itu
 *  2. widthFit narrow / wide                          → itu
 *  3. lengthFit true_to_size                          → true_to_size
 *  4. selain itu                                      → unknown
 * Artinya "true_to_size" = panjang pas DAN lebar standar.
 *
 * ── BREATHABILITY (adem/panas, konteks bahan upper) ────────────────────────
 *  cool     = upper terbuka/berventilasi (label lab "Breathable", skor ≥ 4)
 *  moderate = cukup (label "Moderate", skor 3)
 *  warm     = upper rapat/tertutup (label "Warm"/"Poor", skor ≤ 2, atau
 *             membran waterproof / Gore-Tex)
 * Prioritas bukti: label lab → skor numerik → kata kunci bahan upper.
 */

export const MIN_FIT_VOTES = 20;

export type LengthFit = "runs_small" | "true_to_size" | "runs_large" | "unknown";
export type WidthFit = "narrow" | "standard" | "wide" | "unknown";
export type Sizing = "true_to_size" | "narrow" | "wide" | "runs_small" | "runs_large" | "unknown";
export type Breathability = "cool" | "moderate" | "warm" | "unknown";

export function classifyLengthFit(
  barIndex: number | null,
  votes: number | null,
  label: string | null = null
): LengthFit {
  if (votes === null || votes < MIN_FIT_VOTES) return "unknown";
  // Teks voting ("true to size", "slightly small", "large") lebih akurat dari posisi bar.
  const t = (label ?? "").toLowerCase();
  if (/true to size/.test(t)) return "true_to_size";
  if (/small/.test(t)) return "runs_small";
  if (/large|big/.test(t)) return "runs_large";
  if (barIndex === null) return "unknown";
  if (barIndex <= 1) return "runs_small";
  if (barIndex === 2) return "true_to_size";
  return "runs_large";
}

function widthFromText(raw: string | null | undefined): WidthFit {
  const t = (raw ?? "").toLowerCase();
  if (/narrow/.test(t)) return "narrow";
  if (/wide/.test(t)) return "wide";
  if (/medium|average|standard|normal|regular/.test(t)) return "standard";
  return "unknown";
}

export function classifyWidthFit(widthFitRow: string | null, toeboxWidthRow: string | null): WidthFit {
  const primary = widthFromText(widthFitRow);
  return primary !== "unknown" ? primary : widthFromText(toeboxWidthRow);
}

export function classifySizing(length: LengthFit, width: WidthFit): Sizing {
  if (length === "runs_small" || length === "runs_large") return length;
  if (width === "narrow" || width === "wide") return width;
  if (length === "true_to_size") return "true_to_size";
  return "unknown";
}

/** Bahan upper yang membuat sepatu panas (rapat / membran). */
const WARM_UPPER = /gore-?tex|gtx|waterproof|weatherproof|membrane|water[- ]resistant|winter|insulated/i;
const COOL_UPPER = /engineered mesh|open mesh|airy|ventilat|perforat|\bmesh\b|\bknit\b/i;

export function classifyBreathability(
  label: string | null,
  oldScore: number | null,
  upperText: string
): Breathability {
  const l = (label ?? "").toLowerCase();
  if (/warm|hot|poor|not breathable|stuffy/.test(l)) return "warm";
  if (/moderate|average|medium/.test(l)) return "moderate";
  if (/breathable|cool|airy|excellent|good/.test(l)) return "cool";

  if (oldScore !== null && oldScore >= 1 && oldScore <= 5) {
    if (oldScore >= 4) return "cool";
    if (oldScore >= 3) return "moderate";
    return "warm";
  }

  if (WARM_UPPER.test(upperText)) return "warm";
  if (COOL_UPPER.test(upperText)) return "cool";
  return "unknown";
}

/** Ringkas fakta "Material: Mesh | Reflective" → "Mesh, Reflective". */
export function normalizeUpperMaterial(materialFact: string | null | undefined): string | null {
  const parts = (materialFact ?? "")
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter((s) => s && s !== "-");
  return parts.length ? parts.join(", ") : null;
}
