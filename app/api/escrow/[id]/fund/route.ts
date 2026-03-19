import { NextResponse } from "next/server";
import { fundEscrow } from "@/lib/escrow";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await fundEscrow(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ escrowId: id, status: "funded", escrow: result.escrow });
}
