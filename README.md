# LariYuk (SepatuLariApaIni) 👟

> **PWA Katalog & Panduan Rotasi Sepatu Lari Berbasis Data Uji Lab.**  
> Membantu pelari pemula hingga maraton mengenali peran sepatu lari (Daily Trainer, Max Cushion, Tempo, Race Day, Trail) secara instan tanpa bingung istilah marketing.

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)](https://nextjs.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-emerald?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Database](https://img.shields.io/badge/Database-SQLite_%2F_Turso-blue?logo=sqlite)](https://turso.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Apa Itu LariYuk?

Pasar sepatu lari saat ini dibanjiri oleh puluhan jenis busa (*ZoomX, FF Blast+, Lightstrike, PWRRUN*) dan teknologi pelat (*Carbon, Nylon, TPU*). Masalah sering terjadi:
- **Pelari pemula** membeli sepatu balap berpelat karbon yang kaku untuk lari santai harian, sehingga memicu cedera *shin splints*.
- **Pelari maraton** kesulitan mencari sepatu tempo pengganti saat toko sedang diskon.
- Data lab sepatu di situs seperti RunRepeat sangat lengkap, namun belum ada aplikasi ringan berbentuk PWA yang ramah ponsel untuk referensi cepat di toko atau saat lari.

**LariYuk** hadir sebagai aplikasi web mobile-first (PWA) yang dapat dibuka secara offline, menyajikan spesifikasi uji laboratorium terstandarisasi (berat gram asli, *drop*, ketebalan *stack*, busa, dan pelat) lengkap dengan rekomendasi rentang *pace* (menit/km) dan peran rotasi sepatu.

---

## 2. Panduan Penggunaan (User POV)

### Skenario 1: Mencari Sepatu Sesuai Target Latihan
1. Buka aplikasi di browser ponsel atau install sebagai PWA via tombol **"Add to Home Screen"**.
2. Di bagian **Kategori Rotasi**, pilih badge latihan Anda:
   - 🟢 **Daily Trainer**: Sepatu harian serbaguna untuk melahap kilometer santai (misal: *Nike Pegasus 41*, *Asics Novablast 4*).
   - 🟡 **Max Cushion**: Sepatu berbusa tebal untuk *recovery run* saat otot lelah (misal: *Asics Gel-Nimbus 26*).
   - 🟠 **Tempo / Speed**: Sepatu ringan & responsif untuk lari interval / fartlek (misal: *Saucony Endorphin Speed 4*).
   - 🔴 **Race Day**: Sepatu super dengan pelat karbon untuk mengejar *Personal Best* (misal: *Nike Vaporfly 3*).
   - 🟣 **Trail Running**: Sepatu berpaku/lug kokoh untuk medan alam bebas (misal: *Hoka Speedgoat 5*).
3. Daftar sepatu akan otomatis tersaring seketika (0 ms).

### Skenario 2: Mengecek Spesifikasi Lab di Toko Sepatu
1. Ketik nama sepatu di kolom pencarian (misal: ketik `novablast` atau `pegasus`).
2. Klik kartu sepatu untuk membuka lembar **Spesifikasi Uji Lab**.
3. Periksa parameter penting:
   - **Target Pace**: Menunjukkan di rentang kecepatan berapa sepatu ini bekerja optimal (misal: `5:00 - 6:30 min/km`).
   - **Heel-to-Toe Drop**: Beda ketebalan tumit vs ujung kaki.
   - **Tebal Stack (Tumit/Depan)**: Menentukan seberapa tebal busa melindungi kaki dari impak aspal.
   - **Kelebihan & Kekurangan**: Poin ringkas apakah sepatu terlalu hangat, licin di jalan basah, atau sempit di jari.

### Skenario 3: Penggunaan Tanpa Internet (Offline Mode)
- Setelah dibuka pertama kali, Service Worker PWA akan menyimpan aset dan database di perangkat Anda.
- Saat sedang di expo lari atau toko tanpa sinyal internet, aplikasi tetap dapat dibuka dan dicari dengan lancar.

---

## 3. Fitur Utama

- 📱 **Mobile-First & PWA**: Terasa seperti aplikasi iOS/Android native tanpa perlu download dari App Store.
- ⚡ **Pencarian Real-Time**: Pencarian lokal dengan latensi 0 ms.
- 🧪 **Spesifikasi Terstandarisasi Lab**: Data bersumber dari pengujian laboratorium independen (RunRepeat), bukan klaim iklan pabrik.
- 💸 **Nol Biaya Operasional**: Didesain berjalan di tier gratis (Next.js di Vercel Hobby + Turso Serverless SQLite).

---

## 4. Menjalankan di Lokal (Developer Guide)

### Prasyarat
- Node.js versi 20 ke atas (disarankan v20+ untuk dukungan `process.loadEnvFile`)
- npm / pnpm / bun

### Langkah Instalasi
```bash
# 1. Masuk ke direktori aplikasi
cd SepatuLariApaIni

# 2. Install dependensi
npm install

# 3. Konfigurasi Environment (.env)
# Jika belum ada file .env, salin dari template:
cp .env.example .env
```

Pilih salah satu konfigurasi di dalam file `.env`:

- **Opsi A: Turso Cloud Database (Direkomendasikan / Production-parity)**
  ```env
  TURSO_DATABASE_URL=libsql://database-sepatulariapaini-[username].turso.io
  TURSO_AUTH_TOKEN=eyJhbGciOi...
  ```
- **Opsi B: SQLite File Lokal (Offline / Standalone)**
  ```env
  TURSO_DATABASE_URL=file:./data/shoes.db
  TURSO_AUTH_TOKEN=
  ```

### Manajemen & Verifikasi Database
```bash
# 1. Cek status koneksi database
npm run db:check

# 2. Sinkronisasi skema tabel ke database (Turso / SQLite)
npm run db:push

# 3. Masukkan data katalog awal (6 sepatu lab teruji)
npm run db:seed

# 4. (Opsional) Ambil data sepatu otomatis dari RunRepeat
# - Ambil dari halaman katalog:
npm run scrape:catalog
# - Atau ambil per sepatu tertentu:
npm run scrape https://runrepeat.com/mizuno-neo-vista

# 5. Jalankan server pengembangan lokal
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 5. Deployment ke Vercel (Gratis)

1. Push atau fork repositori ini ke akun GitHub Anda.
2. Buka dashboard [Vercel](https://vercel.com/new) dan import proyek `SepatuLariApaIni`.
3. Tambahkan **Environment Variables** di Vercel Settings:
   - `TURSO_DATABASE_URL`: URL database Turso Anda (`libsql://...`)
   - `TURSO_AUTH_TOKEN`: Token autentikasi Turso Anda
4. Klik **Deploy**. Selesai. PWA dan REST API akan otomatis membaca data langsung dari Turso Cloud.

