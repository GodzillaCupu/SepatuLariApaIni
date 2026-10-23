import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  // transformers.js jalan di browser (WASM): jangan tarik modul Node ke bundle klien.
  webpack: (config, { isServer }) => {
    // Klien: tanpa modul Node. Server (SSR komponen klien): modul tidak pernah dijalankan → kosongkan
    // agar webpack tidak mencoba membundel build Node (ort-wasm .wasm tidak bisa di-resolve).
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
      ...(isServer ? { "@huggingface/transformers$": false } : {}),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.runrepeat.com",
      },
      {
        protocol: "https",
        hostname: "runrepeat.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default withPWA(nextConfig);
