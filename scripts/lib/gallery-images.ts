/**
 * Parser murni galeri foto RunRepeat (tanpa network / DB → mudah dites).
 *
 * Pola URL: https://cdn.runrepeat.com/storage/gallery/product_content/<productId>/<slug>-<deskriptor>-<imageId>-<ukuran>.jpg
 *  - ukuran: 120 | 250 | 720 | 1080 | 1440 | main  (satu foto bisa muncul di banyak ukuran)
 *  - deskriptor kosong atau angka ("-2", "-3") = foto sepatu biasa
 *  - deskriptor lain ("cutting", "stack", "breathability-smoke-test", …) = gambar uji lab / grafik
 *
 * Label di nama file hanya PETUNJUK awal (hasil kalibrasi manual: "outsole" ternyata frame video
 * gerinda, "stack" ternyata foto lari). Penyaringan akhir dilakukan saat embedding (outlier terhadap
 * centroid sepatu). Kind:
 *  - product : foto sepatu utuh (foto utama product_primary, deskriptor kosong/angka, "review")
 *  - detail  : foto bagian (toebox, tongue, outsole, …) — kualitas tidak pasti, usable=false dulu
 *  - lab     : gambar/frame uji lab (smoke, dremel, microscope, …) — jangan dipakai
 */

export type GalleryImageKind = "product" | "detail" | "lab";

export interface GalleryImage {
  /** URL terbaik yang teramati di HTML (prefer ≥720px). */
  url: string;
  kind: GalleryImageKind;
  /** Pakai untuk embedding pengenalan visual (hanya foto sepatu bersih). */
  usable: boolean;
  /** Deskriptor dari nama file ("" untuk foto polos). */
  label: string;
}

const IMG_RE =
  /https:\/\/cdn\.runrepeat\.com\/storage\/gallery\/product_content\/(\d+)\/([A-Za-z0-9_-]+?)-(\d+)-(120|250|720|1080|1440|main)\.(?:jpe?g|png|webp)/g;

/** Urutan preferensi ukuran: cukup besar untuk embedding 224px, tapi tidak boros. */
const SIZE_PREFERENCE = ["720", "1080", "1440", "main", "250", "120"];

/** Deskriptor = bagian di antara slug sepatu dan id gambar. Angka murni / kosong → foto biasa. */
function labelOf(stem: string, shoeSlug: string): string {
  const rest = stem.startsWith(shoeSlug) ? stem.slice(shoeSlug.length) : stem;
  return rest.replace(/^-+|-+$/g, "");
}

const LAB_RE =
  /smoke|light|dremel|microscope|hole|cutting|flex|torsion|stiffness|stability|durability|thickness|measure|weight|scale|test|transparency|energy|shock|softness|drop|foam|stack|width|ride|cold|durable|lightweight/;

export function classifyGalleryLabel(label: string): GalleryImageKind {
  const l = label.replace(/(^|-)\d+(?=-|$)/g, "").replace(/^-+|-+$/g, "");
  if (l === "" || l === "review" || l === "main") return "product";
  return LAB_RE.test(l) ? "lab" : "detail";
}

/**
 * @param html          HTML halaman review
 * @param shoeSlug      slug sepatu di nama file, mis. "asics-novablast-4" (opsional; diturunkan bila kosong)
 * @param primaryUrl    URL gambar utama (og:image/JSON-LD) — dipakai menentukan productId galeri yang benar
 */
export function parseGalleryImages(html: string, shoeSlug?: string, primaryUrl?: string | null): GalleryImage[] {
  const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");

  const found: { productId: string; stem: string; imageId: string; size: string }[] = [];
  for (const m of Array.from(text.matchAll(IMG_RE))) {
    found.push({ productId: m[1], stem: m[2], imageId: m[3], size: m[4] });
  }
  if (found.length === 0) return [];

  // Halaman memuat juga sepatu "mirip" (productId lain) → ambil hanya galeri sepatu ini.
  const primaryId = primaryUrl?.match(/product_content\/(\d+)\//)?.[1];
  const counts = new Map<string, number>();
  for (const f of found) counts.set(f.productId, (counts.get(f.productId) ?? 0) + 1);
  const productId = primaryId && counts.has(primaryId)
    ? primaryId
    : Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const own = found.filter((f) => f.productId === productId);

  // Slug sepatu = awalan terpanjang yang sama di semua stem (dipotong di batas kata).
  const slug = shoeSlug ?? commonSlug(own.map((f) => f.stem));

  const byKey = new Map<string, { stem: string; imageId: string; sizes: Set<string> }>();
  for (const f of own) {
    const key = `${f.stem}-${f.imageId}`;
    const entry = byKey.get(key) ?? { stem: f.stem, imageId: f.imageId, sizes: new Set<string>() };
    entry.sizes.add(f.size);
    byKey.set(key, entry);
  }

  const out: GalleryImage[] = [];
  for (const { stem, imageId, sizes } of Array.from(byKey.values())) {
    const size = SIZE_PREFERENCE.find((s) => sizes.has(s));
    if (!size) continue;
    const label = labelOf(stem, slug);
    const kind = classifyGalleryLabel(label);
    out.push({
      url: `https://cdn.runrepeat.com/storage/gallery/product_content/${productId}/${stem}-${imageId}-${size}.jpg`,
      kind,
      usable: kind === "product",
      label,
    });
  }
  // Foto utama (product_primary) = foto studio terbersih → selalu pertama.
  if (primaryUrl && /product_primary\//.test(primaryUrl) && !out.some((o) => o.url === primaryUrl)) {
    out.push({ url: primaryUrl, kind: "product", usable: true, label: "primary" });
  }
  // Foto polos dulu (paling berguna), lalu urut stabil menurut URL.
  return out.sort((a, b) => Number(b.label === "primary") - Number(a.label === "primary") || Number(b.usable) - Number(a.usable) || a.url.localeCompare(b.url));
}

/** Slug sepatu = awalan token yang dimiliki semua stem (token-wise, bukan karakter-wise). */
function commonSlug(stems: string[]): string {
  if (stems.length === 0) return "";
  const tokens = stems.map((s) => s.split("-"));
  const first = tokens[0];
  let n = first.length;
  for (const t of tokens) {
    let i = 0;
    while (i < n && i < t.length && t[i] === first[i]) i++;
    n = i;
  }
  // Satu stem saja / semua identik → seluruhnya dianggap slug (tanpa deskriptor).
  return first.slice(0, Math.max(n, 1)).join("-");
}
