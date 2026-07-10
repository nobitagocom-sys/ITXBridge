import { NextResponse } from "next/server";
import { removeTeamMember } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_request, { params }) {
  try {
    const { memberId } = await params;
    await removeTeamMember(memberId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to remove member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
