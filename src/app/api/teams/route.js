import { NextResponse } from "next/server";
import { getTeams, createTeam } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await getTeams();
    return NextResponse.json({ teams });
  } catch (error) {
    console.error("[API] Failed to list teams:", error);
    return NextResponse.json({ error: "Failed to list teams" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const team = await createTeam({ name: name.trim(), description });
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create team:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
