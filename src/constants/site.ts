/** Konfigurasi situs: developer & donasi. Ubah di sini saja. */
export const SITE = {
  developer: {
    name: "GodzillaCupu",
    url: "https://www.instagram.com/godzillacupu/",
  },
  donation: {
    /** QR Saweria (file di /public). */
    qrImage: "/saweriaQR.png",
  },
  feedback: {
    /** Web3Forms access key (publik by design; kirim laporan ke email pemilik akun). */
    accessKey: "914d1792-e2ac-4ff3-baf8-f1dad00c9cf3",
  },
};

/** Web3Forms access key (publik by design; batasi domain di dashboard Web3Forms). Satu key per jenis. */
export const FEEDBACK = {
  endpoint: "https://api.web3forms.com/submit",
  bug: { accessKey: "914d1792-e2ac-4ff3-baf8-f1dad00c9cf3", label: "Lapor Bug", emoji: "🐞" },
  feature: { accessKey: "6bccb39a-1c0f-4f50-a2de-332de00da692", label: "Request Fitur", emoji: "💡" },
} as const;
