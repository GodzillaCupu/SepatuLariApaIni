# LariYuk - Panduan & Patokan Proyek (Project Scope & Architecture)

> **Catatan Penting:** Proyek ini dikembangkan dengan asistensi agent yang wajib selalu menggunakan mode/skill **caveman** (komunikasi ringkas, langsung ke inti teknis, tanpa basa-basi).

---

## 1. Fokus Tahap Saat Ini (Current Phase)

Fokus: perkaya dataset, uji live **AI Vision Scan** dengan key Gemini asli, dan rapikan kualitas data (`release_year`). Fitur banding sepatu dan AI Vision Scan sudah diimplementasikan (BYOK default).

Status Implementasi:
1. [x] **Database & ORM**: Drizzle ORM dengan LibSQL Client terintegrasi ganda (Turso Cloud untuk cloud/prod & SQLite file untuk offline). Skema tabel `shoes` ter-push ke Turso; katalog saat ini 57 sepatu.
2. [x] **Resilience Layer**: Fallback dataset statis (`src/data/fallback-shoes.ts`) menjamin zero-downtime jika DB unreachable.
3. [x] **REST API**: Endpoint Next.js App Router (`/api/shoes`, `/api/shoes/[id]`, `/api/shoes/categories`) aktif.
4. [x] **PWA Integration**: Service Worker (`@ducanh2912/next-pwa`), manifest, offline banner terpasang.
5. [x] **Frontend UI**: Katalog mobile-first, filter rotasi, real-time search, bottom sheet modal lab specs, badge & filter fit / adem-panas.
6. [x] **Scraper v2**: parser murni (`scripts/lib/`), pemisahan brand/model berbasis daftar brand, definisi sizing & breathability, mode bulk (`--file`, `--catalog`, `--from-db`, `--dry-run`), audit (`npm run db:audit`) dan unit test (`npm run test`).
7. [x] **Backfill DB**: kolom fit/breathability + `scrape:fix` selesai; lokal & Turso sinkron **57 sepatu** (2026-10-23, lihat `docs/DB-SYNC-TURSO.md`).
8. [x] **Foto produk**: `ShoeImage` di kartu & modal (fallback ikon); semua baris punya `image_url`.
9. [x] **Halaman Panduan** `/panduan` + chip filter kategori / Fit / Breathability.
10. [x] **Ikon PWA**: icons 192/512 (any + maskable), favicon, apple-icon.
11. [ ] **Pengayaan Data**: tambah model populer; kategori trail, stability, race pendek masih tipis; 32/57 baris `release_year = 0`.
12. [x] **Banding sepatu**: `/bandingkan?ids=a,b` (maks 3), tombol di kartu + bar melayang.
13. [x] **AI Vision Scan**: `POST /api/detect-shoe` (Gemini 2.5 Flash), BYOK default, key server hanya dev (`docs/adr/ADR-001-ai-vision-scan.md`). Uji live dengan key asli belum dilakukan.
14. [ ] **Fitur berikutnya**: menu Road/Trail, brand sebagai tabel (lihat `CHANGELOG.md`).

---

## 2. Struktur Data & Schema

### 2.1 Sumber Data & Kontrak
- Database: tabel `shoes` (`src/db/schema.ts`, Drizzle) di SQLite lokal `data/shoes.db` / Turso. Bukan file JSON.
- Validator: `src/schemas/shoe.schema.ts` (Zod) — dipakai scraper & audit.
- Tipe: `src/types/index.ts`.
- Fallback statis bila DB tak terjangkau: `src/data/fallback-shoes.ts`.
- Data masuk lewat scraper RunRepeat (`scripts/`, lihat `scripts/README.md`).

### 2.2 Kategori
- 30 kategori di `ShoeCategoryEnum` (road: super_shoes, super_trainer, race_*, speed_tempo, daily_trainer, max_cushion, stability, …; trail: trail_*). Metadata label/warna: `src/constants/categories.ts`; panduan: `docs/running-shoe-categories-guide.md`.
- Lima badge rotasi awal (daily_trainer, max_cushion, tempo/speed, race, trail) tetap menjadi mental model utama di UI.

### 2.2b Fit & Breathability
- `sizing`: `true_to_size | narrow | wide | runs_small | runs_large | unknown`
- `breathability`: `cool (adem) | moderate | warm (panas) | unknown`
- Definisi & ambang: `scripts/lib/classify-fit.ts`; label UI: `src/constants/fit.ts`.
- Brand kanonik: `scripts/lib/brands.ts` (brand baru wajib didaftarkan, kalau tidak → `needs_review`).

### 2.3 Kontrak Data Sepatu (RunningShoe)
```typescript
interface RunningShoe {
  id: string; // Slug kebab-case (e.g. "asics-novablast-4")
  brand: string;
  model: string;
  releaseYear: number;
  category: ShoeCategory; // 30 nilai, lihat src/types/index.ts
  primaryUse: string;
  secondaryUse?: string;
  targetPaceRange: string; // Format: "5:00 - 7:00 min/km"
  runnerType: "Neutral" | "Mild Stability" | "Stability";
  surface: "Road" | "Trail" | "All-Terrain";
  subCategory?: string | null;
  terrain?: string | null;
  sizing?: "true_to_size" | "narrow" | "wide" | "runs_small" | "runs_large" | "unknown";
  lengthFit?: "runs_small" | "true_to_size" | "runs_large" | "unknown";
  widthFit?: "narrow" | "standard" | "wide" | "unknown";
  fitVotes?: number | null;
  breathability?: "cool" | "moderate" | "warm" | "unknown";
  upperMaterial?: string | null;
  specs: {
    weightGrams: number;
    dropMm: number;
    heelStackMm: number;
    forefootStackMm: number;
    foamType: string;
    plateType: "None" | "Nylon" | "Carbon Fiber" | "TPU";
    cushionFeel: "Plush" | "Balanced" | "Firm";
  };
  verdict: {
    summary: string;
    pros: string[];
    cons: string[];
  };
  imageUrl?: string | null;
  sourceUrl: string; // halaman RunRepeat
}
```

---

## 3. Spesifikasi REST API

Base URL: `/api`

| Method | Endpoint | Deskripsi | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/shoes` | List sepatu dengan filter dan search | `category`, `brand` (case-insensitive), `sizing`, `breathability`, `search`, `limit` |
| `GET` | `/api/shoes/:id` | Detail spesifik sepatu berdasarkan slug ID | - |
| `GET` | `/api/shoes/categories` | Daftar metadata kategori rotasi & deskripsi | - |
| `POST` | `/api/detect-shoe` | Identifikasi sepatu dari foto (Gemini) + cocokkan ke katalog | Body JSON `{ image: base64, mimeType }`; header `x-gemini-key` (BYOK). Key server `GEMINI_API_KEY` hanya bila `NODE_ENV != production` |

Caching Headers:
- `/api/shoes`: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- `/api/shoes/:id`: `Cache-Control: public, s-maxage=86400`
- `/api/detect-shoe`: `no-store` (POST, tidak di-cache Service Worker; gagal bila offline)

---

## 4. Arsitektur & PWA

- **Framework**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS.
- **PWA Module**: `@ducanh2912/next-pwa` (aktif; dinonaktifkan saat `NODE_ENV=development`).
- **Halaman**: `/` (katalog), `/panduan` (panduan filter), `/bandingkan` (banding 2–3 sepatu).
- **Testing**: vitest (`npm run test`, 75 test lulus: parser, brand, fit/breathability, compare, AI Vision dengan mock `fetch`).
- **Offline**: Service Worker (Workbox) men-cache aset & respons `/api/shoes`. Rencana IndexedDB / TanStack Query belum dikerjakan.

---

## 5. Deployment & Biaya (Zero Cost Target)

- **Hosting & API**: Vercel Hobby Tier ($0/bulan).
- **Katalog Data**: Static Edge via Vercel CDN ($0/bulan).
- **DNS / SSL**: Subdomain `*.vercel.app` atau Cloudflare Free Tier ($0).
- **Target Pengeluaran**: **$0.00 / bulan**.

---

## 6. Instruksi Agent & Developer

- **Gaya Komunikasi**: Wajib menggunakan skill **caveman** pada setiap sesi chat (terse, teknis langsung tanpa basa-basi).
- **Prioritas Pengerjaan**:
  1. Backfill DB: `db:push` + `scrape:fix` (setelah backup).
  2. Perkaya dataset (30+ sepatu) via `scrape-bulk`.
  3. Menu road/trail, brand sebagai tabel, perbandingan sepatu (lihat `CHANGELOG.md`).
  4. Setelah scraping: backup DB → `db:audit` → sinkron ke Turso (`docs/DB-SYNC-TURSO.md`).
