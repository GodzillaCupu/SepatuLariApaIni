# Deploy ke Vercel (Production hanya dari branch `production`)

Panduan menyiapkan Vercel agar **hanya branch `production`** yang di-build dan tampil di dashboard. Pengembangan dan pengujian dilakukan di localhost (branch `main`); Vercel tidak menerima Preview dari branch lain.

> Dokumen ini hanya membahas Vercel. Untuk menyamakan database, lihat [`DB-SYNC-TURSO.md`](DB-SYNC-TURSO.md). Untuk keputusan AI Vision (BYOK), lihat [`adr/ADR-001-ai-vision-scan.md`](adr/ADR-001-ai-vision-scan.md).

---

## 1. Konsep singkat

| | Production | Preview |
|---|---|---|
| Asal | push ke **Production Branch** | branch / PR lain |
| URL | domain utama (`nama-proyek.vercel.app` atau domain sendiri) | URL unik per deploy |
| Env vars | scope **Production** | scope **Preview** |

- Keduanya di-build dengan `NODE_ENV=production`. Akibatnya `GEMINI_API_KEY` di server **selalu diabaikan** di Vercel (hanya berlaku saat development). Scan sepatu di Vercel memakai key milik pengguna (BYOK).
- Proyek tidak memakai `vercel.json`; konfigurasi dilakukan lewat dashboard.

## 2. Strategi branch

```
main        ← kerja harian + tes di localhost (tidak di-build Vercel)
production  ← satu-satunya branch yang di-deploy (Production)
```

Hanya merge `main` → `production` saat siap rilis.

## 3. Prasyarat

- Repo GitHub terhubung (`GodzillaCupu/SepatuLariApaIni`).
- Database Turso sudah berisi tabel `shoes` dengan kolom terbaru (fit, breathability, `upper_material`). Cek dengan `npm run db:check` dan `npm run db:audit` memakai `TURSO_*` produksi (lihat `DB-SYNC-TURSO.md`).
- Perubahan terbaru sudah di-commit di `main`.
- `npm run build` lulus di lokal (sebelum merge ke `production`).

## 4. Setup sekali jalan

### 4.1 Buat branch `production`

```bash
git checkout main
git push origin main                 # pastikan main terbaru di GitHub
git branch production                # dibuat dari main
git push -u origin production
```

### 4.2 Hubungkan proyek ke Vercel (bila belum)

1. Buka <https://vercel.com/new> → **Import Git Repository** → pilih `SepatuLariApaIni`.
2. Framework **Next.js** terdeteksi otomatis. Root Directory = root repo. Jangan ubah Build / Output command.
3. Di langkah *Configure Project*, isi Environment Variables (lihat §5) lalu **Deploy**.

Bila proyek sudah ada dan sebelumnya di-deploy lewat Vercel CLI (bukan dari GitHub), hubungkan repo di **Settings → Git → Connect Git Repository**.

### 4.3 Atur Production Branch

**Settings → Git → Production Branch** → isi `production` → **Save**.

### 4.4 Cegah build dari branch lain

**Settings → Git → Ignored Build Step** → pilih *Custom* dan isi:

```bash
[ "$VERCEL_GIT_COMMIT_REF" != "production" ]
```

Perintah ini keluar dengan kode 0 (build **dilewati**) bila branch bukan `production`, sehingga push ke `main` atau branch lain tidak membuat deployment apa pun.

### 4.5 Pindahkan live ke branch `production`

- Push ke `production` memicu deployment Production baru, **atau**
- buka **Deployments** → pilih deployment dari `production` → **⋯ → Promote to Production**.

Lalu periksa **Settings → Domains**: domain utama harus menunjuk ke Production. Deployment Preview lama (dari `main`) boleh dihapus manual dari tab Deployments.

## 5. Environment Variables

**Settings → Environment Variables**:

| Nama | Nilai | Scope |
|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://<nama-db>-<user>.turso.io` | **Production saja** |
| `TURSO_AUTH_TOKEN` | token Turso (read/write sesuai kebutuhan) | **Production saja** |
| `GEMINI_API_KEY` | **jangan dibuat** | — |

Catatan:
- Buang centang Preview dan Development agar tidak ada build non-production yang membaca database produksi.
- Setelah mengubah env var, lakukan **Redeploy** (env var hanya terbaca saat build/start baru).
- Jangan menaruh token di repo. `.env*` sudah masuk `.gitignore`; hanya `.env.example` yang di-commit.
- Bila `TURSO_*` salah atau kosong, aplikasi **tidak error**: `shoe.service.ts` diam-diam menampilkan 6 sepatu fallback statis. Selalu verifikasi jumlah data (§7).

## 6. Alur rilis rutin

```bash
# 1) kerja & tes di main (localhost)
npm run test && npm run build

# 2) rilis
git checkout production
git merge main
git push origin production           # ← memicu deployment Production

# 3) kembali bekerja
git checkout main
```

Opsional: di GitHub (**Settings → Branches**) lindungi `production` agar perubahan masuk lewat Pull Request dari `main`.

## 7. Verifikasi setelah deploy

Ganti `<domain>` dengan domain Production.

```bash
# data dari Turso (bukan fallback): total sesuai jumlah baris di DB
curl -s https://<domain>/api/shoes | head -c 200

# POST tanpa body valid → 400
curl -s -X POST https://<domain>/api/detect-shoe \
  -H 'content-type: application/json' -d '{"image":"x","mimeType":"image/jpeg"}'

# POST valid tanpa key → 401 KEY_REQUIRED (membuktikan key server tidak aktif di production)
curl -s -X POST https://<domain>/api/detect-shoe -H 'content-type: application/json' \
  -d "{\"image\":\"$(printf 'A%.0s' {1..200})\",\"mimeType\":\"image/jpeg\"}"
```

Cek manual di HP: `/` (katalog), `/bandingkan?ids=<id1>,<id2>`, `/panduan`, tombol **Scan sepatu** (butuh key Gemini sendiri di Pengaturan AI), lalu **Add to Home Screen** dan mode offline (Service Worker hanya aktif di build production / https).

Di tab **Deployments** hanya deployment dari `production` yang boleh muncul.

## 8. Perilaku yang perlu diketahui

- **Cache data**: `/api/shoes` memakai `s-maxage=3600` (CDN) dan `/api/shoes/[id]` `s-maxage=86400`. Setelah scrape ulang atau sinkron DB, data baru bisa butuh hingga 1 jam (daftar) / 24 jam (detail) untuk terlihat; Service Worker menambahkan cache `NetworkFirst` 24 jam di sisi klien. Untuk segera melihat data baru, lakukan **Redeploy** (tanpa cache build) atau tunggu TTL.
- **Scan sepatu**: `POST /api/detect-shoe` ber-`no-store`, `maxDuration = 30` detik, body dibatasi ±4 MB (foto diperkecil di klien). Tidak jalan offline.
- **Gambar produk**: host yang diizinkan ada di `next.config.mjs` (`cdn.runrepeat.com`, `runrepeat.com`, `images.unsplash.com`). Sumber gambar baru harus ditambahkan di sana, lalu rilis ulang.
- **File Service Worker** (`public/sw.js`, `public/workbox-*`) di-ignore Git dan dibuat saat `npm run build`; jangan di-commit.

## 9. Troubleshooting

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| Hanya 6 sepatu tampil | `TURSO_*` kosong/salah di scope Production, atau DB tidak terjangkau | Periksa env var, **Redeploy**, cek log fungsi (`[ShoeService] Database unavailable`) |
| Push ke `production` tidak membuat deployment | Ignored Build Step salah ketik, atau Production Branch belum `production` | Periksa §4.3–4.4; pastikan repo terhubung |
| Push ke `main` tetap membuat Preview | Ignored Build Step belum diatur | Atur §4.4 |
| `401 KEY_REQUIRED` saat Scan | Normal: pengguna belum mengisi key | Isi key di **Pengaturan AI** (ikon kunci di halaman utama) |
| `401 KEY_INVALID` | Key Gemini salah / tidak punya akses | Buat key baru di <https://aistudio.google.com/apikey> |
| `429` saat Scan | Kuota Gemini pengguna habis | Tunggu atau pakai key lain |
| Build gagal soal tipe | Perubahan belum lolos `tsc` | Jalankan `npx tsc --noEmit` dan `npm run build` di lokal |
| Gambar kosong (ikon sepatu) | Host gambar belum diizinkan atau URL mati | Tambah host di `next.config.mjs`, rilis ulang |

## 10. Rollback

- **Dashboard**: tab **Deployments** → pilih deployment sebelumnya yang sehat → **⋯ → Promote to Production** (atau *Instant Rollback* bila tersedia di paketmu; di paket Hobby ketersediaannya terbatas).
- **Git**: di `production` jalankan `git revert <commit>` lalu push; Vercel membuat deployment baru dari kondisi tersebut. Hindari `git push --force` ke `production`.
- Perubahan skema database **tidak** ikut ter-rollback oleh Vercel. Pastikan perubahan skema bersifat menambah kolom (kompatibel mundur) dan backup Turso sebelum `db:push` (lihat `DB-SYNC-TURSO.md`).
