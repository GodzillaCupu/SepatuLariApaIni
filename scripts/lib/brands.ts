import { normalizeName } from "../../src/lib/text";

export { normalizeName };

/**
 * Daftar brand kanonik + alias. Sumber kebenaran tunggal untuk memisah
 * "brand" dan "model" dari judul halaman (brand bisa lebih dari 1 kata,
 * mis. "New Balance", "Under Armour").
 *
 * Tambah brand baru di sini. Brand yang tidak ada di daftar (dan tidak cocok
 * dengan fakta "Brand:" di halaman) → NeedsReview, bukan ditebak.
 */
export interface BrandDef {
  /** Nama kanonik yang disimpan di DB (casing konsisten). */
  name: string;
  /** Penulisan lain di judul. Nama kanonik selalu ikut dicocokkan. */
  aliases?: string[];
}

export const BRANDS: BrandDef[] = [
  { name: "361 Degrees", aliases: ["361°", "361"] },
  { name: "Adidas" },
  { name: "Altra" },
  { name: "Anta" },
  { name: "ASICS" },
  { name: "Brooks" },
  { name: "Craft" },
  { name: "Diadora" },
  { name: "HOKA", aliases: ["Hoka One One"] },
  { name: "Inov-8", aliases: ["Inov8"] },
  { name: "Karhu" },
  { name: "La Sportiva" },
  { name: "Li-Ning", aliases: ["LiNing"] },
  { name: "Merrell" },
  { name: "Mizuno" },
  { name: "New Balance", aliases: ["NB"] },
  { name: "Nike" },
  { name: "Norda" },
  { name: "On", aliases: ["On Running"] },
  { name: "Puma" },
  { name: "Reebok" },
  { name: "Salomon" },
  { name: "Saucony" },
  { name: "Skechers" },
  { name: "Topo Athletic" },
  { name: "Under Armour", aliases: ["UA"] },
  { name: "Xtep" },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Alias → regex awalan judul. "Inov-8" cocok dengan "Inov-8", "Inov 8", "Inov8". */
const MATCHERS: Array<{ name: string; re: RegExp; len: number }> = BRANDS.flatMap((b) =>
  [b.name, ...(b.aliases ?? [])].map((alias) => {
    const tokens = normalizeName(alias).split(" ");
    const body = tokens.map(escapeRe).join("[^a-z0-9]*");
    return { name: b.name, re: new RegExp(`^${body}(?![a-z0-9])`, "i"), len: normalizeName(alias).length };
  })
).sort((a, b) => b.len - a.len); // awalan terpanjang menang ("Hoka One One" > "Hoka")

export function canonicalBrand(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = normalizeName(raw);
  for (const m of MATCHERS) {
    const hit = m.re.exec(n);
    if (hit && hit[0].length === n.length) return m.name;
  }
  return null;
}

/**
 * Pisah judul → { brand, model }.
 * 1. Awalan terpanjang dari daftar brand.
 * 2. Fakta "Brand:" halaman, jika judul diawali nama itu.
 * 3. Selain itu null (→ review manual). TIDAK PERNAH menebak kata pertama.
 */
export function splitBrandModel(
  title: string,
  brandFact: string | null
): { brand: string | null; model: string | null } {
  const t = title.trim();
  if (!t) return { brand: null, model: null };

  for (const m of MATCHERS) {
    const hit = m.re.exec(t);
    if (hit) return { brand: m.name, model: t.slice(hit[0].length).trim() || null };
  }

  if (brandFact) {
    const fact = brandFact.trim();
    if (fact && t.toLowerCase().startsWith(fact.toLowerCase())) {
      return { brand: canonicalBrand(fact) ?? fact, model: t.slice(fact.length).trim() || null };
    }
  }
  return { brand: null, model: null };
}
