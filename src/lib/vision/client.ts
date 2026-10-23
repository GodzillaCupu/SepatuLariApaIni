import type { DetectOk } from "./handler";

export const KEY_STORAGE = "lariyuk.gemini_key";
const MAX_SIDE = 1536;
const JPEG_QUALITY = 0.85;

export class ScanError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ScanError";
  }
}

export function getStoredKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setStoredKey(key: string): boolean {
  try {
    if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
    return true;
  } catch {
    return false;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ScanError("BAD_IMAGE", "Foto tidak bisa dibaca. Coba foto lain."));
    };
    img.src = url;
  });
}

/** Perkecil (sisi terpanjang 1536 px) → JPEG base64 tanpa prefix. Foto kamera 12 MP jadi ±300 KB. */
export async function prepareImage(file: File): Promise<{ base64: string; mimeType: "image/jpeg"; previewUrl: string }> {
  if (!file.type.startsWith("image/")) throw new ScanError("BAD_IMAGE", "File harus berupa gambar.");
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ScanError("BAD_IMAGE", "Browser tidak mendukung pemrosesan gambar.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { base64: dataUrl.split(",")[1] ?? "", mimeType: "image/jpeg", previewUrl: dataUrl };
}

export async function scanShoe(base64: string, mimeType: string): Promise<DetectOk> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ScanError("OFFLINE", "Scan butuh internet. Hubungkan perangkat lalu coba lagi.");
  }
  const key = getStoredKey();
  let res: Response;
  try {
    res = await fetch("/api/detect-shoe", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { "x-gemini-key": key } : {}) },
      body: JSON.stringify({ image: base64, mimeType }),
    });
  } catch {
    throw new ScanError("OFFLINE", "Tidak bisa menghubungi server. Periksa koneksi.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ScanError(json?.error?.code ?? "UPSTREAM", json?.error?.message ?? `Gagal memindai (HTTP ${res.status}).`);
  }
  return json as DetectOk;
}
