# Plan Pivot Data — RunRepeat → Sumber Pabrikan

> Dokumen perencanaan. **Belum ada perubahan kode/DB/git.** Turunan dari tiga dokumen di [`../Legal document/`](../Legal%20document/). Bukan nasihat hukum berlisensi.

| | |
|---|---|
| **Tanggal** | 2026-10-24 |
| **Objek** | LariYuk / SepatuLariApaIni |
| **Tujuan** | Hentikan ketergantungan pada RunRepeat; ganti dengan spesifikasi + foto + link beli dari pabrikan, plus estimasi buatan sendiri |

## 1. Keputusan Pemilik

| Topik | Keputusan |
|---|---|
| Somasi/klaim RunRepeat | Belum ada; hanya antisipasi → pembersihan sah dilakukan |
| Repo GitHub | **Publik** → file RunRepeat tersimpan di history; `git filter-repo` wajib (Fase 7) |
| Opsi 3 (sosmed/berita) | Tidak dilakukan |
| Fase 0–3 | Didetailkan di dokumen terpisah (folder ini) |
| Fase 4 | **HOLD** — pemilik menentukan struktur data baru dulu |
| Fase 5 | Dokumen langkah verifikasi press kit |
| Fase 6–7 | Disetujui, tetapi **HOLD** (bottleneck Fase 3–5) |
| Fase 8 | Disetujui |

## 2. Peta Fase & Status

| Fase | Dokumen | Status | Bergantung pada |
|---|---|---|---|
| 0 Freeze & gerbang | [`01-FASE-0-FREEZE-DAN-GERBANG.md`](01-FASE-0-FREEZE-DAN-GERBANG.md) | 🟢 siap dikerjakan | — |
| 1 Skema data | [`02-FASE-1-DRAFT-SKEMA-DATA.md`](02-FASE-1-DRAFT-SKEMA-DATA.md) | 🟡 draft; **tunggu keputusan struktur** | Fase 0 |
| 2 Kelayakan brand | [`03-FASE-2-KELAYAKAN-BRAND.md`](03-FASE-2-KELAYAKAN-BRAND.md) | 🟢 siap (riset, tanpa kode) | Fase 0 |
| 3 Scraper pabrikan | [`04-FASE-3-SCRAPER-PABRIKAN.md`](04-FASE-3-SCRAPER-PABRIKAN.md) | 🟡 desain siap; kode menunggu Fase 1 & 2 | Fase 1, 2 |
| 4 Mesin estimasi | [`06-FASE-4-6-7-HOLD.md`](06-FASE-4-6-7-HOLD.md) | ⏸ HOLD | struktur data dari pemilik |
| 5 Foto & vision | [`05-FASE-5-VERIFIKASI-PRESS-KIT-FOTO.md`](05-FASE-5-VERIFIKASI-PRESS-KIT-FOTO.md) | 🟢 prosedur siap; eksekusi menunggu respons brand | Fase 2 |
| 6 UI/API/dokumen publik | [`06-FASE-4-6-7-HOLD.md`](06-FASE-4-6-7-HOLD.md) | ⏸ HOLD | Fase 3, 4, 5 |
| 7 Cutover & pembersihan | [`06-FASE-4-6-7-HOLD.md`](06-FASE-4-6-7-HOLD.md) | ⏸ HOLD | Fase 3–6 |
| 8 Berkelanjutan | bagian akhir dokumen HOLD | ⏳ setelah cutover | Fase 7 |

## 3. Urutan Kerja

```
Fase 0 ─┬─► Fase 2 (riset brand + email izin) ─┬─► Fase 3 (pilot 3 brand)
        │                                       └─► Fase 5 (permintaan press kit, paralel)
        └─► Fase 1 (draft skema) ──► KEPUTUSAN PEMILIK ──► Fase 4 (HOLD) ──► Fase 6 ──► Fase 7 ──► Fase 8
```

**Jalur kritis:** keputusan struktur data (Fase 1→4) dan respons brand (Fase 2/5). Dua hal ini yang menahan Fase 6–7. Selama HOLD, app produksi **tetap berjalan dengan data lama** — itu risiko TINGGI yang sedang ditanggung (lihat §4).

## 4. Risiko Selama Masa HOLD

| Risiko | Mitigasi sementara |
|---|---|
| Data RunRepeat tetap tayang di produksi & repo publik | Percepat Fase 0 (blokir scraper, snapshot) dan pertimbangkan rilis mitigasi cepat (§5) sambil menunggu Fase 4 |
| Fixture HTML + embedding ada di history publik | Pembersihan git tidak perlu menunggu data baru — lihat §5 |
| Scraper masih bisa dijalankan tidak sengaja | Fase 0 langkah 4 |

## 5. Usulan Opsional: "Mitigasi Cepat" (butuh persetujuan pemilik)

Beberapa tindakan **tidak bergantung** pada struktur data baru dan menurunkan risiko lebih cepat. Dipisah dari plan utama; kerjakan hanya bila pemilik setuju:

1. Hapus `verdict_summary`, pros/cons verbatim dari tampilan (kosongkan di UI) — teks ulasan adalah risiko tertinggi (R1).
2. `git rm` fixture HTML & jadwalkan `filter-repo` (repo publik).
3. Ganti User-Agent/blokir scraper (sudah di Fase 0).

## 6. Glosarium Status Data

`published` (tayang) · `needs_review` (hasil scraper belum diperiksa) · `takedown` (disembunyikan karena permintaan/kill switch).

## 7. Referensi
- [`../Legal document/LEGAL-DATA-AUDIT-RUNREPEAT.md`](../Legal%20document/LEGAL-DATA-AUDIT-RUNREPEAT.md)
- [`../Legal document/LEGAL-ADVISORY-SUMBER-DATA-BARU.md`](../Legal%20document/LEGAL-ADVISORY-SUMBER-DATA-BARU.md)
- [`../Legal document/LEGAL-PANDUAN-OPERASIONAL-DATA.md`](../Legal%20document/LEGAL-PANDUAN-OPERASIONAL-DATA.md)
