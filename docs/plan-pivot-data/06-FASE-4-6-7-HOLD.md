# Fase 4, 6, 7 (HOLD) dan Fase 8

> Ditahan sesuai keputusan pemilik. Dokumen ini menyimpan rencana agar tidak hilang, **bukan** perintah eksekusi.

## 1. Mengapa HOLD

| Fase | Penyebab | Pemicu rilis HOLD |
|---|---|---|
| **4** Mesin estimasi | Struktur data baru belum diputuskan | Pemilik menjawab pertanyaan §6 di [`02-FASE-1-DRAFT-SKEMA-DATA.md`](02-FASE-1-DRAFT-SKEMA-DATA.md) |
| **6** UI/API/dokumen publik | Bergantung data pabrikan (Fase 3), estimasi (4), foto (5) | Minimal 1 brand pilot `published` + keputusan skema |
| **7** Cutover & pembersihan | Data lama baru boleh dibuang saat pengganti siap | Fase 6 siap tayang + data baru lolos audit |

Catatan: karena repo **publik**, bagian git dari Fase 7 (lihat §4.4) layak dipertimbangkan dipercepat terpisah dari cutover data — lihat [`00-README-OVERVIEW.md`](00-README-OVERVIEW.md) §5 (usulan "mitigasi cepat", menunggu persetujuan).

## 2. Fase 4 — Mesin Estimasi (Opsi 1)

**Prasyarat:** skema final (Fase 1) + data pabrikan pilot (Fase 3).

- `src/lib/estimate/rules.ts`: aturan deterministik berversi (`rule_id`, `rule_version`), contoh `foam=PEBA → Plush`; stack + plate + berat → kategori/pace. Dasar: pengetahuan umum material/biomekanik dan spesifikasi, **bukan** menyalin label RunRepeat. Dokumentasi publik: `CARA-KAMI-MENILAI.md`.
- Tulis ulang [`scripts/lib/classify-shoe.ts`](../../scripts/lib/classify-shoe.ts) → `classifyFromSpecs(specs)`: buang input `articleText`, `verdictSummary`, `pros`, `cons`, `paceTags`, `typeFact`, `archSupport`.
- [`scripts/lib/classify-fit.ts`](../../scripts/lib/classify-fit.ts): fit/sizing → `unknown` sampai ada sumber sendiri; breathability boleh estimasi dari `upper_material` pabrikan, berlabel estimasi.
- Teks deskripsi dari **template** terstruktur, tanpa LLM menulis ulang teks sumber; `pros/cons` turunan aturan.
- Test: golden test input→output tiap aturan; test tidak ada impor teks sumber.
- Label hasil: `Estimasi LariYuk`, bukan hasil lab.

## 3. Fase 6 — UI, API, Dokumen Publik

| Area | Pekerjaan |
|---|---|
| [`ShoeDetailModal.tsx`](../../src/components/ShoeDetailModal.tsx) | Ganti pros/cons + tombol "Lihat Data Lab Lengkap di RunRepeat" → tabel spec berlabel "Menurut pabrikan" / "Estimasi LariYuk", tanggal ambil data, tombol "Beli di toko resmi" (+disclosure afiliasi), kolom kosong "belum tersedia" |
| `ShoeCard`, `bandingkan/page.tsx`, `ScanShoeSheet` | Tahan `imageUrl` null, nilai `NULL` pada tabel perbandingan |
| [`shoe.service.ts`](../../src/services/shoe.service.ts), `src/types/index.ts` | Filter `data_status='published'`, mapping field baru, hanya gambar berlisensi |
| [`fallback-shoes.ts`](../../src/data/fallback-shoes.ts) | Ganti 6 sepatu: data pabrikan, tanpa `sourceUrl` runrepeat |
| `src/app/api/shoes` | `limit` maksimum + paginasi, tanpa kolom provenance, tanpa dump penuh |
| Halaman baru | `/sumber-data`, `/cara-menilai`, Kebijakan Privasi (UU PDP: Web3Forms, kamera, Gemini), Syarat Penggunaan + disclaimer "tidak berafiliasi", kontak takedown di `SiteFooter.tsx`, `/bot` |
| Kill switch | `data_status='takedown'` / `brand_sources.enabled` |
| Dokumen | README (pisah lisensi MIT kode vs data/foto, hapus klaim "lab independen RunRepeat"), `PRD.md`, `PROJECT_NOTES.md`, `ARCHITECTURE.md`, `ADR-002`, `scripts/README.md`, `CHANGELOG.md` |

Gerbang tayang: checklist §4.9 di [`LEGAL-PANDUAN-OPERASIONAL-DATA.md`](../Legal%20document/LEGAL-PANDUAN-OPERASIONAL-DATA.md).

## 4. Fase 7 — Cutover & Pembersihan (urut)

1. Isi DB lokal dari pipeline baru → `npm run db:audit` (diperbarui untuk skema baru) → review manual semua `needs_review` → `published`.
2. Turso produksi: snapshot dulu → ganti data mengikuti [`../DB-SYNC-TURSO.md`](../DB-SYNC-TURSO.md); `DELETE FROM shoe_images WHERE source='runrepeat'`; verifikasi tak ada baris lama.
3. Hapus berkas: `scripts/scrape-runrepeat.ts`, `scrape-bulk.ts`, `lib/runrepeat-parser.ts`, `lib/gallery-images.ts`, `urls.json`, `scripts/__fixtures__/*.html`, `audit-images.ts` (jika terikat), `data/*.bak`, `data/*.sql`, `public/vision/*` lama, script `scrape*` di `package.json`, `remotePatterns` runrepeat.
4. **Git (repo publik):** `git rm` lalu `git filter-repo --invert-paths` untuk fixtures, `public/vision/index-siglip-v1.bin`, `manifest-siglip-v1.json`, `data/*.bak`; force-push; minta GitHub membersihkan cache/PR refs. ⚠️ Destruktif & mengubah history publik — **butuh konfirmasi eksplisit** sebelum dijalankan; lakukan di klon cadangan dulu. Fork/clone pihak lain tak bisa dikendalikan.
5. Cache: naikkan versi service worker, purge Vercel/CDN, versi baru key IndexedDB embedding.
6. Catat tanggal & isi pembersihan di `LOG-PEMBERSIHAN.md`.
7. Verifikasi akhir: `grep -ri runrepeat` (kode+docs, kecuali `Legal document/` dan folder rencana ini) = 0; `SELECT COUNT(*) FROM shoe_images WHERE source='runrepeat'` = 0; tidak ada request ke `runrepeat.com` di Network tab; `next build` dan `npm test` hijau.

**Bila somasi/klaim datang sebelum/selama Fase 7:** hentikan penghapusan, legal hold, hubungi advokat.

## 5. Fase 8 — Berkelanjutan (disetujui)
- Review `robots.txt`/ToS tiap brand per kuartal; simpan salinan bertanggal.
- Refresh data terjadwal + penanda kedaluwarsa (`specs_retrieved_at`).
- SLA takedown 24–72 jam, balasan tertulis.
- UGC (rating fit dari pengguna) menggantikan `fit_votes` — **bukan** Opsi 3 (sosmed/berita tetap ditunda).
- Risk register ditinjau saat model bisnis berubah (iklan/langganan/afiliasi).
