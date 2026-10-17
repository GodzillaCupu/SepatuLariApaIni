# Changelog & Roadmap Pengembangan (LariYuk)

Format log ini mengikuti standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan [Semantic Versioning](https://semver.org/).

---

## [0.1.0] - 2026-10-17 (Current Milestone)

### Selesai Dikerjakan (Added / Completed)
- **Struktur Proyek**: Inisialisasi Fullstack Next.js 14 App Router, TypeScript, dan Tailwind CSS.
- **Database Universal**: 
  - Definisi tabel `shoes` menggunakan Drizzle ORM (`src/db/schema.ts`).
  - Driver `@libsql/client` yang mendukung SQLite file lokal (`data/shoes.db`) dan Turso Cloud (`libsql://`) tanpa ubah kode.
- **Tool Scraper RunRepeat**: 
  - Script CLI `scripts/scrape-runrepeat.ts` untuk mengambil spesifikasi lab (berat gram, drop mm, tebal stack, busa, pelat) dan review pros/cons langsung dari RunRepeat.
  - Validasi ketat runtime menggunakan Zod (`src/schemas/shoe.schema.ts`).
  - Script seeding awal `scripts/seed-initial.ts` dengan 6 model sepatu ikonik (*Asics Novablast 4*, *Nike Pegasus 41*, *Saucony Endorphin Speed 4*, *Nike Vaporfly 3*, *Asics Gel-Nimbus 26*, *Hoka Speedgoat 5*).
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
  - `README.md`: Panduan pengguna dan developer.
  - `scripts/README.md`: Cara kerja scraper dan konversi metrik lab.
  - `docs/ARCHITECTURE.md`: Diagram alur sistem dan komunikasi antar teknologi.

---

## 🎯 Target Pengembangan Berikutnya (Next Targets)

### Milestone 1: Pengayaan Dataset Sepatu (Katalog 30+ Sepatu)
- [ ] Buat script batch scraping (`scripts/batch-scrape.ts`) untuk memproses daftar URL sepatu terpopuler di Indonesia (Adidas Adizero Boston 12, Adios Pro 3, Hoka Clifton 9, New Balance 1080 v13, Puma Deviate Nitro 2, Brooks Ghost 16, dll).
- [ ] Verifikasi ketepatan nilai gram dan drop mm pada database setelah scraping massal.

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
