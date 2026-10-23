import { Detection, DetectionSchema, VisionError } from "./schema";

export const GEMINI_MODEL = "gemini-3.5-flash";
const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const PROMPT = `Kamu pakar sepatu lari. Identifikasi merek dan model SEPATU LARI pada foto.
Langkah:
1. Baca semua teks/logo yang terlihat (lidah, tumit, sisi upper, sol, insole) dan tulis di visibleText (null bila tidak ada yang terbaca).
2. Tentukan brand dari logo/teks (nama resmi, mis. "ASICS", "New Balance").
3. Tentukan model: pakai teks yang terbaca lebih dulu; baru siluet, bentuk midsole, dan detail upper. Bedakan model yang mirip, mis. Novablast vs Superblast vs Metaspeed, atau SuperComp Rebel vs SuperComp Trainer vs SuperComp Elite.
Aturan: model tanpa nama brand (mis. "Superblast 3"). Isi angka versi HANYA bila terbaca jelas pada sepatu atau kamu benar-benar yakin; jika tidak, tulis nama model tanpa versi. releaseYear hanya bila yakin, selain itu null. colorway singkat atau null.
Beri jawaban terbaikmu; turunkan confidence (0-1) bila hanya mengandalkan siluet. Isi brand dan model "unknown" hanya jika foto jelas bukan sepatu lari. reasoning: satu kalimat alasan.`;

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
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              brand: { type: "STRING" },
              model: { type: "STRING" },
              releaseYear: { type: "INTEGER", nullable: true },
              colorway: { type: "STRING", nullable: true },
              visibleText: { type: "STRING", nullable: true },
              reasoning: { type: "STRING", nullable: true },
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
    // Dev saja: lihat jawaban mentah model (tanpa key/gambar) untuk diagnosa akurasi.
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      console.log("[vision] Gemini:", model, text);
    }
    return parsed.data;
  } catch {
    throw new VisionError("BAD_RESPONSE", "Jawaban Gemini tidak bisa dibaca. Coba foto lain.", 502);
  }
}
