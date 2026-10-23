/** Normalisasi untuk perbandingan: huruf kecil, tanpa tanda baca, spasi tunggal. */
export const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
