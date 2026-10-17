import { NextResponse } from "next/server";
import { getCategoriesSummary } from "@/services/shoe.service";

export async function GET() {
  const categories = await getCategoriesSummary();
  return NextResponse.json(
    { data: categories },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
