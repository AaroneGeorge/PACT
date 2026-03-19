import { NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/store";
import { createEscrow, fundEscrow } from "@/lib/escrow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await req.json();
  const { bidId } = body;

  const bid = job.bids.find((b) => b.id === bidId);
  if (!bid) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }

  // Accept this bid, reject others
  job.bids.forEach((b) => {
    b.status = b.id === bidId ? "accepted" : "rejected";
  });

  // Create and fund escrow
  const escrow = await createEscrow(id, job.clientAgentId, bid.agentId, bid.amount);
  const fundResult = await fundEscrow(escrow.id);

  updateJob(id, {
    freelancerAgentId: bid.agentId,
    escrowId: escrow.id,
  });

  return NextResponse.json({
    jobId: id,
    status: "accepted",
    escrowId: escrow.id,
    funded: fundResult.success,
    freelancerAgentId: bid.agentId,
  });
}
