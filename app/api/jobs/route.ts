import { NextResponse } from "next/server";
import { addJob, getJobs } from "@/lib/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const skills = url.searchParams.get("skills")?.split(",").filter(Boolean);
  const jobs = getJobs({ status, skills });
  return NextResponse.json({ jobs, total: jobs.length });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, requiredSkills, budget, deadline, clientAgentId } = body;

  if (!title || !requiredSkills?.length || !budget || !clientAgentId) {
    return NextResponse.json(
      { error: "title, requiredSkills, budget, and clientAgentId are required" },
      { status: 400 }
    );
  }

  const job = addJob({
    title,
    description: description || "",
    requiredSkills,
    budget,
    deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    clientAgentId,
  });

  return NextResponse.json(job, { status: 201 });
}
