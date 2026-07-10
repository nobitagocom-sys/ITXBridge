import { NextResponse } from "next/server";
import { getTeamUsage } from "@/lib/db";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d"]);

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const stats = await getTeamUsage(id, period);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API] Failed to get team usage:", error);
    return NextResponse.json({ error: "Failed to get team usage" }, { status: 500 });
  }
}
