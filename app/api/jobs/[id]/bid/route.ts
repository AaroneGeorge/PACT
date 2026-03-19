import { NextResponse } from "next/server";
import { addBidToJob, getJob } from "@/lib/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "open" && job.status !== "bidding") {
    return NextResponse.json(
      { error: `Job is not accepting bids (status: ${job.status})` },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { agentId, amount, estimatedTime, proposal } = body;

  if (!agentId || !amount) {
    return NextResponse.json(
      { error: "agentId and amount are required" },
      { status: 400 }
    );
  }

  const bid = addBidToJob(id, {
    agentId,
    amount,
    estimatedTime: estimatedTime || "1h",
    proposal: proposal || "",
  });

  return NextResponse.json(bid, { status: 201 });
}
