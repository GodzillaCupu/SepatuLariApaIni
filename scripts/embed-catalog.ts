/**
 * embed-catalog.ts — bangun indeks embedding katalog untuk prediktor on-device.
 *
 *   npm run vision:embed                       # model clip, semua sepatu
 *   npm run vision:embed -- --model dinov2     # model lain (clip | dinov2 | siglip)
 *   npm run vision:embed -- --only asics-novablast-4,hoka-speedgoat-5
 *   npm run vision:embed -- --accept 0.70 --max-candidates 30 --no-flip
 *
 * Alur per sepatu:
 *   seeds      = foto shoe_images.usable=1 (sepatu utuh)   → disaring keepInliers
 *   candidates = foto detail/lab (label nama file tidak bisa dipercaya)
 *                → diterima bila cosine ke centroid seed ≥ --accept
 *   + vektor cermin (flip horizontal) tiap foto terpilih (sepatu kiri/kanan)
 * Output: public/vision/index-<model>-v1.bin (Int8, L2-norm × 127) + manifest-<model>-v1.json
 * Hanya vektor yang keluar; foto diunduh ke .cache/vision/images/ (gitignore).
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import sharp from "sharp";
import { shoeImages } from "../src/db/schema";
import { quantizeInt8, selectReferenceVectors } from "../src/lib/vision/ondevice/vector";
import { loadEmbedder } from "./lib/vision-embed";

try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

const CACHE_DIR = path.resolve(process.cwd(), ".cache/vision/images");
const OUT_DIR = path.resolve(process.cwd(), "public/vision");
const INDEX_VERSION = 1;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name: string) => process.argv.includes(name);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Unduh sekali ke cache (nama = hash URL). Mengembalikan path lokal atau null bila gagal. */
async function fetchToCache(url: string): Promise<string | null> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, crypto.createHash("sha1").update(url).digest("hex") + ".jpg");
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (LariYuk vision-embed; personal project)" } });
    if (!res.ok) return null;
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    await sleep(150); // sopan ke CDN
    return file;
  } catch {
    return null;
  }
}

async function main() {
  const modelName = arg("--model", "clip");
  const accept = parseFloat(arg("--accept", "0.72"));
  const maxCandidates = parseInt(arg("--max-candidates", "30"), 10);
  const only = arg("--only", "").split(",").filter(Boolean);
  const flip = !has("--no-flip");

  const url = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
  const db = drizzle(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined }));
  const all = await db.select().from(shoeImages);
  const byShoe = new Map<string, typeof all>();
  for (const r of all) {
    if (only.length && !only.includes(r.shoeId)) continue;
    byShoe.set(r.shoeId, [...(byShoe.get(r.shoeId) ?? []), r]);
  }
  console.log(`DB ${url} | ${byShoe.size} sepatu | model ${modelName} | accept ${accept} | flip ${flip}`);

  const embedder = await loadEmbedder(modelName);
  const rows: { shoeId: string; photo: number; source: string; kind: string; label: string; mirrored: boolean }[] = [];
  let photoSeq = 0;
  const vectors: Int8Array[] = [];
  const report: { shoeId: string; seeds: number; accepted: number; rejected: number }[] = [];

  async function embedFile(file: string, mirrored: boolean): Promise<Float32Array> {
    if (!mirrored) return embedder.embed(file);
    const buf = await sharp(file).flop().jpeg({ quality: 92 }).toBuffer();
    return embedder.embed(new Blob([buf], { type: "image/jpeg" }));
  }

  let n = 0;
  for (const [shoeId, imgs] of Array.from(byShoe.entries())) {
    n++;
    const seedsImgs = imgs.filter((i) => i.usable);
    const candImgs = imgs
      .filter((i) => !i.usable && i.source !== "own")
      .sort((a, b) => Number(a.kind === "lab") - Number(b.kind === "lab"))
      .slice(0, maxCandidates);

    const load = async (list: typeof imgs) => {
      const out: { img: (typeof imgs)[number]; file: string; vec: Float32Array }[] = [];
      for (const img of list) {
        const file = await fetchToCache(img.url);
        if (!file) continue;
        try {
          out.push({ img, file, vec: await embedFile(file, false) });
        } catch (err) {
          console.warn(`  ⚠️ ${shoeId}: gagal embed ${img.url.split("/").pop()}: ${(err as Error).message}`);
        }
      }
      return out;
    };
    const seeds = await load(seedsImgs);
    const cands = await load(candImgs);
    const sel = selectReferenceVectors(
      seeds.map((s) => s.vec),
      cands.map((c) => c.vec),
      { accept }
    );
    const chosen = [...sel.seeds.map((i) => seeds[i]), ...sel.candidates.map((i) => cands[i])];

    for (const c of chosen) {
      const photo = photoSeq++;
      rows.push({ shoeId, photo, source: c.img.source, kind: c.img.kind, label: c.img.label, mirrored: false });
      vectors.push(quantizeInt8(c.vec));
      if (flip) {
        rows.push({ shoeId, photo, source: c.img.source, kind: c.img.kind, label: c.img.label, mirrored: true });
        vectors.push(quantizeInt8(await embedFile(c.file, true)));
      }
    }
    report.push({ shoeId, seeds: sel.seeds.length, accepted: sel.candidates.length, rejected: cands.length - sel.candidates.length });
    console.log(
      `[${n}/${byShoe.size}] ${shoeId}: seed ${sel.seeds.length}/${seeds.length}, kandidat diterima ${sel.candidates.length}/${cands.length}${
        chosen.length < 3 ? "  ⚠️ <3 foto" : ""
      }`
    );
  }

  const dim = embedder.dim;
  const buf = Buffer.alloc(vectors.length * dim);
  vectors.forEach((q, i) => buf.set(Buffer.from(q.buffer, q.byteOffset, q.byteLength), i * dim));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const base = `${modelName}-v${INDEX_VERSION}`;
  fs.writeFileSync(path.join(OUT_DIR, `index-${base}.bin`), buf);
  fs.writeFileSync(
    path.join(OUT_DIR, `manifest-${base}.json`),
    JSON.stringify(
      {
        version: INDEX_VERSION,
        model: embedder.spec,
        dim,
        dtype: "int8",
        scale: 127,
        count: vectors.length,
        shoes: report.length,
        builtAt: new Date().toISOString(),
        rows,
      },
      null,
      0
    )
  );
  const low = report.filter((r) => r.seeds + r.accepted < 3);
  console.log(`\n✅ ${vectors.length} vektor × ${dim} dim → public/vision/index-${base}.bin (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log(`   Sepatu dengan <3 foto terpakai: ${low.length}${low.length ? " → " + low.map((r) => r.shoeId).join(", ") : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
