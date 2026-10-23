# ADR-001: AI Vision Scan (identifikasi sepatu dari foto)

**Status:** Accepted
**Date:** 2026-10-23
**Deciders:** Pemilik proyek (LariYuk)

## Context
Pengguna di toko / expo ingin memotret sepatu lalu langsung melihat spesifikasi lab-nya. Pengenalan visual butuh model multimodal. Kendala proyek: target biaya operasional **$0**, deploy Vercel Hobby (body request maks ±4,5 MB, fungsi serverless pendek), katalog kecil (±60 sepatu) di SQLite/Turso, PWA yang juga dipakai offline.

## Decision
- Rute **`POST /api/detect-shoe`** meneruskan foto ke **Google Gemini 2.5 Flash** (REST, tanpa SDK) dan meminta JSON terstruktur `{brand, model, releaseYear?, colorway?, confidence}`.
- **BYOK sebagai default**: pengguna mengisi API key sendiri di *Pengaturan AI*; key disimpan di `localStorage` dan dikirim per-request lewat header `x-gemini-key`. Server tidak menyimpan key maupun foto, dan tidak mencatatnya di log.
- **Key server `GEMINI_API_KEY` hanya untuk development** (`NODE_ENV !== "production"`) untuk menguji kamera/UI/UX tanpa mengisi key. Di production tanpa BYOK → `401 KEY_REQUIRED`.
- Hasil model dicocokkan ke katalog dengan **fuzzy match** di memori (`src/lib/vision/match-shoe.ts`): kemiripan token + bigram karakter, ambang auto-match 0,8 dengan margin 0,05 terhadap peringkat 2; skor 0,5–0,8 hanya jadi kandidat.
- Foto diperkecil di klien (sisi terpanjang 1024 px, JPEG 0,8) sebelum dikirim.

## Options Considered
### A. BYOK saja + key server dev-only (dipilih)
| Dimensi | Penilaian |
|---|---|
| Biaya developer | Nol |
| Privasi | Foto hanya lewat server proxy → Gemini; tidak disimpan |
| Kompleksitas | Rendah–menengah |
| Hambatan pengguna | Perlu membuat key (gratis di AI Studio) |

### B. Key server untuk semua pengguna
Mudah bagi pengguna, tapi kuota/biaya ditanggung developer, perlu rate-limit & anti-abuse. Bertentangan dengan target $0. Ditolak.

### C. Model on-device (mis. embedding/klasifikasi lokal)
Offline & privat, tetapi butuh dataset gambar berlabel dan ukuran model besar untuk PWA. Tidak realistis untuk katalog kecil. Ditolak.

### D. Panggil Gemini langsung dari browser (tanpa rute server)
Menghindari proxy, tetapi key terlihat di request klien tanpa kontrol, tidak bisa melakukan pencocokan ke DB di sisi server, dan CORS/kebijakan key sulit dikendalikan. Ditolak; rute server tetap dipakai walau key berasal dari pengguna.

## Trade-off
- BYOK memindahkan biaya & friksi ke pengguna, sebagai gantinya proyek tetap gratis dan tanpa kewajiban menjaga kuota bersama.
- Fuzzy match konservatif lebih memilih "kandidat" daripada salah menebak (mis. *Superblast 3* vs *Superblast 2*).

## Consequences
- Scan **tidak jalan offline** (UI menampilkan pesan jelas). POST tidak di-cache Service Worker (Workbox hanya meng-cache GET).
- Foto dan key melewati server LariYuk; dokumentasikan di modal Pengaturan AI. Jangan pernah log header/body.
- Sepatu yang belum ada di katalog tidak bisa dikenali → hanya menampilkan hasil deteksi + pesan "belum ada di katalog".
- Perlu ditinjau ulang: ambang match setelah uji dengan foto nyata, pembatasan laju bila nanti ada key server bersama.

## Action Items
1. [x] Rute `POST /api/detect-shoe`, klien Gemini, resolver key, fuzzy matcher + test (mock `fetch`).
2. [x] UI: lembar Scan (kamera/galeri) & modal Pengaturan AI.
3. [ ] Uji live dengan key Gemini asli dan foto nyata (dilakukan pemilik proyek); sesuaikan ambang `MATCH_THRESHOLD` bila perlu.
