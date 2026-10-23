/**
 * audit-images.ts — cek kelengkapan foto referensi (tabel shoe_images). READ-ONLY.
 *
 *   npm run images:audit                 # ringkasan + sepatu dengan foto kurang
 *   npm run images:audit -- --sheet      # + tulis scripts/report/contact-sheet.html (cek mata)
 *   npm run images:audit -- --min 4      # ubah ambang minimal foto usable (default 3)
 *
 * Exit code 1 bila ada sepatu di bawah ambang.
 */
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shoes, shoeImages } from "../src/db/schema";

try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

export interface ImageRow {
  shoeId: string;
  url: string;
  kind: string;
  label: string;
  usable: boolean;
}

export interface ShoeImageStats {
  id: string;
  usable: number;
  detail: number;
  lab: number;
  total: number;
  low: boolean;
}

/** Hitung statistik per sepatu (murni → mudah dites). Sepatu tanpa foto tetap muncul dengan 0. */
export function summarize(shoeIds: string[], rows: ImageRow[], minUsable = 3): ShoeImageStats[] {
  const stats = new Map<string, ShoeImageStats>();
  for (const id of shoeIds) stats.set(id, { id, usable: 0, detail: 0, lab: 0, total: 0, low: false });
  for (const r of rows) {
    const s = stats.get(r.shoeId);
    if (!s) continue;
    s.total++;
    if (r.usable) s.usable++;
    if (r.kind === "detail") s.detail++;
    if (r.kind === "lab") s.lab++;
  }
  const out = Array.from(stats.values());
  for (const s of out) s.low = s.usable < minUsable;
  return out.sort((a, b) => a.usable - b.usable || a.id.localeCompare(b.id));
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Halaman HTML statis: tiap sepatu → thumbnail (usable = hijau, lain = redup) untuk dicek mata. */
export function renderContactSheet(stats: ShoeImageStats[], rows: ImageRow[]): string {
  const byShoe = new Map<string, ImageRow[]>();
  for (const r of rows) byShoe.set(r.shoeId, [...(byShoe.get(r.shoeId) ?? []), r]);
  const sections = stats
    .map((s) => {
      const imgs = (byShoe.get(s.id) ?? [])
        .map(
          (r) =>
            `<figure class="${r.usable ? "ok" : "no"}"><img loading="lazy" src="${esc(r.url)}" alt=""><figcaption>${esc(r.kind)}${
              r.label ? ` · ${esc(r.label)}` : ""
            }</figcaption></figure>`
        )
        .join("");
      return `<section><h2>${esc(s.id)} <small>usable ${s.usable} · detail ${s.detail} · lab ${s.lab}${s.low ? " ⚠️" : ""}</small></h2><div class="grid">${imgs}</div></section>`;
    })
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Contact sheet foto referensi</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}h2{margin:24px 0 8px}small{color:#9ca3af;font-weight:400}
.grid{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:160px}img{width:160px;height:110px;object-fit:cover;border-radius:6px;border:3px solid transparent}
.ok img{border-color:#10b981}.no img{opacity:.45}figcaption{font-size:11px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style>
<h1>Foto referensi per sepatu</h1><p>Hijau = dipakai embedding, redup = tidak.</p>${sections}`;
}

async function main() {
  const args = process.argv.slice(2);
  const minIdx = args.indexOf("--min");
  const minUsable = minIdx >= 0 ? Math.max(1, parseInt(args[minIdx + 1], 10) || 3) : 3;
  const url = process.env.TURSO_DATABASE_URL || "file:./data/shoes.db";
  const db = drizzle(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined }));

  const shoeRows = await db.select({ id: shoes.id }).from(shoes);
  const imageRows = (await db.select().from(shoeImages)) as ImageRow[];
  const stats = summarize(
    shoeRows.map((s) => s.id),
    imageRows,
    minUsable
  );

  const low = stats.filter((s) => s.low);
  console.log(`DB: ${url}`);
  console.log(`Sepatu: ${stats.length} | Foto: ${imageRows.length} | usable: ${imageRows.filter((r) => r.usable).length}`);
  console.log(`Kurang dari ${minUsable} foto usable: ${low.length}`);
  for (const s of low) console.log(`  ⚠️  ${s.id}: usable ${s.usable}, detail ${s.detail}, lab ${s.lab}`);

  if (args.includes("--sheet")) {
    const out = path.resolve(process.cwd(), "scripts/report/contact-sheet.html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, renderContactSheet(stats, imageRows));
    console.log(`Contact sheet: ${out}`);
  }
  process.exit(low.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
