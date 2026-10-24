# Fase 0 — Freeze & Gerbang

**Tujuan:** hentikan pertambahan data RunRepeat, amankan cadangan, tutup celah scraper tidak sengaja. Tanpa perubahan data produksi.
**Durasi:** ≤ 1 hari. **Status:** 🟢 siap.

## 1. Gerbang Keputusan

| # | Pertanyaan | Jawaban | Konsekuensi |
|---|---|---|---|
| G1 | Ada somasi/klaim dari RunRepeat? | **Belum** (antisipasi) | Pembersihan sah. Jika jawaban berubah → STOP, jangan hapus apa pun, hubungi advokat |
| G2 | Repo GitHub publik? | **Ya** | History memuat fixture, embedding, `.bak`; perlu `git filter-repo` + force-push (Fase 7). Fork/clone pihak lain tak bisa dikendalikan → makin cepat makin baik |
| G3 | Ada kontak/korespondensi dengan RunRepeat? | Belum (draft email tidak dikirim) | Sesuai advisory §4: pivot bersih, jangan kirim email yang terbaca sebagai pengakuan |

Bila G1 berubah di tengah jalan, semua langkah Fase 0 yang menghapus/mengubah berhenti.

## 2. Checklist Langkah

### 2.1 Snapshot privat (sebelum menyentuh apa pun)
- [ ] Buat folder **di luar repo, di luar cloud sinkron publik** (disk terenkripsi), mis. `~/Private/lariyuk-snapshot-2026-10-24/`.
- [ ] Salin: `data/shoes.db`, `data/shoes.db.bak`, `data/shoes.db.pre-fit.bak`, `data/shoes.db.pre-images.bak`, `data/*.sql`, `public/vision/*`.
- [ ] Ekspor dump Turso production (lihat [`../DB-SYNC-TURSO.md`](../DB-SYNC-TURSO.md)) ke folder yang sama.
- [ ] Hitung checksum (`shasum -a 256`) dan catat di `SNAPSHOT-LOG.txt`.
- [ ] Jadwalkan penghapusan snapshot: **≤ 30 hari** (tulis tanggal di log). Jangan di-commit.

### 2.2 Blokir scraper RunRepeat
Perubahan kecil, mudah dibatalkan, tidak menyentuh data:
- [ ] `package.json`: ganti perintah `scrape`, `scrape:bulk`, `scrape:bulk:file`, `scrape:catalog`, `scrape:fix`, `scrape:images` menjadi `node -e "console.error('DINONAKTIFKAN: sumber RunRepeat tidak boleh dipakai. Lihat docs/Legal document/'); process.exit(1)"`.
- [ ] Tambah guard di awal `scripts/scrape-runrepeat.ts` dan `scripts/scrape-bulk.ts`: `throw new Error("Dinonaktifkan — lihat docs/plan-pivot-data/01-FASE-0")` sebelum fetch. (Penghapusan total di Fase 7.)
- [ ] `npm test` tetap hijau (test parser memakai fixture lokal, bukan jaringan).

### 2.3 Inventaris aset terdampak (read-only)
Rekam hasil perintah ini di `INVENTARIS.md` (di folder snapshot, bukan repo):
```bash
git ls-files | grep -E "fixtures|public/vision|\.bak|\.sql|\.db"
git log --all --oneline -- scripts/__fixtures__ public/vision data   # commit yang menyentuh aset
grep -rli runrepeat --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git .
sqlite3 data/shoes.db "SELECT COUNT(*) FROM shoes; SELECT source,COUNT(*) FROM shoe_images GROUP BY 1;"
```
Baseline saat dokumen ini ditulis: 118 sepatu, 14 brand, 5.435 baris `shoe_images` (semua `runrepeat`).

### 2.4 Audit item yang "belum diperiksa" di dokumen legal
- [ ] Isi `src/data/fallback-shoes.ts` (6 sepatu, `sourceUrl` runrepeat; gambar dari mana?).
- [ ] `public/dev-samples/*` dan `NB-SCRebel-testImage.jpg`, `Superblast-testImage.jpg` — foto pihak ketiga? (File di folder induk hanya dicek, tidak diubah.)
- [ ] `src/app/api/shoes`: parameter apa yang membuka dump penuh (tanpa `limit` = semua?).
- [ ] `public/sw.js`/Workbox: apakah gambar RunRepeat di-cache runtime?
- [ ] Riwayat git: apakah repo pernah privat → publik (kapan)?

### 2.5 Catat di log internal
`docs/plan-pivot-data/LOG-PEMBERSIHAN.md` (buat saat mulai): tanggal, tindakan, alasan, pelaku. Bukti itikad baik.

## 3. Hal yang SENGAJA Tidak Dilakukan di Fase 0
- Tidak menghapus data, tidak mengubah Turso, tidak `filter-repo`/force-push (Fase 7, perlu konfirmasi terpisah).
- Tidak mengirim email ke RunRepeat.
- Tidak mengubah UI.

## 4. Definition of Done
- Snapshot privat + checksum tersedia, jadwal hapus tercatat.
- `npm run scrape*` gagal dengan pesan jelas; skrip tidak bisa fetch.
- Inventaris + jawaban 5 pertanyaan di §2.4 terdokumentasi.
- Pemilik mengonfirmasi G1–G3.
