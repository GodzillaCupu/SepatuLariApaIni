import { DetectRequestSchema, VisionError, type Detection } from "./schema";
import { resolveApiKey, type KeySource } from "./key";
import { detectShoeWithGemini } from "./gemini";
import { matchShoe, type CatalogEntry, type MatchResult } from "./match-shoe";

export interface DetectDeps {
  loadCatalog: () => Promise<CatalogEntry[]>;
  env: { GEMINI_API_KEY?: string; NODE_ENV?: string };
  fetchImpl?: typeof fetch;
}

export interface DetectOk {
  detection: Detection;
  match: MatchResult;
  keySource: KeySource;
}

export type DetectOutcome =
  | { status: 200; body: DetectOk }
  | { status: number; body: { error: { code: string; message: string } } };

const fail = (status: number, code: string, message: string): DetectOutcome => ({
  status,
  body: { error: { code, message } },
});

/** Logika POST /api/detect-shoe tanpa Next.js → mudah dites. Key tidak pernah dilog. */
export async function handleDetect(
  rawBody: unknown,
  headerKey: string | null,
  deps: DetectDeps
): Promise<DetectOutcome> {
  const key = resolveApiKey(headerKey, deps.env);
  if (!key) {
    return fail(401, "KEY_REQUIRED", "Masukkan API key Gemini di Pengaturan AI untuk memakai Scan.");
  }

  const parsed = DetectRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return fail(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Permintaan tidak valid");
  }

  try {
    const detection = await detectShoeWithGemini({
      apiKey: key.key,
      image: parsed.data.image,
      mimeType: parsed.data.mimeType,
      fetchImpl: deps.fetchImpl,
    });
    const match = matchShoe(detection, await deps.loadCatalog());
    return { status: 200, body: { detection, match, keySource: key.source } };
  } catch (err) {
    if (err instanceof VisionError) return fail(err.status, err.code, err.message);
    return fail(500, "UPSTREAM", "Terjadi kesalahan saat memproses foto.");
  }
}
