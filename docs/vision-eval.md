# Evaluasi prediktor visual

Dihasilkan `npm run vision:eval -- --write`. Eksternal = foto di luar indeks (data/eval + 2 foto uji manual). LOO optimistis (foto satu sesi mirip).

| Model | Tanggal | Vektor | Eksternal n | Ext top-1 | Ext top-3 | Ext top-5 | LOO n | LOO top-1 | LOO top-3 | LOO top-5 |
|---|---|---|---|---|---|---|---|---|---|---|
| clip | 2026-10-23 | 4386 | 2 | 50% | 50% | 50% | 235 | 26% | 40% | 43% |
| dinov2 | 2026-10-23 | 524 | 2 | 0% | 0% | 0% | 232 | 6% | 9% | 11% |
| siglip | 2026-10-23 | 1983 | 2 | 100% | 100% | 100% | 236 | 61% | 83% | 89% |

**Kesimpulan (2026-10-23):** SigLIP-base dipilih. Gerbang top-5 ≥ ~80% lolos pada LOO (89%) dan 2/2 foto uji asli di #1; *n eksternal masih sangat kecil* — perbanyak dengan `data/eval/<shoeId>/*.jpg` (foto toko nyata). CLIP mengelompokkan menurut adegan (latar/kaki), bukan sepatu; DINOv2 terhambat ambang `--accept 0.72` (hanya 524 vektor, skala cosine berbeda) sehingga belum diadili adil.
