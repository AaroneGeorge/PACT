import { NextResponse } from "next/server";
import { disputeEscrow, resolveDispute } from "@/lib/escrow";
import { getEscrow } from "@/lib/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const escrow = getEscrow(id);
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  const body = await req.json();

  // If escrow is already disputed and we have a resolution, resolve it
  if (escrow.status === "disputed" && body.resolution) {
    const result = await resolveDispute(id, body.resolution, body.splitPercent);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      escrowId: id,
      status: "resolved",
      resolution: body.resolution,
      escrow: result.escrow,
    });
  }

  // Otherwise, open a dispute
  const result = await disputeEscrow(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    escrowId: id,
    status: "disputed",
    reason: body.reason || "",
  });
}
