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

### C. Scraper RunRepeat (`scripts/scrape-runrepeat.ts`)
Mengambil data spesifikasi lab dari halaman review RunRepeat dan menyimpannya langsung ke database:

```bash
# Contoh: Scrape Asics Novablast 4
npm run scrape https://runrepeat.com/asics-novablast-4

# Atau jalankan via tsx langsung:
npx tsx scripts/scrape-runrepeat.ts https://runrepeat.com/nike-pegasus-41
```

### D. Bulk Scraper — Banyak URL Sekaligus (`scripts/scrape-bulk.ts`)

Menjalankan scraping banyak URL secara otomatis dengan kontrol concurrency dan delay untuk menghindari pemblokiran:

```bash
# 1. Dari file urls.json (cara paling praktis):
npm run scrape:bulk:file

# 2. Dari argumen CLI langsung:
npx tsx scripts/scrape-bulk.ts https://runrepeat.com/asics-novablast-4 https://runrepeat.com/nike-pegasus-41

# 3. Dengan opsi custom:
npx tsx scripts/scrape-bulk.ts --file scripts/urls.json --concurrency 3 --delay 5000

# 4. Dry run (preview URL tanpa scraping):
npx tsx scripts/scrape-bulk.ts --file scripts/urls.json --dry-run
```

**Format `urls.json`** — mendukung dua format:
```json
[
  "https://runrepeat.com/asics-novablast-4",
  { "url": "https://runrepeat.com/adidas-adizero-adios-pro-4", "categoryOverride": "race_day" }
]
```

| Opsi | Default | Keterangan |
|---|---|---|
| `--file <path>` | — | Path ke file JSON berisi daftar URL |
| `--concurrency <n>` | `2` | Jumlah request paralel |
| `--delay <ms>` | `3000` | Jeda antar request (ms) |
| `--dry-run` | off | Preview daftar URL tanpa scraping |

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

#### 3. Logika Penentuan Kategori Rotasi Otomatis
```typescript
if (fullText.includes("trail") || fullText.includes("vibram")) {
  category = "trail";
} else if (fullText.includes("carbon plate") || fullText.includes("super shoe")) {
  category = "race_day";
} else if (heelStackMm >= 40) {
  category = "max_cushion";
}
```
*Penjelasan:* Jika kategori tidak ditentukan secara manual, script memeriksa kata kunci di teks artikel serta ketebalan bantalan tumit (*heel stack*). Bila tumit $\ge 40\text{ mm}$, otomatis diklasifikasikan sebagai *Max Cushion*.

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
