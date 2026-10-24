# Fase 5 — Verifikasi Foto Press Kit & Vision

**Tujuan:** memastikan **setiap** foto yang dipakai app (tampilan dan embedding AI) berstatus berizin, dengan bukti yang bisa ditunjukkan.
**Status:** 🟢 prosedur siap; eksekusi menunggu respons brand (Fase 2).

> **Prinsip:** foto "terlihat di internet" atau di halaman produk **bukan** press kit. Tidak yakin = anggap **tidak boleh**. Scrape foto dari situs brand ≠ izin.

## 1. Alur Keputusan per Foto

```
Foto ditemukan
 ├─ Asal: portal media / email PR / feed afiliasi / foto sendiri / kontribusi pengguna?
 │    ├─ Bukan → JANGAN pakai (minta izin atau cari ganti)
 │    └─ Ya → ada syarat tertulis yang bisa disimpan?
 │          ├─ Tidak → minta konfirmasi tertulis, tunggu
 │          └─ Ya → syarat mencakup (a) tampil di aplikasi web, (b) hosting, (c) pengolahan/embedding AI, (d) penggunaan non-komersial/donasi?
 │                ├─ Ada yang tak jelas → minta konfirmasi tertulis per butir
 │                └─ Semua jelas → daftarkan di register lisensi → boleh pakai sebatas scope
 └─ Tidak yakin → TIDAK boleh
```

## 2. Prosedur Verifikasi Langkah demi Langkah

### Langkah 1 — Tentukan asal foto
Catat URL halaman tempat foto ditemukan. Jenis yang sah:
| Jenis | Sah? |
|---|---|
| Halaman press/newsroom/media center resmi brand | ✅ kandidat |
| Portal aset (Bynder, Brandfolder, Pressloft, Frontify) milik brand | ✅ kandidat |
| Dikirim langsung oleh PR/brand via email | ✅ kandidat |
| Creative asset di jaringan afiliasi (Involve Asia, Impact, Awin) | ✅ kandidat |
| Foto sendiri / kontribusi pengguna dengan persetujuan | ✅ |
| Halaman produk toko, marketplace, Google Images, Pinterest, Wikipedia, situs review, sosmed brand/influencer | ❌ |
| Foto ber-watermark/credit fotografer atau agensi | ❌ kecuali izin dari pemegang hak itu |
| Foto RunRepeat | ❌ |

### Langkah 2 — Pastikan domain asli brand
- Domain press harus subdomain/domain resmi (pola umum `news.`, `press.`, `media.`, `/newsroom`, `/press`, `/media-center`). Alamat pasti verifikasi per brand dari footer situs utama.
- Hindari situs tiruan/agregator "press kit".

### Langkah 3 — Cari dan simpan syarat penggunaan
- Baca halaman syarat/unduhan: kata kunci *editorial use, media use, press use, commercial, apps, digital, third party, AI, machine learning, derivative, modify, crop*.
- **Tangkapan layar penuh + PDF halaman + tanggal** → `legal-evidence/<brand>/press-kit/<tanggal>/`.
- Unduh lewat portal: simpan juga bukti persetujuan syarat saat klik "download" (screenshot).

### Langkah 4 — Periksa metadata file
```bash
exiftool foto.jpg | grep -Ei "copyright|credit|rights|usage|creator|by-line|source|license"
```
Catat `Copyright`, `Credit`, `Rights`, `UsageTerms`. Jika tertulis pembatasan (mis. "editorial use only") → ikuti, jangan tafsir longgar. Jangan hapus metadata kredit.

### Langkah 5 — Cocokkan lingkup izin dengan penggunaan app
Isi tabel; kolom kosong/`?` = **belum boleh**:

| Pertanyaan | Jawaban dari dokumen izin | Bukti |
|---|---|---|
| Boleh tampil di aplikasi web/PWA (digital)? | | |
| Boleh disimpan/di-host sendiri, atau hanya hotlink? | | |
| Boleh diolah (crop, resize, kompres)? | | |
| Boleh dipakai untuk **embedding / AI pengenalan visual**? | | |
| Komersial atau non-komersial? (app punya donasi/Saweria) | | |
| Durasi & wilayah? | | |
| Perlu atribusi/credit tertentu? | | |
| Dapat dicabut? Batas waktu hapus? | | |

Jika syarat tidak menyebut "aplikasi" atau "AI/embedding" → kirim permintaan konfirmasi (template §3).

### Langkah 6 — Daftarkan di register lisensi
Satu baris per foto/batch di `image_licenses` (atau CSV sementara `image-license-register.csv`, privat):

`shoe_id · file/url · source_page · owner · license_type (press_kit|affiliate_creative|written_permission|own) · proof_ref · scope (app / ai_embedding / commercial) · valid_until · obtained_at · credit_text`

**Aturan sistem:** foto tanpa baris lisensi valid → tidak ditampilkan dan tidak masuk embedding.

### Langkah 7 — Tinjau berkala
Kadaluarsa `valid_until`, perubahan syarat portal, permintaan takedown → nonaktifkan foto (24–72 jam), balas tertulis.

## 3. Template Permintaan Konfirmasi (English)

> Subject: Image usage confirmation — LariYuk running-shoe reference app
>
> Hello <Brand> press/partnerships team,
>
> We're building LariYuk, a free, non-commercial Indonesian web app (PWA) that helps runners compare running shoes. We'd like to use official <Brand> product images from your press kit / media center.
>
> Could you confirm in writing that we may:
> 1. display these images in our web app, with credit "© <Brand>" and a link to your official store;
> 2. host/cache copies on our servers (or tell us if hotlinking only);
> 3. resize/crop them for display; and
> 4. process them to compute image-recognition embeddings used solely to identify a shoe from a user's own photo (embeddings are not published or redistributed)?
>
> The app has a voluntary donation button but no ads or paid features. We'll remove any image promptly on request. Please let us know the terms, duration, and any credit text you prefer.
>
> Thank you — <Nama>, <email>, <URL>

Simpan balasan (headers lengkap) sebagai `proof_ref`. Balasan "silakan pakai" tanpa menyebut butir 4 → anggap **embedding belum diizinkan**.

## 4. Konsekuensi Teknis di Repo (dikerjakan saat eksekusi; dicatat di sini)

| Item | Aturan |
|---|---|
| `next.config.mjs` `remotePatterns` | Hapus `cdn.runrepeat.com`, `runrepeat.com`; tambah host hanya untuk foto berizin hotlink. Salinan yang di-host sendiri → ikuti syarat izin. Untuk foto tanpa izin hosting penuh pertimbangkan `unoptimized` (hindari cache optimizer Vercel) |
| Service | `getAllShoes` hanya menyertakan gambar yang punya lisensi valid |
| UI | Tampilkan `credit_text` di detail; placeholder `ShoeImage` bila tak ada foto |
| Atribusi | Jangan hapus watermark/metadata kredit; tanpa logo brand |
| Cache | Service worker jangan men-cache gambar tanpa izin hosting |

## 5. Vision / Embedding

Embedding (SigLIP, `public/vision/*`) adalah turunan foto → status lisensinya = lisensi foto sumber.

| Skenario | Tindakan |
|---|---|
| Foto brand dengan izin **termasuk AI/embedding** | Bangun ulang index `siglip-v2` hanya dari foto itu (`embed-catalog.ts` memfilter `scope_ai_embedding=1`) |
| Izin tampil saja, **tanpa** AI | Foto boleh tampil; **jangan** di-embed |
| Foto sendiri / kontribusi pengguna | Boleh di-embed; catat persetujuan di Syarat Penggunaan |
| Belum ada izin sama sekali | Hapus `public/vision/index-siglip-v1.bin` + `manifest-siglip-v1.json` (history lewat Fase 7); fitur scan disembunyikan atau fallback ke Gemini dengan kunci pengguna; tampilkan "segera hadir" |

Aksi:
1. Nonaktifkan pemuatan index lama (versi key index-store dinaikkan agar IndexedDB klien lama dibuang).
2. Bangun index baru dari katalog berizin; ukur dengan `npm run vision:eval` (set foto sendiri, bukan foto RunRepeat).
3. Perbarui [`../adr/ADR-002-on-device-shoe-predictor.md`](../adr/ADR-002-on-device-shoe-predictor.md) (TODO "periksa ToS" jadi selesai + sumber baru).
4. Dataset uji: foto yang diambil sendiri (jangan `NB-SCRebel-testImage.jpg` / `Superblast-testImage.jpg` bila bersumber pihak ketiga — verifikasi dulu di Fase 0).
5. Kebijakan Privasi: foto kamera diproses on-device; jelaskan bila ada fallback server/Gemini.

## 6. Pengecualian & Jalur Alternatif Jika Press Kit Tidak Tersedia
1. Foto sendiri: foto sepatu milik sendiri/teman, latar bersih, banyak sudut (kerja manual, tapi 100% aman).
2. Kontribusi pengguna dengan lisensi di Syarat Penggunaan + persetujuan eksplisit.
3. Foto dari program afiliasi (sering sekaligus memberi izin creative).
4. Tanpa foto: ikon/ilustrasi generik buatan sendiri.
5. **Bukan jalur:** mengambil dari situs toko, marketplace, Google Images, sosmed, atau agregator.

## 7. Checklist Ringkas per Brand
- [ ] Press kit/portal ditemukan, domain resmi diverifikasi
- [ ] Syarat disimpan (screenshot+PDF+tanggal)
- [ ] Metadata EXIF/IPTC dicek
- [ ] Butir izin: app / hosting / olah / **AI embedding** / komersial / durasi / credit
- [ ] Konfirmasi tertulis bila ada butir tak jelas
- [ ] Register lisensi terisi
- [ ] `remotePatterns` & cache sesuai
- [ ] Embedding hanya dari foto ber-scope AI

## 8. Definition of Done
- Tiap foto tampil punya lisensi valid + bukti; tiap vektor embedding punya foto sumber ber-scope AI.
- Tidak ada host runrepeat di `next.config.mjs`, Network tab bersih dari `runrepeat.com`.
- Index vision lama dihapus dan klien lama membuang cache-nya.
