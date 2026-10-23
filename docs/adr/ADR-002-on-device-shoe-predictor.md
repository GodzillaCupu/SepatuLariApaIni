# ADR-002: Prediktor sepatu on-device (hybrid) + multi-foto per sepatu

**Status:** Proposed
**Date:** 2026-10-23
**Deciders:** Pemilik proyek (LariYuk)
**Relasi:** Melengkapi ADR-001 (opsi C "model on-device" yang dulu ditolak dibuka kembali; BYOK Gemini turun jadi jalur opsional).

## Context
ADR-001 membuat Scan bergantung pada Gemini lewat API key pengguna (BYOK): ada friksi, foto keluar dari perangkat, dan tidak jalan offline. Pemilik proyek ingin pengenalan sendiri tanpa AI pihak ketiga, dengan hasil berupa **prediksi 3–5 kemungkinan** (bukan satu jawaban pasti), serta **banyak foto per sepatu** yang dikumpulkan saat scraping.

Temuan dari halaman RunRepeat (fixture `scripts/__fixtures__`): galeri per sepatu 30–50 gambar (`cdn.runrepeat.com/storage/gallery/product_content/<id>/<slug>-<deskriptor>-<imageId>-<ukuran>.jpg`) + foto studio `product_primary`. Sebagian besar adalah foto on-foot sepatu asli (cocok untuk pengenalan), tetapi banyak juga frame video/gambar uji lab. Nama file hanya petunjuk awal (mis. `outsole` = frame video gerinda, `stack` = foto lari) sehingga penyaringan akhir harus berbasis embedding.

## Decision
1. **Default = prediktor on-device**: foto → embedding (model vision open-source di browser, transformers.js/ONNX Runtime Web) → cosine similarity ke indeks embedding katalog → top-5 sepatu. UI menyebut "perkiraan"; skor mentah tidak ditampilkan.
2. **Opsional = BYOK Gemini** ("Scan lebih akurat"), kode ADR-001 dipertahankan.
3. **Multi-foto**: tabel baru `shoe_images` (`shoe_id`, `url`, `kind` product|detail|lab, `label`, `usable`, `source`; unik per shoe+url). Scraper menyimpan semua foto galeri (`scripts/lib/gallery-images.ts`). `shoes.image_url` tetap untuk thumbnail.
4. **Embedding dihitung saat build** (`scripts/embed-catalog.ts`, tahap berikut) → `public/vision/index-v<N>.bin` + manifest. Skor sepatu = max/top-2-mean similarity atas semua foto `usable`; foto outlier terhadap centroid sepatu dibuang otomatis.
5. **Hanya URL dan vektor yang disimpan**; gambar mentah tidak masuk repo maupun klien.
6. **Pilihan model ditentukan oleh evaluasi** (CLIP ViT-B/32 q8 vs DINOv2-small vs SigLIP-base) pada set uji: top-1/3/5, ukuran unduhan, latensi di HP menengah. Gerbang lanjut: top-5 ≥ ~80% pada set uji.
7. **Video tidak dipakai di v1**; bila nanti dipakai, ekstrak 1–3 frame saat build dan perlakukan sebagai foto biasa.

## Options Considered
| Opsi | Biaya | Privasi | Akurasi | Kompleksitas |
|---|---|---|---|---|
| A. Gemini BYOK saja (ADR-001) | $0 dev, friksi user | Foto ke pihak ketiga | Tinggi | Rendah |
| **B. Hybrid on-device + BYOK opsional** | $0 | Default privat, offline | Sedang (top-5), tinggi via BYOK | Menengah |
| C. On-device saja | $0 | Terbaik | Sedang | Menengah; tanpa jalan keluar bila akurasi kurang |
| D. Fine-tune classifier sendiri | Tinggi | Baik | Berpotensi tinggi | Tinggi; butuh dataset berlabel |

## Trade-off
- On-device menukar akurasi puncak dengan privasi, offline, dan $0. Embedding generik lemah membedakan versi mirip (Superblast 2 vs 3) → itulah alasan top-5 dan jalur Gemini opsional.
- Banyak foto per sepatu menambah ketahanan sudut/warna, tetapi foto produk ≠ foto toko (domain gap) dan menambah risiko kontaminasi → filter `kind/usable` + outlier + (opsional) foto referensi sendiri.
- Model ±25–90 MB diunduh sekali dan di-cache Service Worker.

## Consequences
- Lebih mudah: scan offline, tanpa API key, foto tak keluar HP.
- Lebih sulit: build pipeline embedding, pemeliharaan indeks tiap katalog berubah (versi indeks), pengujian di iOS Safari (memori).
- Ditinjau ulang: pemakaian foto RunRepeat (ToS/hak cipta) — hanya URL + vektor yang disimpan; periksa ToS sebelum backfill massal atau menambah sumber lain.

## Action Items
1. [x] Skema `shoe_images` (`src/db/schema.ts`) + parser galeri + penyimpanan di scraper + tes.
2. [x] Tabel `shoe_images` + backfill `npm run scrape:images` pada DB **lokal** (117 sepatu, 5.389 foto). Turso: belum — ikuti `docs/DB-SYNC-TURSO.md`.
3. [x] `scripts/audit-images.ts` (+ `--sheet`).
4. [~] `scripts/embed-catalog.ts` + `scripts/eval-vision.ts` ditulis; hasil evaluasi di `docs/vision-eval.md` menentukan model. Foto referensi sendiri **ON HOLD** (lihat CHANGELOG).
5. [x] Klien `src/lib/vision/ondevice/` + UI hybrid (`ScanShoeSheet.tsx`) — teruji di dev server. [ ] cache SW/produksi + uji perangkat (iOS Safari).
6. [ ] Update `docs/ARCHITECTURE.md`, tandai ADR-001 "Partially superseded" setelah tahap 5 selesai.
