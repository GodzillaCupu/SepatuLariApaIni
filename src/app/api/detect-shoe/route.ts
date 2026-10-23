import { NextRequest, NextResponse } from "next/server";
import { getAllShoes } from "@/services/shoe.service";
import { handleDetect } from "@/lib/vision/handler";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Body harus JSON" } },
      { status: 400, headers: NO_STORE }
    );
  }

  const outcome = await handleDetect(body, request.headers.get("x-gemini-key"), {
    loadCatalog: async () =>
      (await getAllShoes()).map((s) => ({ id: s.id, brand: s.brand, model: s.model, releaseYear: s.releaseYear })),
    env: { GEMINI_API_KEY: process.env.GEMINI_API_KEY, NODE_ENV: process.env.NODE_ENV },
  });
  return NextResponse.json(outcome.body, { status: outcome.status, headers: NO_STORE });
}
