/**
 * Pembungkus model embedding gambar (Node, transformers.js) untuk script build/eval.
 * Preprocess = bawaan model (resize + center-crop), sama dengan yang dipakai klien nanti.
 */
import { l2normalize } from "../../src/lib/vision/ondevice/vector";

export interface EmbedModelSpec {
  /** Nama pendek untuk CLI/laporan. */
  name: string;
  /** Repo di HuggingFace (versi ONNX untuk transformers.js). */
  repo: string;
  dtype: "q8" | "fp16" | "fp32";
}

export const MODELS: Record<string, EmbedModelSpec> = {
  clip: { name: "clip", repo: "Xenova/clip-vit-base-patch32", dtype: "q8" },
  dinov2: { name: "dinov2", repo: "Xenova/dinov2-small", dtype: "q8" },
  siglip: { name: "siglip", repo: "Xenova/siglip-base-patch16-224", dtype: "q8" },
};

export interface ImageEmbedder {
  spec: EmbedModelSpec;
  dim: number;
  /** `source` = path file / URL / Buffer-blob. Hasil ter-L2-normalisasi. */
  embed(source: string | Blob): Promise<Float32Array>;
}

export async function loadEmbedder(modelName: string): Promise<ImageEmbedder> {
  const spec = MODELS[modelName];
  if (!spec) throw new Error(`Model tidak dikenal: ${modelName} (pilih: ${Object.keys(MODELS).join(", ")})`);
  const { AutoProcessor, CLIPVisionModelWithProjection, SiglipVisionModel, AutoModel, RawImage } = await import(
    "@huggingface/transformers"
  );
  const processor = await AutoProcessor.from_pretrained(spec.repo);
  const opts = { dtype: spec.dtype } as const;
  const model =
    spec.name === "clip"
      ? await CLIPVisionModelWithProjection.from_pretrained(spec.repo, opts)
      : spec.name === "siglip"
      ? await SiglipVisionModel.from_pretrained(spec.repo, opts)
      : await AutoModel.from_pretrained(spec.repo, opts);

  let dim = 0;
  return {
    spec,
    get dim() {
      return dim;
    },
    async embed(source) {
      const image = typeof source === "string" ? await RawImage.read(source) : await RawImage.fromBlob(source);
      const inputs = await processor(image);
      const out: any = await model(inputs);
      // clip/siglip → image_embeds | pooler_output; dinov2 → CLS token dari last_hidden_state
      const t = out.image_embeds ?? out.pooler_output ?? out.last_hidden_state;
      const data = t.dims.length === 3 ? (t.data as Float32Array).slice(0, t.dims[2]) : (t.data as Float32Array);
      dim = data.length;
      return l2normalize(data);
    },
  };
}
