import { z } from "zod";

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/** Batas panjang string base64 (~3 MB biner) agar body POST muat di batas 4.5 MB Vercel. */
export const MAX_BASE64_CHARS = 4_000_000;

export const DetectRequestSchema = z.object({
  image: z.string().min(100, "Gambar kosong").max(MAX_BASE64_CHARS, "Gambar terlalu besar"),
  mimeType: z.enum(ALLOWED_MIME),
});
export type DetectRequest = z.infer<typeof DetectRequestSchema>;

/** Hasil identifikasi dari model. brand/model "unknown" = tidak yakin. */
export const DetectionSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  releaseYear: z.number().int().min(2000).max(2100).nullable().optional(),
  colorway: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});
export type Detection = z.infer<typeof DetectionSchema>;

export type VisionErrorCode =
  | "KEY_REQUIRED"
  | "BAD_REQUEST"
  | "KEY_INVALID"
  | "QUOTA"
  | "UPSTREAM"
  | "BAD_RESPONSE"
  | "TIMEOUT";

export class VisionError extends Error {
  constructor(public code: VisionErrorCode, message: string, public status: number) {
    super(message);
    this.name = "VisionError";
  }
}
