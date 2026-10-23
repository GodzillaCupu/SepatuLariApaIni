# Panduan Operasional Data — Hapus, Scraping, Press Kit, dan Pengolahan

> **Bukan nasihat hukum berlisensi.** Panduan praktis dari AI yang berperan sebagai penasihat hukum proyek. Tinjau dengan advokat HKI/PDP sebelum peluncuran komersial. Pasal/regulasi disebut secara umum dan perlu diverifikasi.

| | |
|---|---|
| **Tanggal** | 2026-10-23 |
| **Objek** | LariYuk / SepatuLariApaIni |
| **Dokumen terkait** | [`LEGAL-DATA-AUDIT-RUNREPEAT.md`](LEGAL-DATA-AUDIT-RUNREPEAT.md) · [`LEGAL-ADVISORY-SUMBER-DATA-BARU.md`](LEGAL-ADVISORY-SUMBER-DATA-BARU.md) |

Isi: (1) data yang dihapus vs dipertahankan · (2) yang boleh vs dilarang di-scrape · (3) cara mengenali foto press kit · (4) cara mengolah data scraping agar risiko hukum serendah mungkin.

---

## 1. Data yang Harus Dihapus vs Boleh Dipertahankan

Dasar: tabel `shoes` dan `shoe_images` (`src/db/schema.ts`), aset di repo, dan dokumen. Pembagian tiga tingkat:

- 🔴 **HAPUS** — konten ekspresif/aset milik RunRepeat, atau turunan langsungnya.
- 🟠 **GANTI / VERIFIKASI ULANG** — fakta yang nilainya berasal dari pengukuran/olahan RunRepeat. Boleh tampil sementara hanya bila belum ada klaim, tetapi harus diganti dengan nilai dari pabrikan atau olahan sendiri.
- 🟢 **BOLEH TETAP** — fakta umum atau karya sendiri.

### 1.1 Kolom database

| Kolom / Data | Tingkat | Alasan & tindakan |
|---|---|---|
| `verdict_summary` | 🔴 Hapus | Teks review disalin verbatim (hak cipta). Ganti tulisan sendiri dari fakta (§4.4) |
| `pros`, `cons` | 🔴 Hapus | Bagian dari ulasan RunRepeat. Buat sendiri dari spesifikasi |
| `image_url` | 🔴 Hapus | Mengarah ke foto RunRepeat. Ganti foto berizin |
| Tabel `shoe_images` (5.435 baris) | 🔴 Hapus semua | Foto berhak cipta; sumber `runrepeat` |
| `source_url` (ke runrepeat.com) | 🔴 Hapus/ganti | Setelah data diganti, rujukan ke RunRepeat tidak relevan dan menyiratkan ketergantungan. Ganti URL pabrikan/toko resmi |
| `weight_grams`, `heel_stack_mm`, `forefoot_stack_mm`, `drop_mm` | 🟠 Verifikasi ulang | Hasil ukur RunRepeat. Ganti dengan angka pabrikan (label "menurut pabrikan"). Fakta teknis, tetapi nilai ukur lab adalah aset mereka |
| `foam_type`, `plate_type` | 🟠 Verifikasi ulang | Fakta produk; boleh tetap bila **dikonfirmasi** lewat situs pabrikan |
| `cushion_feel` | 🟠 Ganti | Diturunkan dari "softness" RunRepeat. Hitung ulang lewat aturan sendiri (Opsi 1) |
| `sizing`, `length_fit`, `width_fit`, `fit_votes` | 🟠 Ganti | Hasil uji fit/suara pengguna RunRepeat. Hapus sampai ada sumber sendiri |
| `breathability`, `upper_material` | 🟠 Ganti | Uji/penilaian RunRepeat. Material upper boleh dari pabrikan |
| `category`, `sub_category`, `terrain`, `primary_use`, `secondary_use`, `target_pace_range`, `runner_type` | 🟠 Hitung ulang | `classify-shoe.ts` memakai teks review RunRepeat (`articleText`, `verdictSummary`) sebagai masukan. Jalankan ulang hanya dari spesifikasi pabrikan |
| `brand`, `model`, `release_year`, `id` (slug) | 🟢 Tetap | Fakta/nama. Cek tahun rilis dari pabrikan |
| `surface`, `created_at`, `updated_at` | 🟢 Tetap | Metadata sendiri (isi `surface` ulang bila berasal dari RunRepeat) |

### 1.2 Aset, kode, dan dokumen

| Aset | Tingkat | Tindakan |
|---|---|---|
| `public/vision/index-siglip-v1.bin`, `manifest-siglip-v1.json` | 🔴 Hapus | Embedding turunan foto RunRepeat; bangun ulang dari foto berizin |
| `scripts/__fixtures__/*.html` | 🔴 Hapus | Salinan halaman RunRepeat utuh; ganti fixture sintetis |
| `data/shoes.db.bak`, `*.pre-*.bak`, `turso-prod-*.sql`, `replace-to-turso.sql` | 🔴 Hapus (lihat §1.3) | Salinan seluruh data lama |
| `data/shoes.db` | 🔴 Kosongkan/ganti | Setelah migrasi |
| Turso production | 🔴 Ganti | Jalankan skrip pengganti; verifikasi tidak ada baris lama |
| `scripts/scrape-runrepeat.ts`, `lib/runrepeat-parser.ts`, `lib/gallery-images.ts`, `urls.json` | 🟠 Nonaktifkan/hapus | Kode itu sendiri bukan masalah, tetapi jangan dipakai lagi; hapus agar tidak tergoda |
| `next.config.mjs` `remotePatterns` `cdn.runrepeat.com`, `runrepeat.com` | 🟠 Hapus | Setelah foto diganti |
| `README.md` ("lab independen RunRepeat"), `docs/PRD.md`, `ARCHITECTURE.md`, `ADR-002` | 🟠 Ubah | Hapus klaim sumber dan rujukan teknis ke RunRepeat |
| Tautan "Lihat Data Lab Lengkap di RunRepeat" (`ShoeDetailModal.tsx`) | 🟠 Ganti | Ganti ke tautan pabrikan/toko resmi |
| Kode aplikasi (UI, `classify-*`, skema) | 🟢 Tetap | Karya sendiri; bersihkan hanya bagian yang membaca teks RunRepeat |
| `src/data/fallback-shoes.ts` | ❓ Periksa | Belum diaudit isinya; hapus bagian yang disalin dari RunRepeat |
| Gambar milik sendiri (`saweriaQR.png`, ikon, `dev-samples` buatan sendiri) | 🟢 Tetap | Verifikasi `dev-samples` bukan foto pihak ketiga |
| `NB-SCRebel-testImage.jpg`, `Superblast-testImage.jpg` (folder induk) | ❓ Periksa | Pastikan bukan foto produk pihak ketiga (di luar folder docs; hanya cek) |

### 1.3 Aturan menghapus dengan aman

1. **Sebelum hapus: ambil satu snapshot privat** (disk terenkripsi, di luar repo dan di luar cloud publik) sebagai cadangan rollback. Hapus snapshot dalam ≤ 30 hari setelah migrasi sukses. Jangan di-commit, jangan di-sync ke layanan publik.
2. **Cek dulu: apakah ada somasi/klaim?** Belum ada → pembersihan sah. **Sudah ada → JANGAN hapus apa pun**; bekukan (legal hold) dan hubungi advokat.
3. **Urutan:** nonaktifkan scraper → migrasi data baru ke DB lokal → uji → ganti Turso prod → hapus backup/fixture → bersihkan git.
4. **Git (bila repo publik atau pernah publik):** hapus file dari tracking lalu bersihkan history (`git filter-repo`), paksa-push, dan minta GitHub membersihkan cache bila perlu. Fork/clone pihak lain tidak bisa dikendalikan, jadi lakukan secepatnya.
5. **Cache lain:** bersihkan cache Vercel/CDN dan service worker (`sw.js`) agar gambar/data lama tidak tersaji.
6. **Verifikasi akhir:** `grep -ri runrepeat` di repo, query `SELECT COUNT(*) FROM shoe_images WHERE source='runrepeat'` = 0, dan cek tidak ada URL `runrepeat.com` di data/produksi.
7. **Catat** tanggal dan hal yang dihapus di log internal (bukti itikad baik).

---

## 2. Boleh vs Dilarang di-Scrape

### 2.1 Aturan dasar
Scraping halaman **publik** tidak otomatis ilegal, tetapi bisa melanggar ToS (kontrak), hak cipta, hak database, atau UU ITE (bila menembus pembatas teknis). **Tiga syarat sebelum scrape situs mana pun:**
1. `robots.txt` tidak melarang path itu.
2. ToS/Syarat Penggunaan tidak melarang akses otomatis (atau kamu punya izin tertulis).
3. Data yang diambil sebatas **fakta** yang kamu perlukan.

### 2.2 Boleh

| Sasaran | Syarat |
|---|---|
| Halaman produk publik di situs resmi pabrikan (spec: berat, drop, stack, foam, plate, material, tahun, warna) | robots OK, ToS tidak melarang, per-produk, laju rendah |
| Feed/API resmi (afiliasi, developer, GTIN/SKU) | Sesuai syarat penggunaan feed |
| Sitemap resmi untuk menemukan URL produk | Sesuai robots |
| URL toko resmi pabrikan (untuk tombol beli) | Tautan saja |
| Data dari **izin tertulis** brand | Simpan buktinya |
| Data buatan sendiri (pengukuran sendiri, input manual) | — |

### 2.3 Dilarang

| Sasaran | Alasan |
|---|---|
| RunRepeat dan agregator/pesaing berlisensi lain | Tanpa izin; produk komersial mereka |
| Halaman di balik login/paywall/captcha, atau memakai trik bypass (rotasi proxy residensial untuk menghindari blokir, solver captcha, spoof fingerprint) | Penghindaran pembatas teknis; risiko UU ITE (akses ilegal, mis. Pasal 30) dan memperburuk itikad |
| Path yang dilarang `robots.txt` | Pelanggaran sinyal akses |
| Situs yang ToS-nya jelas melarang scraping, tanpa izin | Pelanggaran kontrak |
| Teks marketing/deskripsi/story/blog brand | Hak cipta |
| Ulasan pelanggan di situs brand/toko | Hak cipta penulis + data pribadi (nama) + hak database platform |
| Media sosial (Instagram, TikTok, X, YouTube, Facebook) | ToS melarang; UU PDP |
| Marketplace dan toko pihak ketiga (Shopee, Tokopedia, Amazon, dll) untuk harga/ulasan/foto | ToS melarang; hak foto penjual |
| Logo, wordmark, aset brand | Merek dagang |
| Seluruh katalog brand sekaligus (non-lari, apparel, dll) | Ekstraksi substansial → hak database; di luar kebutuhan |
| Data pribadi (nama reviewer, akun, foto orang) | UU PDP 27/2022 |
| Artikel berita: kalimat dan foto | Hak cipta (fakta boleh dicatat manual dengan kata sendiri) |

### 2.4 Aturan teknis (wajib dalam kode scraper)

| Aturan | Implementasi |
|---|---|
| Identitas jujur | `User-Agent: LariYukBot/1.0 (+https://<situs-app>/bot; kontak@email)` |
| Patuh robots | Baca & cache `robots.txt` tiap host, tolak path yang dilarang |
| Laju rendah | ≥ 3–5 detik per host, 1 koneksi per host, jadwal malam hari |
| Berhenti saat diminta | Hentikan pada 403/429/ permintaan berhenti; jangan retry agresif |
| Cache & kondisional | Simpan `ETag`/`Last-Modified`; jangan unduh ulang bila tidak berubah |
| Kontak | Halaman `/bot` menjelaskan tujuan dan kontak untuk keberatan |
| Log bukti | Simpan URL, waktu, status, versi robots, salinan ToS (tanggal) |
| Batasi cakupan | Whitelist URL produk lari yang diperlukan, bukan crawl bebas |
| Tidak ada anti-deteksi | Jangan pakai proxy rotasi/penyamaran untuk menembus blokir |

---

## 3. Cara Mengetahui Foto Itu Press Kit

**Kunci:** foto disebut press kit hanya bila **pemilik menyediakannya untuk media/mitra dan ada penanda izin yang bisa dibuktikan**. Foto yang hanya "terlihat di internet" atau di halaman produk **bukan** press kit.

### 3.1 Tanda foto press kit (cek semua yang bisa)

| # | Penanda | Cara cek |
|---|---|---|
| 1 | Berada di halaman resmi **media/press/newsroom** pabrikan (pola umum: subdomain `news.`/`press.`/`media.`, atau path `/press`, `/newsroom`, `/media-center`) | Periksa URL; pastikan domain resmi brand, bukan tiruan. Alamat pasti perlu diverifikasi per brand |
| 2 | Ada keterangan **"for editorial/media use"**, atau lisensi penggunaan di halaman unduhan | Baca teks syarat di halaman; tangkap layar + tanggal |
| 3 | Diunduh lewat **portal aset** (Bynder, Brandfolder, Pressloft, Dropbox/Drive resmi PR) dengan syarat penggunaan | Simpan syarat yang disetujui saat unduh |
| 4 | Dikirim **langsung oleh tim PR/brand** (email resmi) | Simpan email sebagai bukti |
| 5 | Metadata **IPTC/EXIF** memuat Copyright/Credit/Usage Terms | `exiftool foto.jpg` → lihat `Copyright`, `Credit`, `Rights`, `UsageTerms` |
| 6 | Disediakan di **program afiliasi/mitra** (Involve Asia, Impact, Awin, dll) sebagai creative asset | Baca syarat publisher di jaringan |
| 7 | Brand **menjawab permintaan izin** tertulis | Simpan jawaban |

### 3.2 Bukan press kit (jangan diasumsikan boleh)

- Foto di halaman produk toko (milik brand, untuk jualan di situs itu).
- Hasil Google Images/Pinterest/Wikipedia/situs review.
- Foto di marketplace (milik penjual/brand/fotografer).
- Postingan sosmed brand atau influencer.
- Foto dengan watermark/credit fotografer atau agensi.
- File "Free download" di situs tak resmi.
- Foto dari RunRepeat.

### 3.3 Press kit ≠ bebas dipakai untuk apa saja
Press kit sering berarti **penggunaan editorial** (berita/review), bukan otomatis untuk **aplikasi** atau **turunan** (embedding AI). Pastikan izin tertulis menjawab:

| Pertanyaan | Harus jelas |
|---|---|
| Boleh tampil di aplikasi digital/PWA? | Ya/tidak |
| Boleh disimpan/di-host sendiri, atau hanya hotlink? | |
| Boleh diolah (crop, resize, **embedding/AI pengenalan**)? | |
| Komersial atau non-komersial (donasi/iklan/afiliasi)? | |
| Durasi dan wilayah (Indonesia/global)? | |
| Perlu credit/atribusi tertentu? | |
| Dapat dicabut? Berapa lama waktu hapus? | |

**Bila syarat tidak menyebut "aplikasi" dan "pengolahan AI", minta konfirmasi tertulis** (contoh: balasan email "boleh dipakai untuk aplikasi referensi sepatu lari non-komersial, termasuk pengenalan visual").

### 3.4 Alur keputusan

```
Foto ditemukan
  ├─ Sumber: portal media / email PR / feed afiliasi resmi?
  │     ├─ Tidak → JANGAN pakai (minta izin atau cari ganti)
  │     └─ Ya → ada syarat tertulis & mencakup aplikasi?
  │              ├─ Tidak jelas → minta konfirmasi tertulis → tunggu
  │              └─ Ya → simpan bukti + catat di register lisensi → boleh pakai
  └─ Tidak yakin → anggap TIDAK boleh
```

### 3.5 Register lisensi foto (wajib per foto/per batch)

| Field | Isi |
|---|---|
| `shoe_id` | |
| `image_url` / file | |
| `source_page` | URL halaman asal |
| `owner` | Brand/fotografer |
| `license_type` | press_kit / affiliate_creative / written_permission / own |
| `proof` | Path bukti (tangkapan layar, email, PDF syarat) |
| `scope` | app / ai_embedding / commercial |
| `valid_until` | |
| `obtained_at` | |
| `credit_text` | |

---

## 4. Mengolah Data Hasil Scraping dengan Risiko Hukum Serendah Mungkin

Prinsip: **ambil fakta, bukan ekspresi · simpan jejak asal · tambah nilai sendiri · siap mencabut cepat.**

### 4.1 Alur yang disarankan

```
Scrape (patuh aturan §2.4)
   → Parse hanya field whitelist (fakta)
   → Buang HTML/teks mentah (atau simpan privat, ≤30 hari)
   → Normalisasi unit & nilai
   → Verifikasi (lintas-sumber/rentang masuk akal)
   → Olah sendiri (aturan Opsi 1, teks buatan sendiri)
   → Simpan + provenance per field
   → Review manual sebelum publik
   → Tampilkan dengan label & atribusi
```

### 4.2 Pengumpulan (minimisasi)
- **Whitelist field:** brand, model, tahun, berat, drop, stack, foam, plate, material upper, warna, tautan toko resmi. Selain itu **jangan diambil**.
- **Fakta saja:** angka, enum, nama. **Tanpa kalimat marketing**, tanpa ulasan, tanpa nama orang.
- **Cakupan sempit:** hanya sepatu lari yang relevan, bukan seluruh katalog atau apparel (mengurangi risiko hak database).
- **Jangan menimbun HTML:** simpan mentah hanya di penyimpanan privat dengan retensi ≤ 30 hari untuk debugging; bukan di git, bukan di fixture. Fixture uji = HTML sintetis buatan sendiri.

### 4.3 Normalisasi & verifikasi
- Seragamkan unit (gram, mm, min/km); catat ukuran acuan (mis. berat untuk US men's 9).
- Beri **rentang validasi** (berat 100–450 g, drop 0–14 mm, dst.); di luar rentang → `needs_review`, jangan ditebak.
- **Dua sumber independen** untuk angka penting bila ada (situs pabrikan + feed afiliasi). Bila beda, tampilkan nilai pabrikan dan tandai.
- Kolom yang tidak ditemukan → `NULL`, tampil "belum tersedia". **Jangan mengisi dari ingatan atau dari sumber terlarang.**

### 4.4 Pengolahan menjadi karya sendiri (Opsi 1)
- **Aturan deterministik & terdokumentasi**, mis. `foam=PEBA` → `cushion_feel=Plush`; `stack>35mm`+plate → kategori tertentu. Simpan di repo sebagai tabel aturan berversi.
- **Label jelas:** "Estimasi berdasarkan spesifikasi pabrikan", bukan "hasil uji lab".
- **Jangan kalibrasi aturan dengan menyalin label RunRepeat** secara massal. Dasar aturan: pengetahuan umum biomekanik/material dan spesifikasi.
- **Teks deskripsi:** hasilkan dari data terstruktur dengan template sendiri ("Sepatu ini 255 g dengan drop 8 mm dan foam PEBA…"). **Jangan parafrase dekat** teks sumber, dan jangan minta AI "menulis ulang" paragraf brand/review — hasilnya tetap turunan. Bila memakai AI, masukannya hanya angka/fakta, bukan teks sumber.
- **Skor/ranking buatan sendiri** boleh dan bernilai; jelaskan metodologinya di halaman "Cara Kami Menilai".

### 4.5 Penyimpanan: provenance per field
Simpan asal tiap data agar bisa dicabut/diaudit. Usulan struktur (nama bersifat contoh):

```ts
// tabel shoe_field_sources (contoh)
{
  shoeId: string,
  field: "weight_grams" | "drop_mm" | ...,
  value: string,
  sourceUrl: string,        // halaman pabrikan
  sourceType: "brand_site" | "affiliate_feed" | "manual" | "derived",
  retrievedAt: string,      // ISO
  licenseStatus: "none_needed_fact" | "permission" | "press_kit",
  evidenceRef: string | null, // path bukti
  robotsVersion: string, tosSnapshot: string
}
```

Tambahan di `shoes`: `data_status` (`published` / `needs_review` / `takedown`) agar tiap brand bisa **dimatikan cepat**.

### 4.6 Penayangan (UI)
- Label **"Menurut pabrikan"** pada angka dari brand; **"Estimasi LariYuk"** untuk hasil olahan.
- Tampilkan **tanggal pengambilan data** dan tautan ke halaman resmi/ toko resmi.
- **Disclaimer:** data "apa adanya", dapat berubah, tidak berafiliasi dengan pabrikan, bukan nasihat medis.
- **Tautan afiliasi** diberi pengungkapan.
- **Tanpa logo brand**; nama brand/model hanya sebagai teks deskriptif.
- **Jangan menyediakan unduhan massal** (CSV/JSON seluruh data) atau API publik yang membuka seluruh dataset. Periksa `src/app/api/shoes`: batasi paginasi, rate-limit, dan jangan mengekspos kolom mentah berlisensi.

### 4.7 Gambar
- Pakai hanya gambar dengan **bukti izin** (§3.5). Simpan kredit bila diminta; jangan hapus watermark/metadata kredit.
- Hotlink dari server izin hanya bila diizinkan; jika menyimpan salinan, sesuai syarat izin.
- **Embedding/AI pengenalan** hanya dari gambar yang izinnya mencakup pengolahan AI, atau dari foto kontribusi pengguna/ foto sendiri.
- Fitur kamera: foto pengguna diproses di perangkat; jelaskan di Kebijakan Privasi.

### 4.8 Pemeliharaan & takedown
| Hal | Praktik |
|---|---|
| Kill switch per sumber | `data_status='takedown'` + tombol sembunyikan per brand |
| Respons keberatan | Hapus/sembunyikan dalam 24–72 jam setelah diminta, balas tertulis |
| Tinjau ToS/robots | Per kuartal & sebelum scrape ulang; simpan salinan bertanggal |
| Retensi | Hapus HTML mentah ≤ 30 hari; hapus data brand yang sudah berhenti diproduksi bila diminta |
| Akurasi | Jadwalkan pembaruan; tandai data kedaluwarsa |
| Daftar risiko | Catat di risk register; tinjau bila ada perubahan model bisnis (iklan, langganan) |

### 4.9 Gerbang review sebelum publik (checklist)

- [ ] Setiap sumber lolos robots + ToS (atau ada izin tertulis)
- [ ] Hanya field whitelist yang tersimpan
- [ ] Tidak ada teks marketing/ulasan/nama orang
- [ ] Setiap foto punya bukti izin di register
- [ ] Setiap angka berlabel sumber ("menurut pabrikan"/"estimasi")
- [ ] Provenance tercatat (URL, tanggal, bukti)
- [ ] Tidak ada rujukan/ aset RunRepeat tersisa
- [ ] Disclaimer, kebijakan privasi, halaman sumber data, kontak takedown tayang
- [ ] Pengungkapan afiliasi tayang bila ada
- [ ] Tidak ada unduhan/API yang mengekspos dataset penuh
- [ ] Kill switch per sumber berfungsi

---

## 5. Perkiraan Dampak pada Risiko

| Kondisi | Level risiko |
|---|---|
| Sekarang (data RunRepeat masih ada) | 🟠 TINGGI |
| Setelah §1 dijalankan (pembersihan) | 🟡 SEDANG–RENDAH |
| Setelah §2–§4 dijalankan + izin foto | 🟢 RENDAH |
| Bila Opsi 3 (sosmed) dilakukan | 🔴 naik kembali |

## 6. Batasan
- Isi `fallback-shoes.ts`, `dev-samples`, `/api/shoes`, alur kamera produksi, dan visibilitas repo **belum diaudit**.
- ToS dan robots tiap pabrikan **belum diperiksa**; hasilnya dapat mengubah daftar "boleh".
- Regulasi (UU Hak Cipta 28/2014, UU ITE, UU PDP 27/2022, hak database UE, UU Perlindungan Konsumen) disebut garis besar; verifikasi dengan advokat.
