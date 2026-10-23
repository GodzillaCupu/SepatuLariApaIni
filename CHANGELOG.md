# Changelog & Roadmap Pengembangan (LariYuk)

Format log ini mengikuti standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added (prediktor sepatu on-device, tahap 1–2) — 2026-10-23
- **Multi-foto per sepatu**: tabel baru `shoe_images` (`shoe_id`, `url`, `kind` product|detail|lab, `label`, `usable`, `source`; unik per shoe+url). Perlu `npm run db:push`. `shoes.image_url` tetap dipakai untuk thumbnail.
- **Parser galeri** `scripts/lib/gallery-images.ts`: ambil semua foto galeri RunRepeat (hanya galeri sepatu itu), dedupe ukuran (prefer ≥720px), klasifikasi `kind` dari nama file (hanya petunjuk awal; saringan akhir via embedding). `parseRunRepeatHtml` kini mengembalikan `galleryImages`; scraper menyimpannya (`saveGalleryImages`, kegagalan tidak menggagalkan scrape utama).
- **`--images-only`** (`scrape-bulk`, script `npm run scrape:images`): backfill hanya `shoe_images`, tabel `shoes` tidak diubah.
- **`npm run images:audit`** (`scripts/audit-images.ts`, read-only): hitung foto usable/detail/lab per sepatu, tandai < 3 usable; `--sheet` menulis `scripts/report/contact-sheet.html` untuk cek mata.
- **Matematika vektor bersama** `src/lib/vision/ondevice/vector.ts` (`l2normalize`, `keepInliers` = buang foto outlier terhadap centroid, `rankShoes` = top-K per sepatu) + tes. Dipakai script build dan (nanti) klien browser.
- **Scan on-device (UI, tahap 3)**: `ScanShoeSheet` kini memprediksi di perangkat (CLIP q8 via transformers.js/WASM → cosine ke indeks `public/vision/`), menampilkan **5 "perkiraan"** + label keyakinan (Cukup yakin / Perkiraan / Kurang yakin, tanpa persen). Gemini jadi tombol opsional "Scan lebih akurat (AI, butuh API key)" memakai foto yang sama. Modul: `src/lib/vision/ondevice/{embedder,index-store,predict,vector}.ts` + tes. Dev: tombol "Uji cepat (dev)" memakai `public/dev-samples/` (gitignored) dan panel debug skor/waktu. `next.config.mjs`: alias `sharp`/`onnxruntime-node` = false (klien) dan `@huggingface/transformers` = false (SSR). `@huggingface/transformers` dipindah ke `dependencies`.
- **ADR-002** `docs/adr/ADR-002-on-device-shoe-predictor.md` (Proposed): hybrid on-device + BYOK opsional, hasil berupa prediksi 3–5 sepatu.

### On hold
- **Foto referensi milik sendiri** (ditunda atas keputusan pemilik proyek, 2026-10-23). Rancangan bila dilanjutkan: taruh foto di `data/reference-photos/<shoeId>/*.jpg` (gitignore) → script `scripts/add-reference-photos.ts` memvalidasi `shoeId`, menulis baris `shoe_images` (`source="own"`, `kind="product"`, `usable=1`, `url="file:<path>"`) → `embed-catalog` membaca semua baris `usable=1` apa pun sumbernya, jadi pipeline tidak perlu diubah. Di repo hanya vektor (`public/vision/*`) yang masuk, foto asli tidak. HEIC dikonversi dulu (`sips -s format jpeg`). Dicabut bila hasil evaluasi top-5 < ~80%.

### Added (banding sepatu & AI Vision Scan) — 2026-10-23
- **Banding sepatu (Milestone 2)**: tombol "Bandingkan" di kartu (maks 3 sepatu) + bar melayang → halaman `/bandingkan?ids=a,b` (`src/app/bandingkan/page.tsx`). Menampilkan bar visual selisih berat/drop/stack (yang paling ringan disorot) dan baris atribut (pelat, busa, bantalan, fit, adem/panas, pace) dengan penanda "beda". Logika murni di `src/lib/compare.ts`.
- **AI Vision Scan (Milestone 4)**: `POST /api/detect-shoe` → Gemini 2.5 Flash (REST) → fuzzy match ke katalog. **BYOK default** (key di `localStorage`, dikirim via header `x-gemini-key`); key server `GEMINI_API_KEY` hanya dipakai saat `NODE_ENV != production` (uji dev). UI: tombol "Scan sepatu" (kamera/galeri, foto diperkecil di klien) dan modal Pengaturan AI. Lihat `docs/adr/ADR-001-ai-vision-scan.md`.
- Modul baru: `src/lib/vision/{schema,key,gemini,match-shoe,handler,client}.ts`, `src/lib/text.ts` (`normalizeName`, dipakai juga oleh `scripts/lib/brands.ts`).
- Test: `src/lib/__tests__/compare.test.ts`, `src/lib/vision/__tests__/vision.test.ts` (mock `fetch`, tanpa memanggil Gemini).
- `.env.example`: `GEMINI_API_KEY` (khusus development).

### Changed (scraper)
- Perilaku duplikat **dipertahankan sengaja**: sepatu yang sudah ada di DB **ditimpa** (upsert pada `id`), tidak di-skip, agar data baru ikut masuk. Perhatikan `id` = slug judul halaman, bukan `source_url`.

### Added (UI, PWA, ops) — 2026-10-23
- **Foto sepatu**: komponen `ShoeImage` (`next/image`, fallback ikon bila URL kosong/gagal) di kartu & modal detail. Host gambar diizinkan di `next.config.mjs`: `cdn.runrepeat.com`, `runrepeat.com`, `images.unsplash.com`.
- **Halaman Panduan** `/panduan` (`src/app/panduan/page.tsx`, konten di `src/constants/guide.ts`): tab Kategori Rotasi / Fit / Breathability. Tautan dari halaman utama.
- **Filter halaman utama**: 9 chip kategori (Semua, Daily, Super Shoes, Super Trainer, Speed/Tempo, Max Cushion, Stability, Trail Daily, Trail Ultra) cocok ke `category` **atau** `subCategory`; panel collapsible "Fit & Breathability" dengan penjelasan chip aktif. Filter Fit menggabung `runs_small` → Sempit/Kecil dan `runs_large` → Lebar/Besar.
- **Ikon & manifest PWA**: `public/icons/` (192, 512, svg), `src/app/icon.svg`, `favicon.ico`, `apple-icon.png`; `manifest.json` memuat ikon `any` + `maskable`.
- **Docs**: `docs/DB-SYNC-TURSO.md` (cara menyamakan Turso dengan SQLite lokal, termasuk backup & rollback); `.gitignore` mengabaikan `data/*.bak` dan `data/*.sql`.

### Data
- DB lokal & Turso production: **57 sepatu** (sinkron 2026-10-23; sebelumnya Turso 37 baris tanpa kolom fit/breathability). Backfill `db:push` + `scrape:fix` **selesai**.
- Sebaran kategori: daily_trainer 24, max_cushion 16, super_shoes 11, super_trainer 3, stability 1, trail_race_long 1, trail_super_shoes 1. Semua baris punya `image_url`.
- Catatan kualitas: 32 dari 57 baris `release_year = 0`. Penyebab: fakta "Release date" tidak ada di halaman sepatu lama RunRepeat. Perbaikan ditunda (pemilik proyek punya opsi lain).

### Added (fit, breathability, brand)
- `scripts/lib/brands.ts`: daftar brand kanonik + alias; judul dipecah dengan awalan terpanjang (fix "New Balance" → brand `New`). Brand tak dikenal → `needs_review`.
- `scripts/lib/classify-fit.ts`: definisi sendiri `sizing` (true_to_size/narrow/wide/runs_small/runs_large) dan `breathability` (cool/moderate/warm). Kolom DB baru: `sizing`, `length_fit`, `width_fit`, `fit_votes`, `breathability`, `upper_material` (perlu `npm run db:push`).
- API `GET /api/shoes` menerima `sizing` & `breathability`; filter `brand` kini case-insensitive.
- UI: badge fit/adem-panas di kartu & modal, filter chip di halaman utama.
- Test: `scripts/__tests__/fit-brand.test.ts`.

### Changed
- Nama brand kanonik: `ASICS`, `HOKA` (fallback dataset disamakan).
- `scrape-bulk --report` membuat folder tujuan otomatis.
- Re-scrape (`npm run scrape:fix`) sudah dijalankan; data fit/breathability & brand terisi untuk 57 baris.

### Fixed
- Scraper RunRepeat: ekstraksi spec lab, deteksi plat per kalimat, klasifikasi dari fakta terstruktur (lihat `scripts/README.md`).
- Validasi Zod diperketat (batas spec, format pace, heel >= forefoot).

### Added
- `npm run db:audit`, `npm run test` (vitest), opsi `--from-db`, `--dry-run` (kini fetch + validasi), `--report` pada `scrape-bulk`.

## [0.1.0] - 2026-10-17 (Current Milestone)

### Selesai Dikerjakan (Added / Completed)
- **Struktur Proyek**: Inisialisasi Fullstack Next.js 14 App Router, TypeScript, dan Tailwind CSS.
- **Integrasi Turso Cloud & Database Universal**: 
  - Definisi tabel `shoes` menggunakan Drizzle ORM (`src/db/schema.ts`).
  - Driver `@libsql/client` yang mendukung SQLite file lokal (`data/shoes.db`) dan Turso Cloud (`libsql://`) tanpa ubah kode.
  - Konfigurasi `drizzle.config.ts` cerdas dengan dukungan native `process.loadEnvFile` (`.env` / `.env.local`) dan deteksi otomatis dialect/driver (`turso` vs `sqlite`).
  - Skema tabel berhasil di-*push* ke Turso Cloud via `npm run db:push`.
  - Script diagnostik `npm run db:check` (`scripts/test-db-connection.ts`) untuk pengecekan latensi, ping, dan hitung row tabel.
  - Seeding awal 6 model sepatu ikonik berhasil dimasukkan ke Turso Cloud via `npm run db:seed`.
- **High-Availability & Fallback Resilience**:
  - Implementasi dataset statis cadangan (`src/data/fallback-shoes.ts`) pada `shoe.service.ts` agar aplikasi tetap menyajikan katalog secara elegan bila koneksi internet/cloud database terputus.
- **Tool Scraper RunRepeat**: 
  - Script CLI `scripts/scrape-runrepeat.ts` untuk mengambil spesifikasi lab (berat gram, drop mm, tebal stack, busa, pelat) dan review pros/cons langsung dari RunRepeat.
  - Validasi ketat runtime menggunakan Zod (`src/schemas/shoe.schema.ts`).
- **REST API Layer**:
  - `GET /api/shoes`: Mengambil daftar sepatu dengan parameter pencarian dan filter kategori rotasi.
  - `GET /api/shoes/:id`: Mengambil detail spesifikasi lab sepatu berdasarkan slug.
  - `GET /api/shoes/categories`: Mengambil metadata 5 kategori rotasi.
- **PWA & Antarmuka Mobile-First**:
  - Konfigurasi `@ducanh2912/next-pwa` dengan Service Worker (`public/sw.js`) dan web manifest (`public/manifest.json`).
  - Indikator status jaringan otomatis (*Offline Mode Detection*).
  - Filter kategori rotasi scrollable (Daily Trainer, Max Cushion, Tempo, Race Day, Trail).
  - Modal lembar bawah (*bottom sheet*) untuk spesifikasi lab mendalam.
- **Dokumentasi Lengkap**:
  - `README.md`: Panduan pengguna dan developer lengkap dengan alur Turso & SQLite.
  - `scripts/README.md`: Dokumentasi command `db:check`, `db:seed`, dan scraper lab.
  - `docs/ARCHITECTURE.md`: Diagram alur sistem dan komunikasi antar teknologi.

---

## 🎯 Target Pengembangan Berikutnya (Next Targets)

### Milestone 1: Pengayaan Dataset Sepatu (Katalog 30+ Sepatu)
- [x] Script batch scraping tersedia: `scripts/scrape-bulk.ts` (argumen URL, `--file`, `--catalog`, `--from-db`, `--dry-run`).
- [~] Katalog sudah 57 sepatu; target 30+ tercapai. Sisa: tambah model populer di Indonesia (Adidas Adizero Boston 12, Adios Pro 3, Hoka Clifton 9, New Balance 1080 v13, Puma Deviate Nitro 2, Brooks Ghost 16, dll).
- [x] Audit nilai gram/drop/stack lewat `npm run db:audit` (validasi Zod per baris).
- [ ] Lengkapi `release_year` (32 baris masih 0) dan perbanyak trail / stability / race pendek (kategori ini masih tipis).
- [ ] Menu terpisah Road vs Trail dan tampilan brand sebagai tabel.

### Milestone 2: Fitur Komparasi Sepatu (Side-by-Side Comparison)
- [x] Halaman `/bandingkan?ids=a,b` (2–3 sepatu), dipilih lewat tombol "Bandingkan" di kartu.
- [x] Perbandingan visual: selisih berat (gram), drop, tebal stack, jenis pelat, busa, bantalan, fit, adem/panas.
- [ ] Uji tampilan di perangkat nyata dan tambahkan tombol Bandingkan di modal detail (opsional).

### Milestone 4: AI Vision Scan
- [x] Rute `POST /api/detect-shoe` (Gemini 2.5 Flash Vision), BYOK default + key server khusus development.
- [x] Pengaturan AI (modal BYOK) dan lembar Scan (kamera/galeri).
- [x] Fuzzy matching hasil AI ke tabel `shoes`.
- [ ] Uji live dengan key Gemini asli & foto nyata; sesuaikan ambang kecocokan (`src/lib/vision/match-shoe.ts`).

---

-> update selanjutnya (catatan pemilik proyek):
1. brand jadi tabel sendiri (bukan string) — belum; sementara brand = string kanonik dari `scripts/lib/brands.ts`.
2. menu Road dan Trail terpisah.
3. scraping lebih akurat: ambang lebar dari angka mm lab, perbaikan `release_year`.
