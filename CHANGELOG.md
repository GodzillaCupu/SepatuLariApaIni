# Changelog & Roadmap Pengembangan (LariYuk)

Format log ini mengikuti standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added (UI, PWA, ops) — 2026-10-23
- **Foto sepatu**: komponen `ShoeImage` (`next/image`, fallback ikon bila URL kosong/gagal) di kartu & modal detail. Host gambar diizinkan di `next.config.mjs`: `cdn.runrepeat.com`, `runrepeat.com`, `images.unsplash.com`.
- **Halaman Panduan** `/panduan` (`src/app/panduan/page.tsx`, konten di `src/constants/guide.ts`): tab Kategori Rotasi / Fit / Breathability. Tautan dari halaman utama.
- **Filter halaman utama**: 9 chip kategori (Semua, Daily, Super Shoes, Super Trainer, Speed/Tempo, Max Cushion, Stability, Trail Daily, Trail Ultra) cocok ke `category` **atau** `subCategory`; panel collapsible "Fit & Breathability" dengan penjelasan chip aktif. Filter Fit menggabung `runs_small` → Sempit/Kecil dan `runs_large` → Lebar/Besar.
- **Ikon & manifest PWA**: `public/icons/` (192, 512, svg), `src/app/icon.svg`, `favicon.ico`, `apple-icon.png`; `manifest.json` memuat ikon `any` + `maskable`.
- **Docs**: `docs/DB-SYNC-TURSO.md` (cara menyamakan Turso dengan SQLite lokal, termasuk backup & rollback); `.gitignore` mengabaikan `data/*.bak` dan `data/*.sql`.

### Data
- DB lokal & Turso production: **57 sepatu** (sinkron 2026-10-23; sebelumnya Turso 37 baris tanpa kolom fit/breathability). Backfill `db:push` + `scrape:fix` **selesai**.
- Sebaran kategori: daily_trainer 24, max_cushion 16, super_shoes 11, super_trainer 3, stability 1, trail_race_long 1, trail_super_shoes 1. Semua baris punya `image_url`.
- Catatan kualitas: 32 dari 57 baris `release_year = 0` (tahun rilis tidak tersedia di halaman sumber).

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
- [ ] Buat komponen pembanding 2 sepatu secara berdampingan (contoh: *Novablast 4 vs Pegasus 41*).
- [ ] Tampilkan perbandingan visual grafis: selisih berat (gram), perbedaan ketebalan bantalan, dan perbedaan jenis pelat.

### Milestone 3: Rotasi Sepatu Saya ("My Rotation" - PWA Offline)
- [ ] Fitur penyimpanan sepatu milik pengguna di `localStorage` / `IndexedDB`.
- [ ] Dashboard rotasi pribadi: menampilkan sepatu apa yang dimiliki user untuk Daily, Tempo, dan Race Day, serta memberikan saran sepatu apa yang masih kurang di rotasi mereka.

### Milestone 4: Re-aktivasi Fitur AI Vision Scan (Saat User Siap)
- [ ] Pembuatan rute `POST /api/detect-shoe` menggunakan Google Gemini 2.5 Flash Vision.
- [ ] Fitur BYOK (Bring Your Own Key) via modal pengaturan agar tidak membebani kuota pengembang.
- [ ] Algoritma *fuzzy matching* dari nama sepatu yang ditebak AI ke database `shoes`.

### Milestone 5: Fitur Komunitas & Pengajuan Sepatu
- [ ] Form CTA kontribusi jika sepatu yang dicari belum ada di database.
- [ ] Generator otomatis link GitHub Issue dengan template data spesifikasi siap isi.
