# LariYuk - Panduan & Patokan Proyek (Project Scope & Architecture)

> **Catatan Penting:** Proyek ini dikembangkan dengan asistensi agent yang wajib selalu menggunakan mode/skill **caveman** (komunikasi ringkas, langsung ke inti teknis, tanpa basa-basi).

---

## 1. Fokus Tahap Saat Ini (Current Phase)

Fitur **AI Vision Scan DITANGGUHKAN** sementara hingga ada instruksi eksplisit untuk melanjutkan.

Status Implementasi:
1. [x] **Database & ORM**: Drizzle ORM dengan LibSQL Client terintegrasi ganda (Turso Cloud untuk cloud/prod & SQLite file untuk offline). Skema tabel `shoes` ter-push ke Turso dan ter-seed 6 sepatu.
2. [x] **Resilience Layer**: Fallback dataset statis (`src/data/fallback-shoes.ts`) menjamin zero-downtime jika DB unreachable.
3. [x] **REST API**: Endpoint Next.js App Router (`/api/shoes`, `/api/shoes/[id]`, `/api/shoes/categories`) aktif.
4. [x] **PWA Integration**: Service Worker (`@ducanh2912/next-pwa`), manifest, offline banner terpasang.
5. [x] **Frontend UI**: Katalog mobile-first, filter rotasi, real-time search, bottom sheet modal lab specs.
6. [ ] **Pengayaan Data**: Batch scraping 30+ sepatu populer tambahan.

---

## 2. Struktur Data & Schema

### 2.1 File Master
- Path: `data/shoes.json`
- Schema Validator: `src/schemas/shoe.schema.ts` (Zod)
- Type Definition: `src/types/shoe.ts`

### 2.2 Kategori Rotasi (Badge)
- `daily_trainer`: Sepatu harian serbaguna, durabilitas tinggi.
- `max_cushion`: Bantalan tebal untuk recovery run dan lari santai jarak jauh.
- `tempo_speed`: Responsif, ringan, cocok untuk interval / fartlek / tempo.
- `race_day`: Busa PEBA super responsive + plat karbon/nylon untuk race.
- `trail`: Outsole grippy, proteksi kaki untuk medan tanah/bebatuan.

### 2.3 Kontrak Data Sepatu (RunningShoe)
```typescript
interface RunningShoe {
  id: string; // Slug kebab-case (e.g. "asics-novablast-4")
  brand: string;
  model: string;
  releaseYear: number;
  category: "daily_trainer" | "max_cushion" | "tempo_speed" | "race_day" | "trail";
  primaryUse: string;
  secondaryUse?: string;
  targetPaceRange: string; // Format: "5:00 - 7:00 min/km"
  runnerType: "Neutral" | "Mild Stability" | "Stability";
  surface: "Road" | "Trail" | "All-Terrain";
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
  imageUrl?: string;
  runRepeatUrl?: string;
}
```

---

## 3. Spesifikasi REST API

Base URL: `/api`

| Method | Endpoint | Deskripsi | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/shoes` | List sepatu dengan filter dan search | `category`, `brand`, `search`, `limit`, `offset` |
| `GET` | `/api/shoes/:id` | Detail spesifik sepatu berdasarkan slug ID | - |
| `GET` | `/api/shoes/categories` | Daftar metadata kategori rotasi & deskripsi | - |

Caching Headers:
- `/api/shoes`: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- `/api/shoes/:id`: `Cache-Control: public, s-maxage=86400`

---

## 4. Arsitektur & PWA

- **Framework**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS.
- **PWA Module**: `@ducanh2912/next-pwa` atau `@serwist/next`.
- **Offline Storage**: Cache API untuk file statis + IndexedDB (`idb-keyval`) untuk data JSON katalog.
- **Client Cache**: TanStack Query (React Query) / SWR.

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
  1. Siapkan seed data `data/shoes.json` (20 sepatu populer).
  2. Tulis validasi Zod & TypeScript type.
  3. Inisialisasi Next.js app & siapkan API routes.
  4. Bangun UI mobile-first & integrasikan PWA offline.
