export type KeySource = "byok" | "server-dev";

/**
 * BYOK (header) selalu didahulukan. Key server (GEMINI_API_KEY) HANYA dipakai di
 * non-production — untuk uji kamera / UI saat development. Di production tanpa BYOK → null.
 */
export function resolveApiKey(
  headerKey: string | null | undefined,
  env: { GEMINI_API_KEY?: string; NODE_ENV?: string }
): { key: string; source: KeySource } | null {
  const byok = headerKey?.trim();
  if (byok) return { key: byok, source: "byok" };
  const serverKey = env.GEMINI_API_KEY?.trim();
  if (serverKey && env.NODE_ENV !== "production") return { key: serverKey, source: "server-dev" };
  return null;
}
