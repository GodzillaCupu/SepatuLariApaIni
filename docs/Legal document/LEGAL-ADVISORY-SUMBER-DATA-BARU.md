# Nasihat Hukum — Rencana Sumber Data Baru (Pabrikan, Foto, Opsi 1–3)

> **Bukan nasihat hukum berlisensi.** Disusun oleh AI yang berperan sebagai penasihat hukum untuk proyek ini. Tinjauan advokat HKI/PDP tetap disarankan sebelum peluncuran komersial.

| | |
|---|---|
| **Tanggal** | 2026-10-23 |
| **Objek** | LariYuk / SepatuLariApaIni |
| **Konteks** | Lanjutan dari [`LEGAL-DATA-AUDIT-RUNREPEAT.md`](LEGAL-DATA-AUDIT-RUNREPEAT.md) (audit sumber RunRepeat: risiko TINGGI, tanpa izin tertulis) |
| **Tujuan produk** | Membantu orang memilih sepatu lari yang tepat |

---

## 1. Rencana Pemilik

1. Scraping data langsung dari tiap pabrikan sepatu: **hanya spesifikasi teknis + foto produk**, plus **link pembelian ke toko resmi** pabrikan.
2. Data kurang lengkap dan tidak seragam dibanding RunRepeat, tetapi risiko hukum lebih kecil.
3. Tiga opsi pengelolaan data:
   - **Opsi 1:** terjemahkan angka spesifikasi menjadi penilaian sendiri (contoh: foam PEBA = plush).
   - **Opsi 2:** tampilkan spesifikasi pabrikan apa adanya; data lama yang kosong dibiarkan kosong.
   - **Opsi 3:** himpun data dari media sosial dan portal berita untuk melengkapi yang kosong.

## 2. Kesimpulan

**Arah rencana benar. Risiko turun dari TINGGI (skor 12) ke RENDAH–SEDANG (skor 4–8), tidak nol.**

| Bagian rencana | Penilaian |
|---|---|
| Spesifikasi dari pabrikan | ✅ Disarankan, dengan syarat (§4) |
| Foto dari pabrikan | ⚠️ Boleh hanya dengan izin/jalur resmi (§3) |
| Link beli ke toko resmi | ✅ Aman; wajib disclose bila afiliasi |
| Opsi 1 — terjemahan sendiri | ✅ **Terbaik** |
| Opsi 2 — tampil apa adanya | ✅ Aman, nilai produk tipis |
| Opsi 3 — sosmed & berita | ❌ **Tidak disarankan** |
| "Data lama dibiarkan kosong" | ❌ Kurang; data RunRepeat harus **dihapus** |

---

## 3. Foto

| Sumber | Status | Saran |
|---|---|---|
| RunRepeat (5.435 URL + 1.983 embedding) | ❌ tanpa izin | Hapus semua, termasuk embedding turunan |
| Foto resmi pabrikan | ⚠️ hak cipta brand | Pakai press/media kit, feed afiliasi, atau izin tertulis. **Scrape dari situs brand ≠ izin** |
| Foto sendiri / kontribusi pengguna | ✅ aman | Sertakan lisensi di Syarat Penggunaan |

Rincian:
- **Hotlink vs salinan.** Hotlink mengurangi risiko penggandaan, tetapi `next/image` di Vercel menyimpan salinan hasil optimisasi. Untuk gambar tanpa izin pertimbangkan `unoptimized`.
- **Embedding SigLIP** adalah turunan dari foto. Bangun ulang hanya dari foto yang berizin, lalu hapus `public/vision/*` lama dan history-nya.
- **Logo brand: jangan dipakai.** Nama brand/model boleh disebut secara deskriptif (nominatif). Tambah disclaimer "tidak berafiliasi dengan pabrikan" dan jangan menyiratkan endorsement.
- **Brand umumnya terbuka** pada media kit dan program afiliasi karena menguntungkan promosi. Minta izin lebih murah dan lebih aman daripada berasumsi.

## 4. Data Teknis

- **Spesifikasi (berat, drop, stack, foam)** adalah fakta; umumnya tidak berhak cipta.
- **Tetap ada risiko lain:** ToS situs brand bisa melarang scraping (jalur kontrak), dan situs brand Eropa kena **hak database** (Direktif 96/9/EC). Ambil **per produk**, bukan dump seluruh katalog.
- **Jangan salin deskripsi marketing.** Itu teks berhak cipta.
- **Label sumber:** tampilkan "menurut pabrikan". Angka brand adalah klaim, bukan hasil ukur independen (mis. berat sering untuk ukuran tertentu).
- **Jalur resmi dulu** bila ada: feed afiliasi atau API, baru scraping.
- **Aturan scraping:** cek `robots.txt` dan ToS tiap brand; simpan bukti (tanggal, tangkapan layar); User-Agent jujur (`LariYukBot/1.0 (+kontak)`); laju rendah; hindari URL berparameter dan area yang diblokir.
- **Tampilkan klaim secukupnya.** Jangan pakai istilah "lab independen" untuk data pabrikan.

### Pembersihan data RunRepeat (wajib)
Mengosongkan saja tidak cukup. Data tetap ada di:

| Lokasi | Tindakan |
|---|---|
| Turso production | Hapus/ganti baris dan `shoe_images` |
| `data/shoes.db`, `*.bak`, `data/*.sql` | Hapus/arsipkan di luar repo |
| `scripts/__fixtures__/*.html` | Hapus dari git; ganti fixture sintetis |
| `public/vision/*` | Bangun ulang dari foto berizin |
| History git (bila repo publik) | Bersihkan dengan `git filter-repo` |
| README ("lab independen RunRepeat") | Ubah klaim |

**Waktu pembersihan:** selama belum ada somasi, membersihkan itu sah. **Bila somasi/klaim sudah diterima, jangan hapus bukti** — hubungi advokat dulu.
**Email izin ke RunRepeat:** bila pivot total dan bersih, tidak perlu dikirim; email itu bisa dibaca sebagai pengakuan.

## 5. Tiga Opsi

### Opsi 1 — Terjemahan sendiri (disarankan)
- Hasil analisis dan aturan milikmu; hak cipta ada di kamu. Ini nilai tambah utama app.
- **Syarat:**
  - Label sebagai **estimasi berdasarkan spesifikasi**, bukan "hasil uji lab".
  - Aturan transparan dan konsisten, dari pengetahuan umum, bukan hasil menyalin label RunRepeat secara massal.
  - Hapus klaim "data lab independen RunRepeat" di README/UI (berpotensi klaim menyesatkan, UU Perlindungan Konsumen).
- **Risiko: rendah.**

### Opsi 2 — Tampil apa adanya
- Paling aman secara hukum.
- Kelemahan: banyak kolom kosong, perbandingan antar-sepatu kurang seragam.
- Saran: **gabungkan dengan Opsi 1** — spec asli + interpretasi sendiri berlabel. Kolom kosong tampil "belum tersedia", jangan ditebak.
- **Risiko: sangat rendah.**

### Opsi 3 — Media sosial & portal berita (tidak disarankan)
| Masalah | Penjelasan |
|---|---|
| ToS platform | Instagram, TikTok, X, YouTube melarang scraping; Meta pernah menggugat scraper |
| UU PDP 27/2022 | Postingan orang = data pribadi, meski publik; butuh dasar hukum untuk mengumpulkan dan memproses |
| Hak cipta | Artikel berita/review: fakta boleh, kalimat tidak |
| Kualitas | Opini acak, sulit diverifikasi |

**Alternatif aman:** link-out ke review; YouTube Data API resmi (sesuai ToS); ulasan dari pengguna app sendiri (UGC, dengan ToS); ringkasan buatan sendiri dengan atribusi.
**Risiko: tinggi.**

## 6. Link Beli ke Toko Resmi
- Link biasa: aman.
- Link afiliasi: **wajib disclose** ("kami bisa mendapat komisi"). Program afiliasi sering sekaligus memberi izin penggunaan foto/feed.
- Jangan tampilkan harga yang tidak diperbarui tanpa keterangan "harga dapat berubah".

## 7. Penilaian Risiko Rencana Baru

| ID | Risiko | S | L | Skor | Level |
|---|---|:-:|:-:|:-:|---|
| N1 | Foto brand dipakai tanpa izin | 3 | 3 | 9 | 🟡 SEDANG (turun ke 3 bila ada press kit/izin) |
| N2 | Scraping situs brand melanggar ToS / hak database | 2 | 3 | 6 | 🟡 SEDANG |
| N3 | Sisa data RunRepeat tertinggal di prod/backup/git | 3 | 4 | 12 | 🟠 TINGGI (turun ke 1–2 setelah pembersihan) |
| N4 | Klaim menyesatkan ("lab independen") atas data bukan lab | 2 | 3 | 6 | 🟡 SEDANG |
| N5 | Opsi 3: ToS platform + PDP | 4 | 4 | 16 | 🔴 KRITIS bila dilakukan |
| N6 | Merek dagang/logo menyiratkan afiliasi | 2 | 2 | 4 | 🟢 RENDAH |
| N7 | Afiliasi tanpa disclosure | 2 | 3 | 6 | 🟡 SEDANG |
| N8 | Privasi pengguna (form feedback, kamera) tanpa kebijakan | 3 | 3 | 9 | 🟡 SEDANG |

**Residual setelah rencana §8 dijalankan: 🟢 RENDAH.**

## 8. Urutan Kerja

| # | Aksi | Prioritas |
|---|---|---|
| 1 | Hentikan scraping RunRepeat; jangan tambah data baru dari sana | 🔴 sekarang |
| 2 | Bangun scraper brand: cek ToS + robots dulu, UA jujur, simpan bukti | 🟠 |
| 3 | Ajukan izin/press kit/afiliasi ke brand utama (Nike, adidas, ASICS, HOKA, dll) | 🟠 |
| 4 | Bangun mesin terjemahan spec (Opsi 1) berlabel "estimasi" | 🟠 |
| 5 | Ganti data/foto lama; hapus embedding lama; bersihkan prod, backup, git | 🔴 |
| 6 | Pasang dokumen legal (§9). Tunda Opsi 3 | 🟡 |
| 7 | Review per kuartal: ToS brand berubah, status izin | 🟡 |

## 9. Dokumen Legal yang Perlu Ada
1. **Kebijakan Privasi** (UU PDP 27/2022): jelaskan data form feedback (Web3Forms), fitur kamera, dan bila foto pengguna dikirim ke server atau Gemini.
2. **Syarat Penggunaan** + **disclaimer**: data "as is", tidak berafiliasi dengan brand, rekomendasi bersifat informasi umum, bukan nasihat medis.
3. **Halaman Sumber Data:** asal tiap data dan foto, tanggal pengambilan, metode estimasi.
4. **Kontak takedown** dengan proses respons cepat.
5. **Pemisahan lisensi:** MIT hanya untuk kode; data dan foto pihak ketiga tidak ikut MIT.
6. **Pengungkapan afiliasi** bila ada link komisi.

## 10. Checklist Per-Brand (isi sebelum scraping)

| Brand | robots.txt dicek | ToS dicek (larang scraping?) | Press kit/afiliasi tersedia? | Izin tertulis | Tanggal | Catatan |
|---|---|---|---|---|---|---|
| | | | | | | |

## 11. Batasan
- Analisis hukum bersifat umum (hak cipta, hak database UE, UU PDP, UU Perlindungan Konsumen), bukan opini yurisdiksi spesifik.
- ToS tiap brand belum diperiksa; hasilnya bisa mengubah penilaian N2.
- Tidak diperiksa: visibilitas repo GitHub, cache optimizer Vercel, isi `fallback-shoes.ts`, alur data kamera di produksi.
