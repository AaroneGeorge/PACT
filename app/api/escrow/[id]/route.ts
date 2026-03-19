import { NextResponse } from "next/server";
import { getEscrow } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const escrow = getEscrow(id);
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }
  return NextResponse.json(escrow);
}
