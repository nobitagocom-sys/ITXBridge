import { NextResponse } from "next/server";
import { getTeamMembers, addTeamMember } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const members = await getTeamMembers(id);
    return NextResponse.json({ members });
  } catch (error) {
    console.error("[API] Failed to list members:", error);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { memberKey, memberType, memberName } = body || {};

    if (!memberKey || typeof memberKey !== "string" || !memberKey.trim()) {
      return NextResponse.json({ error: "memberKey is required" }, { status: 400 });
    }
    if (!memberType || !["apikey", "connection"].includes(memberType)) {
      return NextResponse.json({ error: "memberType must be 'apikey' or 'connection'" }, { status: 400 });
    }

    const member = await addTeamMember({
      teamId: id,
      memberKey: memberKey.trim(),
      memberType,
      memberName: memberName || null,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    console.error("[API] Failed to add member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
