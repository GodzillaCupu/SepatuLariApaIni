# Sinkronisasi Database Lokal ke Turso (Production)

Panduan manual untuk menyamakan database Turso (production) dengan SQLite lokal `data/shoes.db`. Cocok dipakai setelah menjalankan scraper (`npm run scrape:*`), audit data (`npm run db:audit`), atau mengubah skema.

- Database Turso: `database-sepatulariapaini`
- Database lokal: `data/shoes.db`
- Prasyarat: Turso CLI sudah login (`turso auth login`) dan `sqlite3` terpasang.

> **Peringatan:** Cara A di bawah menghapus tabel `shoes` di production lalu membuatnya ulang. Row yang hanya ada di Turso akan hilang. Selalu backup dulu.

## Cara A: Replace penuh (Turso dibuat persis sama dengan lokal)

Dipakai saat banyak data berubah atau saat skema berubah (kolom baru).

Jalankan dari folder `SepatuLariApaIni`:

```bash
cd "/Users/macery/Ery/pribadi/01-Portofolio/PWA/Sepatu Lari Apa ini Folder/SepatuLariApaIni"
```

### 1. Backup production

```bash
turso db shell database-sepatulariapaini ".dump" > data/turso-prod-backup.sql
```

Pastikan file terisi (cek jumlah row di backup):

```bash
grep -c "INSERT INTO" data/turso-prod-backup.sql
```

### 2. Buat SQL replace dari database lokal

```bash
( echo "DROP TABLE IF EXISTS shoes;"; sqlite3 data/shoes.db ".dump shoes" | grep -vE '^(PRAGMA|BEGIN|COMMIT)' ) > data/replace-to-turso.sql
```

### 3. Kirim ke Turso

```bash
turso db shell database-sepatulariapaini < data/replace-to-turso.sql
```

Output kosong berarti sukses.

### 4. Verifikasi

Jumlah row Turso harus sama dengan lokal:

```bash
turso db shell database-sepatulariapaini "select count(*) from shoes;"
sqlite3 data/shoes.db "select count(*) from shoes;"
```

Cek kolom (opsional, harus sama dengan `src/db/schema.ts`):

```bash
turso db shell database-sepatulariapaini ".schema shoes"
```

### Rollback

Kalau hasil tidak sesuai, kembalikan dari backup:

```bash
turso db shell database-sepatulariapaini "drop table if exists shoes;"
turso db shell database-sepatulariapaini < data/turso-prod-backup.sql
```

## Cara B: Update row tertentu saja

Dipakai kalau hanya 1 sampai 3 row yang berubah dan jumlah row tidak bertambah. Tidak menambah kolom; untuk kolom baru pakai Cara A.

```bash
# lihat nilai di lokal
sqlite3 data/shoes.db "select id, weight_grams, drop_mm from shoes where id='ID_SEPATU';"

# terapkan ke Turso
turso db shell database-sepatulariapaini "update shoes set weight_grams=250, drop_mm=8 where id='ID_SEPATU';"
```

## Catatan

- File `data/*.sql` dan `data/*.bak` adalah artefak lokal, jangan di-commit. Pastikan masuk `.gitignore`.
- Selama kolom baru belum ada di Turso, kode yang membaca kolom itu jatuh ke dataset fallback (lihat `docs/ARCHITECTURE.md`, bagian Resilience Fallback).
- Alternatif untuk perubahan skema saja: `TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:push` (hanya menyelaraskan skema, tidak menyalin data).
- Riwayat: sinkronisasi pertama pada 2026-10-23 (Turso 37 row tanpa 6 kolom fit/breathability menjadi 57 row dari lokal).
