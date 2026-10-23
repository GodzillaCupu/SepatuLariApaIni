import { NextRequest, NextResponse } from "next/server";
import { getAllShoes } from "@/services/shoe.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const sizing = searchParams.get("sizing") || undefined;
    const breathability = searchParams.get("breathability") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const data = await getAllShoes({ category, brand, sizing, breathability, search, limit });

    return NextResponse.json(
      {
        total: data.length,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/shoes error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sepatu", detail: error?.message },
      { status: 500 }
    );
  }
}
