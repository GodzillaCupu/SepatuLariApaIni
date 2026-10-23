/**
 * eval-vision.ts — ukur akurasi prediktor (top-1/3/5) terhadap indeks hasil embed-catalog.
 *
 *   npm run vision:eval -- --model clip
 *   npm run vision:eval -- --model dinov2 --write      # tulis tabel ke docs/vision-eval.md
 *
 * Dua set uji:
 *  1) EKSTERNAL — foto yang TIDAK dipakai membangun indeks:
 *       data/eval/<shoeId>/*.{jpg,png,webp}  +  foto di folder induk proyek dengan label manual (EXTRA_CASES)
 *  2) LEAVE-ONE-OUT — tiap foto referensi jadi query, foto itu + cerminnya dikeluarkan dari indeks.
 *     Optimistis (foto satu sesi mirip), tapi mengukur kebingungan antar-sepatu.
 */
import * as fs from "fs";
import * as path from "path";
import { dequantizeInt8, rankShoes, type IndexRow } from "../src/lib/vision/ondevice/vector";
import { loadEmbedder } from "./lib/vision-embed";

const OUT = path.resolve(process.cwd(), "public/vision");
const PARENT = path.resolve(process.cwd(), "..");

/** Foto uji manual di folder induk (label dipastikan dari gambar). */
const EXTRA_CASES: { file: string; shoeId: string }[] = [
  { file: path.join(PARENT, "Superblast-testImage.jpg"), shoeId: "asics-superblast-3" },
  { file: path.join(PARENT, "NB-SCRebel-testImage.jpg"), shoeId: "new-balance-supercomp-rebel" },
];

interface Manifest {
  version: number;
  model: { name: string };
  dim: number;
  count: number;
  rows: { shoeId: string; photo: number; mirrored: boolean; kind: string }[];
}

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function loadIndex(model: string) {
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(OUT, `manifest-${model}-v1.json`), "utf8"));
  const bin = fs.readFileSync(path.join(OUT, `index-${model}-v1.bin`));
  const { dim, count } = manifest;
  const rows: (IndexRow & { photo: number; kind: string })[] = [];
  for (let i = 0; i < count; i++) {
    const q = new Int8Array(bin.buffer, bin.byteOffset + i * dim, dim);
    rows.push({ shoeId: manifest.rows[i].shoeId, photo: manifest.rows[i].photo, kind: manifest.rows[i].kind, vector: dequantizeInt8(q) });
  }
  return { manifest, rows };
}

interface Tally {
  n: number;
  top1: number;
  top3: number;
  top5: number;
}
const pct = (a: number, n: number) => (n ? `${((a / n) * 100).toFixed(0)}%` : "-");
function addTo(t: Tally, rank: number) {
  t.n++;
  if (rank === 0) t.top1++;
  if (rank >= 0 && rank < 3) t.top3++;
  if (rank >= 0 && rank < 5) t.top5++;
}

async function main() {
  const model = arg("--model", "clip");
  const write = process.argv.includes("--write");
  const { manifest, rows } = loadIndex(model);
  const shoesInIndex = new Set(rows.map((r) => r.shoeId));
  console.log(`Indeks ${model}: ${rows.length} vektor, ${shoesInIndex.size} sepatu, dim ${manifest.dim}`);

  // 1) EKSTERNAL
  const embedder = await loadEmbedder(model);
  const cases: { file: string; shoeId: string }[] = [...EXTRA_CASES.filter((c) => fs.existsSync(c.file))];
  const evalDir = path.resolve(process.cwd(), "data/eval");
  if (fs.existsSync(evalDir)) {
    for (const id of fs.readdirSync(evalDir)) {
      const dir = path.join(evalDir, id);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) if (/\.(jpe?g|png|webp)$/i.test(f)) cases.push({ file: path.join(dir, f), shoeId: id });
    }
  }
  const ext: Tally = { n: 0, top1: 0, top3: 0, top5: 0 };
  console.log(`\n== EKSTERNAL (${cases.length} foto) ==`);
  for (const c of cases) {
    if (!shoesInIndex.has(c.shoeId)) {
      console.log(`  ⏭  ${path.basename(c.file)}: ${c.shoeId} tidak ada di indeks`);
      continue;
    }
    const q = await embedder.embed(c.file);
    const top = rankShoes(q, rows, { topK: 5 });
    const rank = top.findIndex((p) => p.shoeId === c.shoeId);
    addTo(ext, rank);
    console.log(`  ${rank === 0 ? "✅" : rank > 0 ? "🟡" : "❌"} ${path.basename(c.file)} (benar: ${c.shoeId}) → ${top.map((p) => p.shoeId).join(" | ")}`);
  }

  // 2) LEAVE-ONE-OUT — varian: query semua foto vs hanya foto sepatu utuh ("product"),
  //    referensi = indeks penuh vs hanya foto "product" (mengukur apakah foto detail/lab menolong atau mencemari).
  function loo(queryKinds: "all" | "product", refKinds: "all" | "product") {
    const t: Tally = { n: 0, top1: 0, top3: 0, top5: 0 };
    const confusions = new Map<string, number>();
    const ref = refKinds === "all" ? rows : rows.filter((r) => r.kind === "product");
    const photos = new Map<number, { shoeId: string; idx: number }>();
    rows.forEach((r, i) => {
      if (manifest.rows[i].mirrored) return;
      if (queryKinds === "product" && r.kind !== "product") return;
      photos.set(r.photo, { shoeId: r.shoeId, idx: i });
    });
    const perShoe = new Map<string, number>();
    ref.forEach((r) => perShoe.set(r.shoeId, (perShoe.get(r.shoeId) ?? 0) + 1));
    photos.forEach((p, photo) => {
      const rest = ref.filter((r) => r.photo !== photo);
      if (!rest.some((r) => r.shoeId === p.shoeId)) return; // tak ada pembanding sesudah dikeluarkan
      const top = rankShoes(rows[p.idx].vector, rest, { topK: 5 });
      const rank = top.findIndex((x) => x.shoeId === p.shoeId);
      addTo(t, rank);
      if (rank !== 0) {
        const key = `${p.shoeId} → ${top[0].shoeId}`;
        confusions.set(key, (confusions.get(key) ?? 0) + 1);
      }
    });
    return { t, confusions };
  }
  const variants = [
    { name: "query semua → ref semua", q: "all", r: "all" },
    { name: "query product → ref semua", q: "product", r: "all" },
    { name: "query product → ref product saja", q: "product", r: "product" },
  ] as const;
  const looResults = variants.map((v) => ({ ...v, ...loo(v.q, v.r) }));
  console.log("\n== LEAVE-ONE-OUT ==");
  for (const v of looResults) console.log(`  ${v.name.padEnd(34)} n=${String(v.t.n).padEnd(5)} top-1 ${pct(v.t.top1, v.t.n)} | top-3 ${pct(v.t.top3, v.t.n)} | top-5 ${pct(v.t.top5, v.t.n)}`);
  const main_ = looResults[1];
  const worst = Array.from(main_.confusions.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (worst.length) console.log("  Salah-tebak tersering (query product → ref semua):\n" + worst.map(([k, v]) => `    ${v}× ${k}`).join("\n"));
  const looMain = main_.t;

  console.log(`\nEKSTERNAL top-1 ${pct(ext.top1, ext.n)} | top-3 ${pct(ext.top3, ext.n)} | top-5 ${pct(ext.top5, ext.n)}  (n=${ext.n})`);

  if (write) {
    const file = path.resolve(process.cwd(), "docs/vision-eval.md");
    const header = `# Evaluasi prediktor visual\n\nDihasilkan \`npm run vision:eval -- --write\`. Eksternal = foto di luar indeks (data/eval + 2 foto uji manual). LOO = query foto sepatu utuh (kind=product), referensi indeks penuh.\n\n| Model | Tanggal | Vektor | Eksternal n | Ext top-1 | Ext top-3 | Ext top-5 | LOO n | LOO top-1 | LOO top-3 | LOO top-5 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
    const line = `| ${model} | ${new Date().toISOString().slice(0, 10)} | ${rows.length} | ${ext.n} | ${pct(ext.top1, ext.n)} | ${pct(ext.top3, ext.n)} | ${pct(ext.top5, ext.n)} | ${looMain.n} | ${pct(looMain.top1, looMain.n)} | ${pct(looMain.top3, looMain.n)} | ${pct(looMain.top5, looMain.n)} |\n`;
    fs.writeFileSync(file, (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : header) + line);
    console.log(`Ditulis ke ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
