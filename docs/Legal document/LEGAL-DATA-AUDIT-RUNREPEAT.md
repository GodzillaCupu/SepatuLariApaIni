# Audit Legalitas Data — Sumber RunRepeat

> **Bukan nasihat hukum.** Dokumen ini penilaian awal berbasis kode repo dan halaman publik RunRepeat. Wajib ditinjau konsultan hukum sebelum dipakai untuk keputusan komersial.

| | |
|---|---|
| **Tanggal** | 2026-10-23 |
| **Objek** | LariYuk / SepatuLariApaIni (PWA, Next.js + Turso) |
| **Sumber diperiksa** | data.runrepeat.com, /media-enquiries, /partnerships, /legal-disclaimer, /privacy-policy, /sitemap, /footwear-testing-services, /robots.txt |
| **Metode** | Baca isi halaman via fetch (diringkas model), audit kode & DB lokal |
| **Kerangka** | Severity × Likelihood (skala 1–5), skor 16–25 = KRITIS, 10–15 = TINGGI, 5–9 = SEDANG, 1–4 = RENDAH |

---

## 1. Ringkasan Eksekutif

**Kesimpulan: data RunRepeat di app ini TIDAK punya dasar izin yang jelas. Risiko keseluruhan: TINGGI (ORANGE, skor 12–16).** Belum ada izin tertulis; RunRepeat justru menjual data yang sama sebagai produk berlisensi.

Temuan kunci:

1. **RunRepeat menjual data ini.** `data.runrepeat.com` = "Shoe Intelligence API", lisensi mulai **€1.000/tahun**. Proyek individu, hobi, dan integrasi app kecil disebut **"outside our current scope"**. Artinya app ini persis segmen yang tidak mereka layani lewat lisensi.
2. **Tidak ada Terms of Service** di sitemap. Legal disclaimer & privacy policy **diam** soal scraping, text/data mining, atribusi, dan pemakaian gambar. Diam ≠ izin. Hak cipta default berlaku (© RunRepeat.com).
3. **Hukum yang berlaku: Denmark** (disclaimer). Denmark = UE → berlaku hak cipta + **hak sui generis atas database** (Direktif 96/9/EC). Pengujian lab RunRepeat (investasi substansial) adalah kandidat kuat perlindungan database.
4. **Teks review disalin verbatim** (`verdict_summary`, 118 baris, rata-rata ±151 karakter; contoh: "We tested the Nike Vomero Plus and found it truly lives up to its name…") plus pros/cons. Ini bagian paling rawan (hak cipta tulisan).
5. **5.435 URL foto** dari `cdn.runrepeat.com` disimpan, di-hotlink lewat `next/image`, dan **1.983 vektor embedding** diturunkan darinya (`public/vision/*`, ter-commit di git). Foto = karya berhak cipta. ADR-002 sudah mencatat "periksa ToS" sebagai TODO, belum dikerjakan.
6. **Hal yang meringankan:** `robots.txt` tidak melarang halaman review sepatu (hanya `/search*`, `/redirect/*`, dan URL berparameter filter); ada tautan atribusi ke RunRepeat; scraper memakai jeda 3 detik & konkurensi 2.

---

## 2. Temuan per Sumber

| Sumber | Isi relevan | Dampak ke app |
|---|---|---|
| **data.runrepeat.com** | API komersial `/api/v1`, bulk export, mulai €1.000/thn. Lisensi terbuka (CC dll) **tidak disebut**. Syarat atribusi **tidak disebut**. Hobi/app kecil di luar cakupan. | Ada jalur resmi berbayar; jalur gratis tidak ada. Pakai data tanpa lisensi = bersaing dengan produk mereka. |
| **/legal-disclaimer** | "Copyright © RunRepeat.com". Hukum Denmark. Data "as is", tanpa jaminan akurat. Tidak ada klausul reuse/scraping/gambar. Menyebut "Data licensing" sebagai menu Partnerships. | Hak cipta berlaku. Akurasi data tidak dijamin → app harus beri disclaimer sendiri. |
| **/privacy-policy** | Pengendali: RunRepeat, Frederiksberg, Denmark. Tidak ada aturan akses otomatis/reuse. Tanpa tanggal revisi. | Tidak ada izin/larangan eksplisit. Tidak relevan untuk data pengguna app (app tidak mengirim data user ke RunRepeat). |
| **/media-enquiries** | Tidak ada aturan reuse data/gambar/atribusi. Kontak: Jens Jakob Andersen (CEO), jens@runrepeat.com. | Kontak resmi untuk minta izin. |
| **/partnerships** | Afiliasi toko (butuh feed harga harian) + tautan Data licensing. Tanpa tarif/ketentuan. | App bukan retailer; jalur afiliasi tidak cocok. |
| **/sitemap** | **Tidak ada** Terms of Service/Use, API publik, atau kebijakan crawler. | Celah: tidak ada ToS eksplisit yang dilanggar, tapi juga tidak ada izin. |
| **/footwear-testing-services** | Mengklaim database lab terbesar (>1.000 sepatu), metode proprietary + standar ASTM/SATRA yang dimodifikasi, langganan dengan unduhan CSV/XLSX/JSON/SQL. | Memperkuat klaim investasi substansial → dasar hak database. Data lab = aset komersial inti mereka. *(±32 rb karakter akhir halaman tidak terbaca.)* |
| **/robots.txt** | `User-agent: *` saja. Disallow: `/search*`, `/redirect/*`, ratusan query-param filter. Tanpa crawl-delay. Review page tidak diblokir. | Crawling halaman review tidak melanggar robots. Hindari URL berparameter & `/search`. |

---

## 3. Inventaris Data yang Dipakai App

| Aset | Lokasi | Sumber | Jenis | Perlindungan hukum (kemungkinan) |
|---|---|---|---|---|
| Spesifikasi lab: berat, drop, stack heel/forefoot, foam, plate | tabel `shoes` (118 sepatu, 14 brand) | RunRepeat | Fakta terukur | Fakta sendiri umumnya bebas hak cipta; **kompilasi/seleksi sistematis** bisa dilindungi hak database (UE). Pengambilan sebagian kecil rendah risiko; ekstraksi sistematis = risiko sedang. |
| `verdict_summary` | `shoes` | RunRepeat (verbatim) | Teks tulisan | **Hak cipta — risiko tertinggi.** |
| `pros` / `cons` | `shoes` (JSON) | RunRepeat | Frasa pendek | Hak cipta lemah per frasa, tapi bagian dari salinan ulasan. |
| Klasifikasi (kategori, pace, fit, breathability) | `shoes` | Turunan sendiri (`classify-*.ts`) | Karya turunan | Hasil olahan sendiri; risiko rendah *jika* tidak menyalin teks sumber. |
| `image_url` + `shoe_images` | DB | `cdn.runrepeat.com` (5.435 URL) | Foto | **Hak cipta.** Hotlink; `next/image` Vercel mengoptimasi & men-cache salinan. |
| Embedding SigLIP | `public/vision/*` (git-tracked) | Turunan foto | Vektor | Karya turunan dari foto + aktivitas text/data mining. |
| Fixture HTML | `scripts/__fixtures__/*.html` (git-tracked) | Halaman RunRepeat utuh | Salinan halaman | **Redistribusi halaman berhak cipta di repo.** |
| Tautan atribusi | `ShoeDetailModal.tsx` | — | — | Baik, tapi atribusi ≠ izin. |

Konteks distribusi: PWA publik di Vercel, repo GitHub (`GodzillaCupu/SepatuLariApaIni`) berlabel **MIT**, ada donasi QRIS/Saweria. Status visibilitas repo belum diverifikasi.

---

## 4. Penilaian Risiko (Severity × Likelihood)

Konteks severity: proyek portofolio non-/mikro-komersial, eksposur finansial terbatas, tetapi ada risiko takedown & reputasi.

| ID | Risiko | Kategori | S | L | Skor | Level |
|---|---|---|:-:|:-:|:-:|---|
| R1 | Salinan verbatim teks review (`verdict_summary`, pros/cons) melanggar hak cipta | IP | 3 | 4 | **12** | 🟠 TINGGI |
| R2 | Foto RunRepeat (5.435 URL, hotlink + cache optimizer + embedding) tanpa lisensi | IP | 3 | 4 | **12** | 🟠 TINGGI |
| R3 | Ekstraksi sistematis spesifikasi lab = pelanggaran hak database (UE/DK) | IP | 3 | 3 | **9** | 🟡 SEDANG (batas atas) |
| R4 | Scraping tanpa izin / mem-bypass produk berbayar (data.runrepeat.com) → klaim kompetisi tidak sehat / perjanjian | Kontrak/IP | 3 | 3 | **9** | 🟡 SEDANG |
| R5 | `User-Agent` scraper menyamar sebagai browser (Mozilla/5.0…) → memperburuk itikad & bisa dibaca sebagai penghindaran deteksi | Regulasi/IP | 2 | 4 | **8** | 🟡 SEDANG |
| R6 | Fixture HTML RunRepeat ter-commit di repo; label MIT menimbulkan kesan seluruh isi repo bebas dipakai ulang | IP | 3 | 3 | **9** | 🟡 SEDANG |
| R7 | Monetisasi (donasi) memperkuat argumen penggunaan komersial | IP | 2 | 3 | **6** | 🟡 SEDANG |
| R8 | Akurasi data "as is" — user mengandalkan spesifikasi/rekomendasi tanpa disclaimer di app | Perlindungan konsumen | 2 | 2 | **4** | 🟢 RENDAH |
| R9 | Pelanggaran robots.txt | Teknis | 2 | 1 | **2** | 🟢 RENDAH *(saat ini patuh)* |
| R10 | Privasi pengguna (privacy policy RunRepeat tidak terkait data user app) | Privasi | 1 | 1 | **1** | 🟢 RENDAH |

**Risiko gabungan: TINGGI (ORANGE).** Likelihood klaim aktual dari RunRepeat sendiri tergolong rendah-sedang untuk app kecil (belum ada preseden terhadap proyek hobi yang diketahui), tetapi dasar pembelaan lemah bila diklaim. Tidak ada skor KRITIS.

**Faktor memberatkan:** teks verbatim; foto massal; produk berlisensi yang sama sudah dijual; UA menyamar; repo publik; ada donasi.
**Faktor meringankan:** atribusi + tautan balik (mengarahkan trafik ke RunRepeat); jeda 3 detik; robots patuh; klasifikasi/skor turunan sendiri; hanya URL foto (bukan file) di DB; skala kecil, non-komersial utama; fakta teknis sepatu pada dasarnya fakta.

**Catatan hukum Indonesia (pemilik app):** UU Hak Cipta 28/2014 melindungi tulisan & foto; UU ITE soal akses ilegal berlaku bila ada hambatan teknis/izin — di sini tidak ada paywall yang ditembus (halaman publik). Eksposur utama tetap perdata/takedown, lintas yurisdiksi (Denmark/UE).

---

## 5. Cek Vendor / Perjanjian (vendor-check)

| Field | Hasil |
|---|---|
| Vendor | RunRepeat (RunRepeat.com), Frederiksberg, Denmark; kontak Jens Jakob Andersen (CEO) |
| Hubungan | Sumber data pihak ketiga, **tanpa kontrak** |
| Sumber dicek | Repo lokal + halaman publik. **CLM/CRM/email/dokumen/chat: tidak terhubung** (tidak dicari) |
| Perjanjian ditemukan | **Tidak ada.** NDA ✗ · Lisensi data ✗ · DPA ✗ (tidak perlu, tak ada data pribadi) · Izin tertulis ✗ |
| Opsi tersedia | Lisensi data resmi (mulai €1.000/thn, untuk tim/produk komersial); permintaan izin khusus via jens@runrepeat.com |

**Gap:** tidak ada izin tertulis → harus diperoleh, atau data diganti sumber berlisensi terbuka / data sendiri.

---

## 6. Opsi Mitigasi

| # | Opsi | Efektivitas | Biaya/Usaha | Rekomendasi |
|---|---|---|---|---|
| A | **Minta izin tertulis** ke RunRepeat (lihat §8 draft) | Tinggi | Rendah | ✅ Ya — lakukan dulu |
| B | **Hapus `verdict_summary` & pros/cons verbatim**; ganti ringkasan tulisan sendiri/turunan atau hanya tautan | Tinggi | Sedang | ✅ Ya, segera |
| C | **Berhenti memakai foto RunRepeat**; ganti foto berizin (Unsplash/brand press kit/foto sendiri), hapus embedding turunan RunRepeat dari repo | Tinggi | Tinggi | ✅ Ya bila izin (A) ditolak |
| D | Batasi data ke fakta spesifikasi + atribusi + tautan; tidak mengekstrak seluruh katalog | Sedang | Rendah | ✅ Ya |
| E | Ubah `User-Agent` scraper menjadi identitas jujur (`LariYukBot/1.0 (+kontak)`), hormati robots, rate-limit | Sedang | Rendah | ✅ Ya |
| F | Hapus fixture HTML dari git (dan dari history jika repo publik); ganti fixture sintetis | Sedang | Rendah | ✅ Ya |
| G | Lisensi data resmi €1.000/thn | Tinggi | Tinggi (biaya) | ⚠️ Hanya jika app dikomersialkan |
| H | Tambah halaman Sumber Data & Disclaimer di app + perjelas bahwa konten pihak ketiga bukan MIT | Sedang | Rendah | ✅ Ya |
| I | Tambah takedown contact + proses cepat | Sedang | Rendah | ✅ Ya |

## 7. Rekomendasi & Rencana Aksi

| Prioritas | Aksi | Pemilik | Target |
|---|---|---|---|
| 🔴 1 | Kirim permintaan izin ke RunRepeat (draft di §8). Tahan scraping massal baru sampai ada jawaban | Pemilik app | Minggu ini |
| 🔴 2 | Ganti `verdict_summary`/pros/cons verbatim dengan teks sendiri (atau kosongkan + tautan) | Dev | ≤ 2 minggu |
| 🟠 3 | Audit foto: keputusan pakai/ganti; jangan tambah foto baru dari RunRepeat | Dev | ≤ 2 minggu |
| 🟠 4 | Keluarkan `scripts/__fixtures__/*.html` dari repo; periksa visibilitas repo | Dev | ≤ 2 minggu |
| 🟠 5 | UA jujur + patuhi robots + batasi laju di `scrape-runrepeat.ts` / `scrape-bulk.ts` | Dev | ≤ 1 minggu |
| 🟡 6 | Halaman "Sumber Data & Disclaimer" di app; teks "data pihak ketiga, tidak dijamin akurat"; pisahkan lisensi MIT (kode) dari konten pihak ketiga | Dev | ≤ 1 bulan |
| 🟡 7 | Bila monetisasi diperbesar: konsultasi hukum + pertimbangkan lisensi data | Pemilik | Saat rencana komersial |
| 🟡 8 | Jadwalkan review ulang halaman legal RunRepeat (ToS bisa muncul/berubah; privacy policy tanpa tanggal) | Pemilik | Per kuartal |

**Eskalasi ke penasihat hukum/outside counsel** disarankan jika: menerima surat somasi/takedown, app dikomersialkan (iklan/berbayar), atau RunRepeat menolak izin tetapi data tetap dipakai. Tidak ada kewajiban eskalasi wajib saat ini.

**Residual risk setelah aksi 1–5:** 🟡 SEDANG → 🟢 RENDAH bila izin tertulis diperoleh.

---

## 8. Draf Respons: Permintaan Izin (legal-response)

> **DRAFT — UNTUK DITINJAU PEMILIK/KONSULTAN SEBELUM DIKIRIM.** Belum dikirim.
>
> *Escalation check:* tidak ada pemicu eskalasi (tidak ada litigasi, regulator, atau sengketa). Tetapi surat ini mengakui penggunaan sebelumnya — pertimbangkan tinjauan hukum karena dapat dibaca sebagai pengakuan.

**Kepada:** Jens Jakob Andersen, CEO — jens@runrepeat.com
**Subjek:** Permission request — non-commercial running-shoe reference app (LariYuk)

Dear Mr. Andersen,

I am the independent developer of LariYuk, a free, non-commercial Indonesian-language PWA that helps recreational runners compare running shoes. The app displays basic specifications (weight, drop, stack height) with a clear attribution and link back to the corresponding RunRepeat review page.

I would like to ask whether you permit me to (1) display these basic lab specifications with attribution and a link to the original review, and (2) [display/not display] RunRepeat product images. If images or review text are not permitted, I will remove them and use my own descriptions and licensed photos.

I understand that your data licensing is aimed at commercial products and that hobby projects are outside its scope, so I am asking for a written exception, or guidance on what use you consider acceptable. I will comply with any removal request promptly.

Kind regards,
[Nama] — [email] — [URL app]

**Follow-up:** catat tanggal kirim · jika tidak ada balasan 14 hari, ulang sekali · simpan balasan sebagai bukti izin · sebelum jawaban, jangan scrape massal tambahan.

---

## 9. Batasan Audit

- Isi halaman diambil lewat fetch yang diringkas model; belum dibaca langsung secara manual. Verifikasi kutipan penting di situs.
- ±32.000 karakter terakhir `/footwear-testing-services` tidak terbaca (bisa memuat klausul IP).
- Tidak diperiksa: header HTTP/meta `tdm-reservation`, `ai.txt`, isi `fallback-shoes.ts`, apakah `sw.js` men-cache gambar, visibilitas repo GitHub, cache image optimizer Vercel.
- Tidak tersedia: CLM, CRM, email, dokumen, chat (vendor-check terbatas pada sumber publik + repo).
- Analisis hukum (hak database UE, hak cipta Denmark/Indonesia) bersifat umum, bukan opini yurisdiksi spesifik. Cek dengan penasihat hukum.
- Di luar lingkup: kunci Web3Forms di `src/constants/site.ts` (publik by design) dan kunci Gemini dev.
