# Dokumentasi Script Database & Tool Scraper (`scripts/`)

Folder ini berisi tool otomasi dan utilitas database untuk pengelolaan data spesifikasi lab **LariYuk (SepatuLariApaIni)**, baik untuk database **SQLite lokal** maupun **Turso Cloud**.

---

## 1. Daftar Script & Cara Penggunaan

### A. Uji Koneksi Database (`scripts/test-db-connection.ts`)
Digunakan untuk memverifikasi apakah aplikasi lokal dapat menjangkau database yang dikonfigurasikan di `.env` (Turso Cloud atau file SQLite lokal):

```bash
npm run db:check
```
*Output menampilkan:*
- Tipe koneksi (`Turso Cloud (Remote)` atau `Local SQLite File`)
- Endpoint URL & keberadaan Auth Token
- Status ping SQL
- Jumlah baris data yang ada pada tabel `shoes`

### B. Seeding Sepatu Awal (`scripts/seed-initial.ts`)
Mengisi database dengan 6 sepatu lab teruji secara instan:

```bash
npm run db:seed
# Atau: npx tsx scripts/seed-initial.ts
```
Script akan otomatis mendeteksi konfigurasi di `.env` / `.env.local` dan menyuntikkan data ke target yang aktif.

### C. Scraper RunRepeat Per Sepatu (`scripts/scrape-runrepeat.ts`)
Mengambil data spesifikasi lab dari halaman review RunRepeat, melakukan klasifikasi kategori otomatis (skor potensi terbesar), dan menyimpannya ke database:

```bash
# Contoh: Scrape Mizuno Neo Vista
npx tsx scripts/scrape-runrepeat.ts https://runrepeat.com/mizuno-neo-vista

# Contoh: Scrape Asics Novablast 4
npm run scrape https://runrepeat.com/asics-novablast-4
```

### D. Bulk & Catalog Scraper (`scripts/scrape-bulk.ts`)

Mendukung pengambilan banyak sepatu sekaligus, baik melalui daftar URL maupun **ekstraksi otomatis dari halaman katalog RunRepeat**:

```bash
# 1. Scraping Otomatis dari Halaman Katalog RunRepeat (Rekomendasi):
npx tsx scripts/scrape-bulk.ts --catalog https://runrepeat.com/catalog/running-shoes --limit 10

# Atau katalog trail:
npx tsx scripts/scrape-bulk.ts --catalog https://runrepeat.com/catalog/trail-running-shoes --limit 15

# Shortcut npm:
npm run scrape:catalog

# 2. Input beberapa link sepatu langsung di terminal:
npx tsx scripts/scrape-bulk.ts https://runrepeat.com/mizuno-neo-vista-2 https://runrepeat.com/asics-novablast-4

# 3. Dari file daftar URL (scripts/urls.json):
npm run scrape:bulk:file

# 4. Preview link tanpa menyimpan ke database (Dry Run):
npx tsx scripts/scrape-bulk.ts --catalog https://runrepeat.com/catalog/running-shoes --limit 5 --dry-run
```

**Daftar Opsi CLI:**
| Opsi | Default | Keterangan |
|---|---|---|
| `--catalog <url>` | — | URL halaman katalog RunRepeat untuk diekstrak otomatis link sepatunya |
| `--limit <n>` | `20` | Jumlah maksimal sepatu yang diambil dari halaman katalog |
| `--file <path>` | — | Path ke file JSON berisi daftar URL |
| `--concurrency <n>` | `2` | Jumlah request scraping paralel bersamaan |
| `--delay <ms>` | `3000` | Jeda antar request dalam milidetik (hindari rate-limit Cloudflare) |
| `--dry-run` | off | Hanya tampilkan daftar URL yang ditemukan tanpa scraping ke database |

---

## 2. Cara Membaca & Memahami Script (`scripts/scrape-runrepeat.ts`)

Alur kerja script dibagi menjadi 6 tahap terstruktur:

```
[ URL RunRepeat ]
       │
       ▼
1. HTTP Fetch (Cheerio + Browser Headers)
       │
       ▼
2. Ekstraksi Identitas (Brand, Model, Slug ID)
       │
       ▼
3. Ekstraksi Metrik Lab (Weight, Drop, Heel/Forefoot Stack)
       │
       ▼
4. Ekstraksi Review Kualitatif (Verdict, Pros, Cons, Image)
       │
       ▼
5. Normalisasi & Validasi Skema (Zod Schema)
       │
       ▼
6. Penyimpanan / Upsert Database (Drizzle ORM)
```

### Penjelasan Blok Kode Kunci:

#### 1. Header Penyamaran Browser
```typescript
const response = await fetch(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "Accept-Language": "en-US,en;q=0.9",
  },
});
```
*Mengapa ini penting?* RunRepeat memiliki proteksi bot. Tanpa header `User-Agent` browser asli, request akan langsung diblokir dengan kode `403 Forbidden`.

#### 2. Konversi Satuan Berat (Ounce ke Gram)
```typescript
const weightText = findMetric(["Weight", "weight"]);
const weightMatch = weightText.match(/(\d+)\s*g/i) || weightText.match(/(\d+(?:\.\d+)?)\s*oz/i);
if (weightText.includes("oz") && !weightText.includes("g")) {
  weightGrams = Math.round(parseFloat(weightMatch[1]) * 28.3495);
}
```
*Penjelasan:* RunRepeat menyajikan berat dalam dua format: gram (`260g`) atau ounce (`9.2 oz`). Script menggunakan regex untuk menangkap angka dan mengonversi `1 oz = 28.3495 g` jika teks hanya menyajikan ounce.

#### 3. Mesin Klasifikasi Kategori Otomatis (Scoring Engine)
```typescript
const classified = classifyShoe({
  brand, model, fullText, verdictSummary, pros, cons,
  heelStackMm, weightGrams, dropMm, hasCarbonPlate, hasNylonPlate, hasPlate
});
// Hasil:
// category: "super_trainer"   (Skor Tertinggi - Potensi Terbesar)
// subCategory: "max_cushion"   (Skor Kedua Tertinggi)
// terrain: "road"              (Atau "soft_ground" / "multi_ground" untuk trail)
```
*Penjelasan:*
Alih-alih pencocokan statis kaku, fungsi `classifyShoe` menghitung bobot skor relevansi ke seluruh 26 kategori resmi di `docs/running-shoe-categories-guide.md`:
- Menguji sinyal teks (kata kunci "super trainer", "daily workhorse", "long run", "tempo", dll).
- Menguji spesifikasi teknis (keberadaan pelat karbon vs nilon, busa super PEBA, ketebalan *heel stack*, bobot sepatu).
- Kategori dengan bobot tertinggi terpilih sebagai `category` (primer).
- Kategori tertinggi kedua terpilih sebagai `sub_category` (sekunder).
- Contoh nyata **Mizuno Neo Vista 2**: memiliki wave plate, busa lembut Enerzy NXT, dan stack tinggi (44.5mm). Hasil penilaian menempatkannya sebagai `super_trainer` (primer) dan `max_cushion` / `long_run` (sekunder).

#### 4. Validasi Ketat Menggunakan Zod
```typescript
const validated = RunningShoeSchema.parse(shoeData);
```
*Penjelasan:* Sebelum data dimasukkan ke database, Zod memastikan tidak ada angka minus pada berat/drop, URL valid, dan enum kategori sesuai kontrak sistem. Jika ada data rusak, proses berhenti dan memberi tahu baris mana yang salah.

#### 5. Upsert (Insert or Update on Conflict)
```typescript
await db.insert(shoes).values(dbRecord).onConflictDoUpdate({
  target: shoes.id,
  set: dbRecord,
});
```
*Penjelasan:* Jika ID sepatu (slug) sudah ada di database, script tidak akan membuat data duplikat, melainkan memperbarui (*update*) data spesifikasi terbaru.

---

## 3. Hal-Hal yang Perlu Diperhatikan

1. **Proteksi Cloudflare / Rate Limiting**:
   - Jangan menjalankan scraper dalam loop ratusan URL secara bersamaan tanpa jeda (*delay*).
   - Berikan jeda minimal 2–5 detik antar request untuk menghindari pemblokiran IP.
2. **Perubahan DOM / Class HTML RunRepeat**:
   - RunRepeat secara berkala memperbarui desain antarmuka mereka.
   - Jika scraper mengembalikan nilai `0` atau `null`, periksa selector CSS di fungsi `findMetric()` dan pastikan teks elemen target belum berganti.
3. **Koneksi Database Target**:
   - Jika variabel `TURSO_DATABASE_URL` diatur di `.env`, script akan langsung memasukkan data ke database cloud Turso.
   - Jika kosong, script otomatis menyimpan data ke file lokal `data/shoes.db`.

---

## Perbaikan Scraper & Audit Data (v2)

Scraper lama salah ekstrak (berat acak, spec default 265g/8/36/28, plat "Carbon Fiber" di hampir semua sepatu). Versi baru:

- `scripts/lib/runrepeat-parser.ts` — parser murni: spec lab dari **kolom pertama** tabel perbandingan RunRepeat, fakta (terrain, release date) dari blok `rr_facts__name`, plat dideteksi **per kalimat** (negasi/perbandingan diabaikan), busa dicocokkan per brand.
- `scripts/lib/classify-shoe.ts` — klasifikasi kategori, kini memakai fakta terstruktur (terrain, pace, type) bukan seluruh HTML.
- Tanpa default diam-diam: spec wajib tak ketemu / di luar batas (`SPEC_LIMITS` di `src/schemas/shoe.schema.ts`) → `needs_review`, tidak masuk DB.
- `releaseYear` kosong disimpan sebagai `0` (= tidak diketahui; kolom NOT NULL).

### Perintah

```bash
npm run db:audit                       # cek kualitas DB (read-only, exit 1 bila ada pelanggaran)
npx tsx scripts/scrape-runrepeat.ts <url> --dry-run     # satu sepatu, tanpa tulis DB
npx tsx scripts/scrape-bulk.ts --from-db --dry-run --report scripts/report.json   # uji re-scrape semua
npx tsx scripts/scrape-bulk.ts --from-db --report scripts/report-fix.json         # tulis perbaikan ke DB
npm run test                           # unit test parser / skema (fixture HTML nyata)
```

Selalu `cp data/shoes.db data/shoes.db.bak` sebelum menulis.
