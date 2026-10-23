import { Detection, DetectionSchema, VisionError } from "./schema";

export const GEMINI_MODEL = "gemini-2.5-flash";
const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const PROMPT = `Kamu pakar sepatu lari. Identifikasi merek dan model SEPATU LARI pada foto (siluet, logo, teks pada lidah/sol/insole, warna).
Jawab JSON: brand (nama resmi, mis. "ASICS", "New Balance"), model (tanpa nama brand, mis. "Novablast 4"), releaseYear (tahun rilis bila yakin, selain itu null), colorway (singkat, atau null), confidence (0-1).
Jika foto bukan sepatu lari atau kamu tidak yakin, isi brand "unknown", model "unknown", confidence rendah. Jangan menebak.`;

interface Options {
  apiKey: string;
  image: string; // base64 tanpa prefix data:
  mimeType: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export async function detectShoeWithGemini(opts: Options): Promise<Detection> {
  const { apiKey, image, mimeType, model = GEMINI_MODEL, timeoutMs = 20_000, fetchImpl = fetch } = opts;

  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: image } }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              brand: { type: "STRING" },
              model: { type: "STRING" },
              releaseYear: { type: "INTEGER", nullable: true },
              colorway: { type: "STRING", nullable: true },
              confidence: { type: "NUMBER" },
            },
            required: ["brand", "model", "confidence"],
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new VisionError("TIMEOUT", "Gemini terlalu lama merespons. Coba lagi.", 504);
    }
    throw new VisionError("UPSTREAM", "Tidak bisa menghubungi Gemini.", 502);
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new VisionError("KEY_INVALID", "API key Gemini ditolak. Periksa key di Pengaturan AI.", 401);
    }
    if (res.status === 429) {
      throw new VisionError("QUOTA", "Kuota Gemini habis atau terlalu banyak permintaan. Coba lagi nanti.", 429);
    }
    throw new VisionError("UPSTREAM", `Gemini error (${res.status}).`, 502);
  }

  let text: string | undefined;
  try {
    const json = await res.json();
    text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("kosong");
    const parsed = DetectionSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error("skema");
    return parsed.data;
  } catch {
    throw new VisionError("BAD_RESPONSE", "Jawaban Gemini tidak bisa dibaca. Coba foto lain.", 502);
  }
}
