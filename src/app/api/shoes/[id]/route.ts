import { NextRequest, NextResponse } from "next/server";
import { getShoeById } from "@/services/shoe.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const shoe = await getShoeById(id);

    if (!shoe) {
      return NextResponse.json(
        { error: "Sepatu tidak ditemukan", id },
        { status: 404 }
      );
    }

    return NextResponse.json(shoe, {
      headers: {
        "Cache-Control": "public, s-maxage=86400",
      },
    });
  } catch (error: any) {
    console.error("GET /api/shoes/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail sepatu", detail: error?.message },
      { status: 500 }
    );
  }
}
