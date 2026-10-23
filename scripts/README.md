# Dokumentasi Script Database & Scraper (`scripts/`)

Tool otomasi untuk mengelola data spesifikasi lab **LariYuk (SepatuLariApaIni)** di **SQLite lokal** (`data/shoes.db`) atau **Turso Cloud**. Target DB ditentukan `TURSO_DATABASE_URL` di `.env` / `.env.local` (kosong → file lokal).

---

## 1. Daftar Script

| Script | Perintah | Fungsi |
|---|---|---|
| `test-db-connection.ts` | `npm run db:check` | Ping DB, tampilkan tipe koneksi & jumlah baris `shoes` |
| `seed-initial.ts` | `npm run db:seed` | Isi 6 sepatu awal |
| `scrape-runrepeat.ts` | `npm run scrape <url>` | Scrape **satu** halaman review RunRepeat → validasi → upsert |
| `scrape-bulk.ts` | `npm run scrape:bulk ...` | Scrape banyak URL (argumen, file JSON, katalog, atau ulang dari DB) |
| `audit-data.ts` | `npm run db:audit` | Audit kualitas tabel `shoes` (read-only, exit 1 bila ada pelanggaran) |
| `lib/*` | — | Modul murni yang dipakai scraper (lihat §3) |
| `__tests__/`, `__fixtures__/` | `npm run test` | Unit test (vitest) + HTML fixture nyata RunRepeat |

### Scraper satu sepatu

```bash
npm run scrape https://runrepeat.com/asics-novablast-4
npx tsx scripts/scrape-runrepeat.ts <url> --dry-run     # fetch + parse + validasi, TANPA tulis DB
```

### Scraper bulk

```bash
# a. Beberapa URL langsung
npx tsx scripts/scrape-bulk.ts https://runrepeat.com/asics-novablast-4 https://runrepeat.com/hoka-speedgoat-5

# b. Dari file JSON (array string URL, atau objek { url, idOverride?, categoryOverride?, subCategoryOverride? })
npm run scrape:bulk:file                  # = --file scripts/urls.json

# c. Dari halaman katalog RunRepeat
npm run scrape:catalog                    # katalog road, limit default 20
npx tsx scripts/scrape-bulk.ts --catalog https://runrepeat.com/catalog/trail-running-shoes --limit 15

# d. Re-scrape semua baris yang sudah ada di DB (pakai source_url & id lama → id stabil)
npm run scrape:fix -- --dry-run --report scripts/report.json   # uji dulu
npm run scrape:fix -- --report scripts/report-fix.json         # tulis ke DB
```

| Opsi | Default | Keterangan |
|---|---|---|
| `--file <path>` | — | File JSON daftar URL |
| `--catalog <url>` | — | Ekstrak link sepatu dari halaman katalog |
| `--limit <n>` | `20` | Maks sepatu dari katalog |
| `--from-db` | off | Muat semua `source_url` dari tabel `shoes` (ikut `TURSO_DATABASE_URL`) |
| `--concurrency <n>` | `2` | Worker paralel |
| `--delay <ms>` | `3000` | Jeda tiap worker antar request (hindari rate-limit) |
| `--dry-run` | off | Fetch + parse + validasi penuh, **tidak menulis DB** |
| `--report <file>` | — | Tulis hasil per URL (`success` / `needs_review` / `failed`) ke JSON; folder dibuat otomatis |

Exit code `1` hanya bila **semua** job gagal. Sepatu `needs_review` tidak membuat exit code 1 — periksa ringkasan / report.

**Selalu `cp data/shoes.db data/shoes.db.bak` (atau snapshot Turso) sebelum menulis ke DB.**

Setelah scraping ke DB lokal, salin hasilnya ke Turso production dengan panduan [`../docs/DB-SYNC-TURSO.md`](../docs/DB-SYNC-TURSO.md).

---

## 2. Alur Scraper

```
URL RunRepeat
  │ 1. fetchHtml          fetch + User-Agent browser, timeout 30 dtk, retry 3x (404 tidak di-retry)
  ▼
  │ 2. parseRunRepeatHtml (lib/runrepeat-parser.ts)   — murni, tanpa network/DB
  │      · brand/model    → lib/brands.ts (splitBrandModel)
  │      · spec lab       → kolom PERTAMA tabel perbandingan (bukan sepatu mirip)
  │      · fakta          → blok .rr_facts__name (terrain, release date, material, …)
  │      · plat, busa     → deteksi per kalimat / per brand
  │      · fit, breathability → lib/classify-fit.ts
  ▼
  │ 3. buildShoeFromPage  — spec wajib kosong → NeedsReviewError (tanpa default diam-diam)
  │      · classifyShoe (lib/classify-shoe.ts) → category, subCategory, terrain, pace
  ▼
  │ 4. RunningShoeSchema (Zod, src/schemas/shoe.schema.ts) — gagal → NeedsReviewError
  ▼
  │ 5. upsert Drizzle (onConflictDoUpdate target shoes.id) — kecuali --dry-run
```

`id` = `slugify(judul halaman)`. Re-scrape lewat `--from-db` meneruskan `idOverride` sehingga id tidak berubah.

### Status hasil
- **success** — tersimpan (atau lolos validasi bila dry-run).
- **needs_review** — halaman terambil tapi data tidak lengkap/tak masuk akal: brand tak dikenal, berat/drop/stack tidak ketemu, atau di luar `SPEC_LIMITS`. **Tidak masuk DB.**
- **failed** — gagal jaringan / HTTP (mis. 404).

---

## 3. Definisi Data Sendiri

### 3.1 Brand vs model (`lib/brands.ts`)
Daftar brand kanonik + alias (`BRANDS`). Judul dipecah dengan **awalan terpanjang** yang cocok, sehingga brand 2+ kata utuh:

| Judul | brand | model |
|---|---|---|
| New Balance Fresh Foam X 1080v13 | `New Balance` | `Fresh Foam X 1080v13` |
| Under Armour Velociti Elite 2 | `Under Armour` | `Velociti Elite 2` |
| Hoka One One Clifton 8 | `HOKA` | `Clifton 8` |

Urutan fallback: daftar brand → fakta "Brand:" di halaman (bila judul diawali nama itu) → **`needs_review`** (tidak pernah menebak kata pertama). **Brand baru → tambahkan ke `BRANDS`.** Nama kanonik disimpan konsisten (`ASICS`, `HOKA`, `New Balance`).

### 3.2 Sizing (`lib/classify-fit.ts`)
Dua sumbu, lalu digabung ke satu nilai `sizing`:

- **`lengthFit`** (panjang) — voting pembeli RunRepeat. Teks voting ("fits true to size / slightly small / …") dipakai lebih dulu, posisi bar `.this-shoe` sebagai cadangan. Voting `< MIN_FIT_VOTES` (20) → `unknown`. "Slightly small/large" dihitung `runs_small` / `runs_large`.
- **`widthFit`** (lebar) — baris lab "Width / fit" (utama), lalu "Toebox width": `narrow` / `standard` (Medium/Normal) / `wide`.
- **`sizing`** (prioritas): length menyimpang → `runs_small`/`runs_large`; else width `narrow`/`wide`; else length pas → `true_to_size`; else `unknown`. Jadi `true_to_size` = panjang pas **dan** lebar standar.

### 3.3 Breathability — adem/panas (`lib/classify-fit.ts`)
Konteks: sirkulasi udara bahan upper. Prioritas bukti: **label lab** ("Breathable"/"Moderate"/"Warm") → **skor lama 1–5** (≥4 cool, 3 moderate, ≤2 warm) → **kata kunci upper** (Gore-Tex/waterproof/membrane → `warm`; mesh/knit/perforated → `cool`). Hasil: `cool` (adem), `moderate`, `warm` (panas), `unknown`. Bahan upper dari fakta "Material" disimpan di `upperMaterial`.

Semua ambang & aturan ada di satu file (`classify-fit.ts`) — ubah di sana, lalu re-scrape (`npm run scrape:fix`).

### 3.4 Kategori (`lib/classify-shoe.ts`)
Skor ke semua kategori di `ShoeCategoryEnum` (30 kategori; panduan di `docs/running-shoe-categories-guide.md`) memakai sinyal terstruktur (terrain, pace, type), spesifikasi (plat, stack, bobot) dan teks verdict. Skor tertinggi = `category`, kedua = `subCategory` (bila skor > 15).

---

## 4. Skema Kolom Terkait Scraper

Selain spesifikasi lab, tabel `shoes` memiliki: `sizing`, `length_fit`, `width_fit`, `fit_votes`, `breathability`, `upper_material`. **Setelah menarik kode ini, jalankan `npm run db:push` sebelum aplikasi/scraper dipakai pada DB lama** — tanpa kolom baru, query `select *` Drizzle gagal dan `shoe.service.ts` diam-diam memakai dataset fallback statis. Baris lama memiliki nilai `unknown` sampai di-re-scrape (`npm run scrape:fix`).

`releaseYear` kosong disimpan `0` (kolom NOT NULL; `0` = tidak diketahui).

---

## 5. Audit & Test

```bash
npm run db:audit        # validasi tiap baris DB dengan RunningShoeSchema yang sama dengan scraper
npm run test            # vitest: parser, brand, fit/breathability, skema (fixture HTML nyata; 48 test)
```

Fixture ada di `scripts/__fixtures__/` (ASICS Novablast 4, HOKA Speedgoat 5). Untuk kasus baru (mis. brand 2 kata, sepatu waterproof) simpan HTML halaman sebagai fixture baru dan tambah assert di `__tests__/`.

---

## 6. Hal yang Perlu Diperhatikan

1. **Rate limit / Cloudflare**: pertahankan `--delay` ≥ 2000 ms dan `--concurrency` kecil.
2. **Perubahan DOM RunRepeat**: bila banyak `needs_review` mendadak, periksa selector di `lib/runrepeat-parser.ts` (`readComparisonRows`, `readFacts`, `readFitVote`) dengan menjalankan `npm run test` terhadap fixture baru.
3. **Target DB**: `TURSO_DATABASE_URL` terisi → menulis ke Turso Cloud; kosong → `data/shoes.db`. `.env.local` menimpa `.env`.
4. **Skema DB tanpa migrasi**: proyek memakai `drizzle-kit push` (folder `drizzle/` tidak ada). Backup DB sebelum push.
