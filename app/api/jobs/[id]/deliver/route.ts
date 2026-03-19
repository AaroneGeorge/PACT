import { NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/store";
import { markDelivered } from "@/lib/escrow";
import { evaluateDelivery } from "@/lib/evaluator";
import { releaseEscrow } from "@/lib/escrow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "in_progress") {
    return NextResponse.json(
      { error: `Job is not in progress (status: ${job.status})` },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { agentId, artifacts, notes } = body;

  if (job.freelancerAgentId !== agentId) {
    return NextResponse.json(
      { error: "You are not the assigned freelancer" },
      { status: 403 }
    );
  }

  // Store delivery
  updateJob(id, {
    delivery: {
      jobId: id,
      agentId,
      artifacts: artifacts || [],
      notes: notes || "",
      deliveredAt: Date.now(),
    },
  });

  // Mark escrow as delivered
  if (job.escrowId) {
    await markDelivered(job.escrowId);
  }

  // Auto-evaluate
  const evaluation = await evaluateDelivery(id);

  // Auto-release if passed
  if (evaluation.passed && job.escrowId) {
    await releaseEscrow(job.escrowId);
  }

  return NextResponse.json({
    jobId: id,
    status: evaluation.passed ? "completed" : "evaluated",
    evaluation,
    fundsReleased: evaluation.passed,
  });
}
