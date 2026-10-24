# Fase 1 — Draft Skema Data Baru

**Tujuan:** menyiapkan bahan keputusan struktur database. **Tidak ada migrasi dijalankan** sampai pemilik memilih (Fase 4 HOLD bergantung pada ini).
**Status:** 🟡 draft — butuh keputusan pemilik (§6).

## 1. Kondisi Sekarang (`src/db/schema.ts`)

### Tabel `shoes` — peta ketergantungan RunRepeat

| Kolom | NOT NULL | Asal | Nasib di draft |
|---|:-:|---|---|
| `id`, `brand`, `model`, `release_year` | ✓ | fakta/nama | **Tetap** (cek tahun dari pabrikan) |
| `category`, `sub_category`, `terrain`, `primary_use`, `secondary_use`, `target_pace_range`, `runner_type`, `surface` | sebagian | `classify-shoe.ts` memakai teks review RunRepeat | **Hitung ulang** (Fase 4, HOLD); sementara boleh `NULL` |
| `weight_grams`, `drop_mm`, `heel_stack_mm`, `forefoot_stack_mm` | ✓ | ukuran lab RunRepeat | **Ganti** dengan angka pabrikan; jadi **nullable** |
| `foam_type`, `plate_type` | ✓ | RunRepeat | **Verifikasi** via pabrikan; `foam_type` nullable |
| `cushion_feel` | ✓ (default Balanced) | turunan "softness" RunRepeat | **Estimasi sendiri** (Fase 4) |
| `sizing`, `length_fit`, `width_fit`, `fit_votes` | ✓ (default unknown) | uji/suara RunRepeat | **Kosongkan** → `unknown`/`NULL` |
| `breathability`, `upper_material` | ✓ | RunRepeat | `upper_material` dari pabrikan; breathability estimasi/unknown |
| `verdict_summary`, `pros`, `cons` | ✓ | teks review verbatim | **Hapus isi**; kolom nullable atau diganti teks template |
| `image_url` | – | RunRepeat | **Ganti** foto berizin / `NULL` |
| `source_url` | ✓ | halaman RunRepeat | **Ganti** URL pabrikan; nullable |

### Tabel `shoe_images`
5.435 baris, `source` default `'runrepeat'`, hanya `kind/label/usable`. Tidak ada bukti lisensi.

## 2. Prinsip Desain
1. **"Belum tersedia" ≠ default tebakan.** Kolom spec jadi nullable; UI menampilkan "belum tersedia".
2. **Provenance per field.** Tiap angka bisa dilacak ke URL + tanggal + bukti, dan bisa dicabut.
3. **Kill switch per brand/shoe** (`data_status`, `brand_sources.enabled`).
4. **Migrasi additive dulu**, pelonggaran NOT NULL kemudian, penghapusan kolom terakhir (Fase 7).
5. **Pisahkan fakta pabrikan vs estimasi sendiri** supaya label UI jujur.

## 3. Draft Tabel Baru

### 3.1 `brand_sources` — izin & status per brand
| Kolom | Tipe | Catatan |
|---|---|---|
| `brand` PK | text | cocok dengan `shoes.brand` |
| `status` | text | `go` \| `permission_pending` \| `permission_granted` \| `no` |
| `robots_checked_at`, `tos_checked_at` | text ISO | |
| `robots_snapshot`, `tos_snapshot` | text | path bukti di penyimpanan privat |
| `press_kit_url`, `affiliate_program` | text | |
| `contact_email`, `permission_ref` | text | bukti email/izin |
| `enabled` | integer bool | kill switch |
| `notes` | text | |

### 3.2 `shoe_field_sources` — provenance per field
| Kolom | Tipe | Catatan |
|---|---|---|
| `id` PK | integer | |
| `shoe_id` FK→shoes (cascade) | text | |
| `field` | text | `weight_grams` \| `drop_mm` \| … |
| `value` | text | nilai mentah sebelum normalisasi |
| `source_type` | text | `brand_site` \| `affiliate_feed` \| `manual` \| `derived` |
| `source_url` | text | |
| `retrieved_at` | text ISO | |
| `license_status` | text | `none_needed_fact` \| `permission` \| `press_kit` |
| `evidence_ref` | text null | |
| `robots_version`, `tos_snapshot` | text | |
| unique (`shoe_id`, `field`, `source_type`) | | |

### 3.3 `image_licenses` — register foto (panduan operasional §3.5)
| Kolom | Tipe |
|---|---|
| `id` PK | integer |
| `shoe_image_id` FK→shoe_images | integer |
| `source_page`, `owner` | text |
| `license_type` | `press_kit` \| `affiliate_creative` \| `written_permission` \| `own` |
| `proof_ref` | text |
| `scope_app`, `scope_ai_embedding`, `scope_commercial` | integer bool |
| `valid_until`, `obtained_at` | text |
| `credit_text` | text null |

### 3.4 Tambahan di `shoes`
`data_status` (`published`/`needs_review`/`takedown`, default `needs_review`) · `buy_url` · `buy_url_is_affiliate` (bool) · `specs_source` (`brand`/`manual`/`mixed`) · `specs_retrieved_at`.

### 3.5 Tambahan di `shoe_images`
Ganti default `source` dari `'runrepeat'` ke `'unknown'`; tambah `license_id` nullable. Baris tanpa lisensi **tidak ditampilkan** (filter di service).

## 4. Dua Opsi Struktur Utama — Pilih Salah Satu

### Opsi A — Pertahankan tabel `shoes` lebar, longgarkan NOT NULL (lebih kecil perubahannya)
- Kolom spec tetap di `shoes`; provenance di `shoe_field_sources` sebagai samping.
- ✅ Perubahan kode UI/service minimal, kueri sederhana (filter, sort, bandingkan).
- ❌ Tabel melebar; nilai estimasi dan nilai pabrikan bercampur di kolom yang sama (perlu penanda lewat tabel provenance).
- Cocok bila pemilik ingin cepat dan UI tetap seperti sekarang.

### Opsi B — Pisahkan `shoes` (identitas) dan `shoe_specs` (nilai + sumber, satu baris per field)
- `shoes` hanya identitas + `data_status`; `shoe_specs(shoe_id, field, value, unit, source_type, …)` memegang semua angka (EAV).
- ✅ Pembedaan "menurut pabrikan" vs "estimasi" melekat di data; kill switch per sumber mudah; tambah field baru tanpa migrasi.
- ❌ Kueri filter/sort lebih rumit; service & UI harus ditulis ulang; performa sedikit turun (perlu view/denormalisasi).
- Cocok bila pemilik ingin fondasi bersih jangka panjang (UGC fit, banyak sumber).

### Opsi A+ (rekomendasi) — Opsi A + tabel `shoe_estimates` terpisah
- Nilai pabrikan di kolom `shoes` (nullable).
- Hasil mesin estimasi (cushion_feel, category, pace, breathability, pros/cons turunan) di tabel `shoe_estimates(shoe_id, field, value, rule_id, rule_version, computed_at)` atau kolom berawalan `est_*`.
- UI menampilkan dua blok berlabel berbeda tanpa menulis ulang kueri inti.
- Alasan: label sumber jujur (syarat advisory §5 Opsi 1) dengan biaya perubahan sedang.

## 5. Strategi Migrasi (berlaku untuk semua opsi)
1. Fase 1a (additive, aman): buat tabel baru + kolom baru nullable. Aplikasi lama tetap jalan.
2. Fase 1b: longgarkan NOT NULL (di SQLite perlu *table rebuild* — `drizzle-kit generate` lalu tinjau SQL; backup dulu).
3. Aplikasi baca `data_status='published'` saja (Fase 6).
4. Fase 7: hapus kolom lama (`verdict_summary`, `pros`, `cons`, `fit_votes`, …) setelah tidak dipakai.
5. Zod `shoe.schema.ts`: spec jadi optional + `SPEC_LIMITS` tetap divalidasi bila ada.
6. Urutan database: lokal → verifikasi → Turso (ikuti [`../DB-SYNC-TURSO.md`](../DB-SYNC-TURSO.md), snapshot dulu).

## 6. Pertanyaan untuk Pemilik (jawaban membuka Fase 4)

1. **Opsi A, A+, atau B?**
2. Field apa yang **wajib** ada agar sepatu boleh `published`? (usul: brand, model, tahun, berat; sisanya opsional)
3. Apakah `cushion_feel`, kategori, dan pace ingin disimpan sebagai **kolom di `shoes`** atau **tabel estimasi terpisah**?
4. `pros/cons`: dihapus total, atau diganti daftar singkat turunan aturan (mis. "Pelat karbon", "Foam PEBA")?
5. Ingin menyimpan **banyak sumber per field** (mis. pabrikan vs toko) atau satu sumber terbaik?
6. Fitur UGC (rating fit pengguna) dipertimbangkan sejak sekarang (mempengaruhi desain `sizing/fit_votes`)?
7. Link beli: satu URL per sepatu, atau beberapa toko resmi per negara?
8. Apakah filter/sort di beranda masih perlu `category`/`pace` (yang kini diturunkan RunRepeat)?

## 7. Definition of Done (Fase 1, setelah keputusan)
- Skema final terdokumentasi + diagram.
- SQL migrasi additive ditinjau (belum dijalankan di prod).
- `shoe.schema.ts` dan tipe `src/types/index.ts` selaras draft.
- `npm test` dan `npx tsc --noEmit` hijau di lokal.
