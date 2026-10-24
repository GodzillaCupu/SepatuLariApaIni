# Fase 2 — Kelayakan Scraping per Brand

**Tujuan:** menentukan, per brand, apakah boleh di-scrape, perlu izin, atau tidak. Hasil menentukan adapter Fase 3 dan jalur foto Fase 5.
**Sifat:** riset + korespondensi, **tanpa kode**. **Status:** 🟢 siap.

## 1. Daftar Brand (dari DB, 118 sepatu)

| Prioritas | Brand | Jml sepatu | Catatan |
|:-:|---|:-:|---|
| Pilot | ASICS | 17 | brand utama |
| Pilot | Brooks | 17 | |
| Pilot | HOKA | 14 | |
| 2 | New Balance | 17 | |
| 2 | Nike | 15 | situs sering berat JS / ketat bot |
| 2 | Saucony | 13 | |
| 2 | Adidas | 7 | |
| 3 | On | 6 | |
| 3 | Puma | 5 | |
| 3 | Mizuno | 2 | |
| 3 | Mount to Coast | 2 | brand kecil, kemungkinan responsif |
| 3 | Altra, Salomon, Skechers | 1 / 1 / 1 | manual jika adapter tidak sepadan |

Pemilihan pilot = jumlah sepatu besar + (diharapkan) struktur halaman stabil. Boleh diganti setelah cek §3.

## 2. Prosedur Cek per Brand (±30–45 menit/brand)

Lakukan **manual di browser**, bukan scraper. Simpan bukti ke folder privat `legal-evidence/<brand>/<tanggal>/` (di luar git).

### 2.1 `robots.txt`
1. Buka `https://<domain-brand>/robots.txt` (cek domain regional yang dipakai: `.com`, `.co.id`, `.eu`).
2. Simpan teks + tangkapan layar + tanggal.
3. Catat: `User-agent: *` memblokir path produk? Ada `Disallow` untuk `/products`, `/shop`, parameter filter? Ada `Crawl-delay`? Aturan khusus bot AI/data?
4. Cek sitemap yang disebut (`Sitemap:`) — sumber URL produk resmi.

### 2.2 Terms of Service / Terms of Use
1. Cari "Terms of Use", "Terms & Conditions", "Legal", di footer tiap domain.
2. Cari kata kunci: *scrape, crawl, robot, spider, automated, data mining, extraction, bot, systematic, reproduce*.
3. Simpan PDF/tangkapan layar + tanggal + URL.
4. Klasifikasi: **melarang eksplisit** / **diam** / **mengizinkan terbatas**.
5. Cek hukum yang berlaku & yurisdiksi (indikasi hak database bila UE).

### 2.3 Meta/Header lain
- `<meta name="robots">` / header `X-Robots-Tag` pada halaman produk.
- `tdm-reservation` / `ai.txt` / `/.well-known/tdmrep.json` (reservasi text-and-data-mining UE).

### 2.4 Jalur resmi (cari sebelum scraping!)
| Jalur | Cara cari |
|---|---|
| Newsroom/press | URL pola `news.`, `press.`, `media.`, `/newsroom`, `/press`, `/media-center` |
| Portal aset | tanda Bynder, Brandfolder, Pressloft, Frontify di footer/press |
| Program afiliasi | cari "<brand> affiliate program" + cek jaringan: Involve Asia, Impact, Awin, Rakuten, CJ |
| API/feed produk | "developer", "product feed", "GTIN" |
| Kontak PR/partnership | halaman Contact/Press |

### 2.5 Struktur halaman produk (hanya observasi)
Catat untuk Fase 3: apakah spec ada di HTML statis atau JSON ter-embed (`__NEXT_DATA__`, JSON-LD `Product`)? Apakah ada sitemap produk? Apakah ada penghalang (login/captcha) → **jika ada, brand = NO untuk scraping** (tidak ada bypass).

## 3. Template Checklist (isi per brand; sinkron dengan advisory §10)

```
Brand: ______________   Tanggal cek: ________   Pemeriksa: ______
Domain dipakai: ______________________
[ ] robots.txt diperiksa   → path produk: DIIZINKAN / DIBLOKIR / PARSIAL  (bukti: ____)
    Crawl-delay: ____     Sitemap: ____
[ ] ToS diperiksa          → scraping: DILARANG / DIAM / DIIZINKAN        (bukti: ____)
    Kutipan kunci (≤15 kata): ________________
[ ] Reservasi TDM / ai.txt / meta robots: ________
[ ] Press kit / newsroom: ADA / TIDAK   URL: ________
[ ] Program afiliasi: ADA / TIDAK   Jaringan: ________
[ ] API / feed: ADA / TIDAK
[ ] Halaman produk butuh login/captcha/JS-berat: YA / TIDAK
[ ] Izin tertulis: BELUM / DIMINTA (tgl) / DITERIMA (tgl) / DITOLAK
Keputusan: GO / PERMISSION / NO     Alasan: ____________
Ruang lingkup yang diizinkan: spec / foto / buy-link
```

## 4. Kriteria Keputusan

| Hasil | Syarat | Tindakan |
|---|---|---|
| **GO** | robots tidak memblokir path produk **dan** ToS diam atau tidak melarang akses otomatis **dan** tidak ada captcha/login | Bangun adapter (Fase 3) — spec saja; foto ikuti Fase 5 |
| **PERMISSION** | ToS melarang scraping, atau ambigu/hak database kuat | Minta izin tertulis / feed afiliasi. Tahan scraping sampai ada jawaban |
| **NO** | robots memblokir, captcha/login, atau izin ditolak | Tidak di-scrape. Isi manual (spec dari halaman resmi, diketik sendiri, per produk) atau biarkan kosong |

Aturan tambahan: keputusan **per domain & per jenis data** (spec boleh, foto belum). Perubahan ToS/robots → ulang cek (Fase 8).

## 5. Permintaan Izin (jalan paralel)
Kirim ke kontak PR/partnership brand yang berstatus **PERMISSION**, dan ke brand pilot untuk **foto** (lihat Fase 5). Lakukan dari email proyek, simpan balasan.

**Draft (English), ubah per brand:**
> Subject: Permission request — non-commercial running-shoe reference app (LariYuk)
>
> Hello <Brand> team,
>
> I'm the independent developer of LariYuk, a free Indonesian-language web app that helps recreational runners choose running shoes. We'd like to list <Brand> shoes with official specifications (weight, drop, stack height, midsole technology), a link to your official store, and — if you allow it — official product images.
>
> Could you let us know (1) whether you provide a press kit / media assets / product feed we may use, (2) the terms for displaying images in a web app, and (3) whether you have an affiliate program? We would credit <Brand> as the source, state we are not affiliated, and remove content promptly on request.
>
> Thank you,
> <Nama> — <email> — <URL>

Tambahkan satu paragraf khusus Fase 5 bila relevan (izin pemrosesan visual/AI) — lihat template di dokumen Fase 5.

**Tindak lanjut:** catat tanggal kirim · tidak ada balasan 14 hari → ulang sekali · simpan semua balasan sebagai `permission_ref`. **Jangan** mengirim surat ke RunRepeat.

## 6. Output Fase 2
1. `brand_sources` terisi (setelah skema Fase 1 ada) atau tabel sementara `docs/plan-pivot-data/BRAND-DECISIONS.md`.
2. Folder bukti privat per brand.
3. Daftar GO / PERMISSION / NO + urutan adapter.
4. Pilot 3 brand final.

## 7. Definition of Done
- 14 brand punya keputusan + bukti bertanggal.
- Minimal 3 brand GO untuk pilot (atau jalur izin berjalan untuk brand utama).
- Email izin terkirim untuk semua PERMISSION + permintaan press kit untuk brand pilot.
