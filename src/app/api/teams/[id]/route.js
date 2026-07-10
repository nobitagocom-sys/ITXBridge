import { NextResponse } from "next/server";
import { getTeamById, updateTeam, deleteTeam } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const team = await getTeamById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    return NextResponse.json({ team });
  } catch (error) {
    console.error("[API] Failed to get team:", error);
    return NextResponse.json({ error: "Failed to get team" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body || {};

    const team = await updateTeam(id, { name, description });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    return NextResponse.json({ team });
  } catch (error) {
    console.error("[API] Failed to update team:", error);
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    await deleteTeam(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to delete team:", error);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
