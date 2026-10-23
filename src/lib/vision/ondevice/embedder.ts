import { l2normalize } from "./vector";

/** Harus sama dengan scripts/lib/vision-embed.ts (MODELS.siglip) agar vektor sebanding dengan indeks. */
export const MODEL_REPO = "Xenova/siglip-base-patch16-224";
export const MODEL_DTYPE = "q8" as const;

export interface EmbedProgress {
  /** 0..1 untuk unduhan model; null bila belum diketahui. */
  fraction: number | null;
  file?: string;
}

export interface Embedder {
  embed(imageUrl: string): Promise<Float32Array>;
}

let pending: Promise<Embedder> | null = null;

/**
 * Muat model SigLIP (sekali). Bobot diunduh dari HuggingFace Hub lalu di-cache browser;
 * TIDAK ada foto pengguna yang dikirim — semua inferensi lokal (WASM).
 */
export function getEmbedder(onProgress?: (p: EmbedProgress) => void): Promise<Embedder> {
  if (pending) return pending;
  pending = (async () => {
    const tf = await import("@huggingface/transformers");
    tf.env.allowLocalModels = false;
    const progress_callback = (e: any) => {
      if (!onProgress) return;
      if (e?.status === "progress" && typeof e.progress === "number") onProgress({ fraction: e.progress / 100, file: e.file });
      else if (e?.status === "initiate" || e?.status === "download") onProgress({ fraction: null, file: e.file });
    };
    const processor = await tf.AutoProcessor.from_pretrained(MODEL_REPO, { progress_callback });
    const model = await tf.SiglipVisionModel.from_pretrained(MODEL_REPO, { dtype: MODEL_DTYPE, progress_callback });
    return {
      async embed(imageUrl: string) {
        const image = await tf.RawImage.read(imageUrl);
        const out: any = await model(await processor(image));
        const t = out.image_embeds ?? out.pooler_output;
        return l2normalize(t.data as Float32Array);
      },
    } satisfies Embedder;
  })();
  pending.catch(() => {
    pending = null;
  });
  return pending;
}
