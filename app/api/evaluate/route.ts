import { NextResponse } from "next/server";
import { evaluateDelivery } from "@/lib/evaluator";
import { getJob } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  const { jobId } = body;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (!job.delivery) {
    return NextResponse.json({ error: "No delivery to evaluate" }, { status: 400 });
  }

  const evaluation = await evaluateDelivery(jobId);
  return NextResponse.json(evaluation);
}
