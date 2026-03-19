import { NextResponse } from "next/server";
import { addAgent, getAgents } from "@/lib/store";
import { getBalance } from "@/lib/locus";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skills = url.searchParams.get("skills")?.split(",").filter(Boolean);
  const agents = getAgents(skills ? { skills } : undefined);
  return NextResponse.json({ agents, total: agents.length });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, description, skills, rate } = body;

  if (!name || !skills?.length) {
    return NextResponse.json(
      { error: "name and skills are required" },
      { status: 400 }
    );
  }

  let walletAddress = "";
  try {
    const bal = await getBalance();
    walletAddress = bal.walletAddress;
  } catch {
    walletAddress = `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 40)}`;
  }

  const agent = addAgent({
    name,
    description: description || "",
    skills,
    walletAddress,
    rate: rate || { amount: 1.0, per: "task" },
  });

  return NextResponse.json(agent, { status: 201 });
}
