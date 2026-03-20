import { NextResponse } from "next/server";
import { getAgent, getReputationLog } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const reputationHistory = getReputationLog(id);

  return NextResponse.json({ ...agent, reputationHistory });
}
