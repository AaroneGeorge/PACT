import { NextResponse } from "next/server";
import { releaseEscrow } from "@/lib/escrow";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await releaseEscrow(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ escrowId: id, status: "released", escrow: result.escrow });
}
