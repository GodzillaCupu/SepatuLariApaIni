# Fase 3 — Scraper Pabrikan

**Tujuan:** kerangka scraper patuh-aturan + adapter per brand yang mengambil **hanya fakta spesifikasi + tautan toko resmi**.
**Prasyarat:** Fase 2 (daftar GO) dan Fase 1 (skema final; minimal tabel provenance). **Status:** 🟡 desain siap, kode menunggu prasyarat.

## 1. Cakupan

| Termasuk | Tidak termasuk |
|---|---|
| Berat, drop, stack heel/forefoot, foam, plate, upper material, tahun rilis, warna, `buy_url` | Teks marketing/deskripsi/story, ulasan pelanggan, nama orang |
| Pencarian URL produk lewat sitemap resmi | Logo/aset brand |
| Provenance + bukti per field | Foto (diurus Fase 5 — scraper tidak mengunduh foto) |
| Mode `--dry-run`, laporan | Marketplace, sosmed, agregator |
| | Anti-deteksi: proxy rotasi, captcha solver, spoof fingerprint |

> Foto: adapter boleh **mencatat URL halaman produk** untuk keperluan permintaan izin, tetapi **tidak mengunduh/menyimpan gambar**. Jalur foto = press kit (Fase 5).

## 2. Arsitektur

```
scripts/
  scrape-brand.ts                  # CLI: --brand asics --url <u> | --sitemap --limit 20 --dry-run --report out.json
  lib/brand-scraper/
    types.ts                       # BrandAdapter, RawSpecs, ScrapeResult
    http.ts                        # fetch jujur + rate limit + ETag + stop 403/429
    robots.ts                      # fetch/cache/parse robots, isAllowed(url)
    evidence.ts                    # log bukti per request
    normalize.ts                   # unit, ukuran acuan, rentang
    provenance.ts                  # tulis ke shoe_field_sources
    adapters/
      index.ts                     # registry: brand -> adapter
      asics.ts  hoka.ts  brooks.ts # pilot
  data/manual-specs.json           # brand NO: input manual (sumber 'manual')
  __fixtures__/synthetic/*.html    # HTML buatan sendiri untuk test
  __tests__/brand-scraper/*.test.ts
```

Reuse: `scripts/lib/brands.ts` (`splitBrandModel`), `SPEC_LIMITS` di `src/schemas/shoe.schema.ts`, pola `--dry-run/--report/--concurrency` dari `scripts/scrape-bulk.ts`, `cheerio`.

### 2.1 Antarmuka adapter
```ts
interface BrandAdapter {
  brand: string;
  allowedHosts: string[];               // whitelist domain
  discoverUrls(ctx): Promise<string[]>; // dari sitemap resmi, bukan crawl bebas
  parse(html: string, url: string): RawSpecs; // murni, tanpa jaringan → mudah di-test
}
interface RawSpecs {
  brand; model; releaseYear?; weightGrams?; dropMm?; heelStackMm?; forefootStackMm?;
  foamType?; plateType?; upperMaterial?; colorways?; buyUrl?;
  raw: Record<string, string>;          // nilai mentah per field untuk provenance
  referenceSize?: string;               // mis. "US M9" untuk berat
}
```
`parse` hanya membaca JSON-LD/atribut spesifikasi terstruktur bila ada (lebih stabil), jatuh ke selektor HTML. Tidak menyimpan paragraf teks.

## 3. Aturan Teknis (wajib; uji otomatis)

| Aturan | Implementasi |
|---|---|
| Identitas jujur | `User-Agent: LariYukBot/1.0 (+https://<situs>/bot; <email>)` — tidak meniru browser |
| Patuh robots | `robots.ts` cache per host; `isAllowed()` dicek **sebelum tiap fetch**; ditolak → skip + catat |
| Laju rendah | ≥ 3–5 dtk per host, 1 koneksi per host (`--delay` default 4000, `--concurrency` 1 per host) |
| Berhenti saat diblokir | 403/429/captcha → hentikan host itu, tandai `blocked`, **tanpa retry agresif** (maks 1 retry dengan backoff untuk 5xx) |
| Kondisional | simpan ETag/Last-Modified di cache privat; `If-None-Match` saat re-run |
| Whitelist | hanya URL dari `discoverUrls` (sitemap/daftar manual) di `allowedHosts` |
| Tanpa penyamaran | tanpa proxy rotasi, tanpa header palsu, tanpa solver captcha |
| Jadwal | jalankan di luar jam sibuk situs (malam waktu lokal brand) |
| Kill switch | membaca `brand_sources.enabled/status`; non-GO → menolak jalan |
| Halaman `/bot` | halaman di app menjelaskan tujuan + kontak (dibuat di Fase 6; sebelum itu pakai URL repo/kontak) |

## 4. Alur Satu Sepatu

```
URL dari sitemap → robots.isAllowed? → fetch (UA jujur, rate-limit)
  → simpan HTML mentah ke .private-cache/ (gitignored, ≤30 hari)
  → adapter.parse → RawSpecs
  → normalize (unit, referenceSize) → validasi SPEC_LIMITS
       ├─ luar rentang / wajib kosong → status needs_review (alasan dicatat)
       └─ ok → upsert shoes (data_status='needs_review') + shoe_field_sources + evidence log
  → laporan JSON per URL (success | needs_review | blocked | failed)
```
- Field tak ditemukan = `NULL`; **tidak ada default diam-diam** (beda dari `scrape-runrepeat.ts` yang mengisi default).
- Identitas: `id` slug stabil dari brand+model+tahun; bila sepatu sudah ada di DB (dari RunRepeat), cocokkan lewat slug dan **timpa field spec dengan nilai pabrikan**, tandai sumber lama untuk dihapus Fase 7.
- Tidak ada estimasi/klasifikasi di fase ini (Fase 4 HOLD). Kolom kategori/pace dibiarkan nilai lama atau `NULL` sesuai keputusan skema.

## 5. Evidence Log
File JSONL privat `legal-evidence/<brand>/scrape-log.jsonl`, satu baris per request:
`{ts, url, status, bytes, robotsHash, tosSnapshotDate, adapterVersion, outcome}`
Plus salinan ToS bertanggal dari Fase 2. Tujuan: bukti itikad baik bila ada pertanyaan.

## 6. Strategi Test
| Test | Isi |
|---|---|
| Parser per adapter | Fixture **sintetis** buatan sendiri (struktur mirip, isi fiktif). Jangan salin halaman asli ke repo |
| `robots` | Aturan `Disallow` dihormati; wildcard; `Crawl-delay` dibaca |
| `http` | UA jujur terkirim; rate limit antar request; 403/429 menghentikan host; ETag dipakai |
| `normalize` | oz→g, inci→mm, "8mm"/"8 mm", ukuran acuan |
| Validasi | luar `SPEC_LIMITS` → `needs_review` |
| Guard | `scrape-brand` menolak brand non-GO / `enabled=0` |
Ganti `scripts/__tests__/scraper.test.ts` & `gallery-images.test.ts` (memakai fixture RunRepeat) saat fase 7; selama itu test lama tetap jalan terhadap fixture lama.

## 7. Rencana Rollout
1. **Pilot 3 brand** (ASICS, Brooks, HOKA — sesuai hasil Fase 2): `--dry-run --limit 3` per brand → tinjau laporan.
2. Jalankan penuh pilot → tinjau manual **semua** baris `needs_review` + sampel 10 baris vs halaman resmi.
3. Tambah brand GO lain satu per satu; brand PERMISSION menunggu izin; brand NO diisi `manual-specs.json`.
4. Setelah tiap brand: update `brand_sources`, catat di log pembersihan.

Estimasi usaha (kasar): kerangka 1–2 hari, tiap adapter 0,5–1 hari, tes+review 1 hari.

## 8. Risiko
| Risiko | Mitigasi |
|---|---|
| Situs berubah/dinamis (JS-render) | Prioritaskan JSON-LD/sitemap; bila perlu JS-render → brand jadi PERMISSION/manual, tidak pakai headless browser untuk menembus blokir |
| Berat per ukuran berbeda antar brand | Simpan `referenceSize`; tampilkan di UI (Fase 6) |
| Data pabrikan tidak lengkap (stack, foam) | Nullable + "belum tersedia" |
| Ketidakkonsistenan nama model vs DB lama | Tabel alias manual `brand-model-aliases.json` |
| Hak database UE | Per produk, cakupan sempit (hanya sepatu lari), laju rendah |

## 9. Definition of Done
- Kerangka `brand-scraper/` + 3 adapter pilot, semua test hijau, `tsc` bersih.
- Laporan dry-run & run penuh pilot; nol pelanggaran robots di log.
- Provenance tercatat untuk tiap field yang tersimpan; tidak ada HTML mentah di git.
- Pemilik menyetujui sampel 10 baris per brand.
