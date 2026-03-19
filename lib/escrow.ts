// Escrow state machine for PACT
import {
  addEscrow,
  getEscrow,
  updateEscrow,
  getJob,
  updateJob,
  updateAgentReputation,
  type Escrow,
} from "./store";
import { getBalance } from "./locus";

export type EscrowAction =
  | "fund"
  | "deliver"
  | "release"
  | "refund"
  | "dispute"
  | "resolve";

const VALID_TRANSITIONS: Record<string, EscrowAction[]> = {
  created: ["fund"],
  funded: ["deliver", "refund"],
  delivered: ["release", "dispute"],
  released: [],
  refunded: [],
  disputed: ["resolve"],
  resolved: [],
};

function canTransition(escrow: Escrow, action: EscrowAction): boolean {
  return VALID_TRANSITIONS[escrow.status]?.includes(action) ?? false;
}

export async function createEscrow(
  jobId: string,
  clientAgentId: string,
  freelancerAgentId: string,
  amount: number
): Promise<Escrow> {
  const escrow = addEscrow({ jobId, clientAgentId, freelancerAgentId, amount });
  updateJob(jobId, { escrowId: escrow.id, status: "accepted" });
  return escrow;
}

export async function fundEscrow(escrowId: string): Promise<{
  success: boolean;
  escrow?: Escrow;
  error?: string;
}> {
  const escrow = getEscrow(escrowId);
  if (!escrow) return { success: false, error: "Escrow not found" };
  if (!canTransition(escrow, "fund"))
    return { success: false, error: `Cannot fund escrow in status: ${escrow.status}` };

  // Verify client has enough balance
  try {
    const { balance } = await getBalance();
    if (balance < escrow.amount) {
      return { success: false, error: `Insufficient balance: ${balance} USDC < ${escrow.amount} USDC` };
    }
  } catch {
    // In hackathon mode, proceed even if balance check fails
  }

  const updated = updateEscrow(escrowId, {
    status: "funded",
    fundedAt: Date.now(),
  });
  updateJob(escrow.jobId, { status: "in_progress" });

  return { success: true, escrow: updated };
}

export async function markDelivered(escrowId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const escrow = getEscrow(escrowId);
  if (!escrow) return { success: false, error: "Escrow not found" };
  if (!canTransition(escrow, "deliver"))
    return { success: false, error: `Cannot mark delivered in status: ${escrow.status}` };

  updateEscrow(escrowId, { status: "delivered" });
  updateJob(escrow.jobId, { status: "delivered" });
  return { success: true };
}

export async function releaseEscrow(escrowId: string): Promise<{
  success: boolean;
  escrow?: Escrow;
  error?: string;
}> {
  const escrow = getEscrow(escrowId);
  if (!escrow) return { success: false, error: "Escrow not found" };
  if (!canTransition(escrow, "release"))
    return { success: false, error: `Cannot release escrow in status: ${escrow.status}` };

  const updated = updateEscrow(escrowId, {
    status: "released",
    releasedAt: Date.now(),
  });

  // Update job and freelancer reputation
  const job = getJob(escrow.jobId);
  if (job) {
    updateJob(escrow.jobId, { status: "completed" });
    if (job.evaluation) {
      updateAgentReputation(
        escrow.freelancerAgentId,
        job.evaluation.score,
        escrow.amount
      );
    }
  }

  return { success: true, escrow: updated };
}

export async function refundEscrow(escrowId: string): Promise<{
  success: boolean;
  escrow?: Escrow;
  error?: string;
}> {
  const escrow = getEscrow(escrowId);
  if (!escrow) return { success: false, error: "Escrow not found" };
  if (!canTransition(escrow, "refund"))
    return { success: false, error: `Cannot refund escrow in status: ${escrow.status}` };

  const updated = updateEscrow(escrowId, { status: "refunded" });
  updateJob(escrow.jobId, { status: "cancelled" });

  return { success: true, escrow: updated };
}

export async function disputeEscrow(escrowId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const escrow = getEscrow(escrowId);
  if (!escrow) return { success: false, error: "Escrow not found" };
  if (!canTransition(escrow, "dispute"))
    return { success: false, error: `Cannot dispute escrow in status: ${escrow.status}` };

  updateEscrow(escrowId, { status: "disputed" });
  updateJob(escrow.jobId, { status: "disputed" });
  return { success: true };
}

export async function resolveDispute(
  escrowId: string,
  resolution: "release" | "refund" | "split",
  splitPercent?: number
): Promise<{
  success: boolean;
  escrow?: Escrow;
  error?: string;
}> {
  const escrow = getEscrow(escrowId);
  if (!escrow) return { success: false, error: "Escrow not found" };
  if (!canTransition(escrow, "resolve"))
    return { success: false, error: `Cannot resolve escrow in status: ${escrow.status}` };

  if (resolution === "release") {
    return releaseEscrowForced(escrowId);
  } else if (resolution === "refund") {
    const updated = updateEscrow(escrowId, { status: "refunded" });
    updateJob(escrow.jobId, { status: "cancelled" });
    return { success: true, escrow: updated };
  } else {
    // Split — mark as resolved, partial payment
    const updated = updateEscrow(escrowId, { status: "resolved" });
    const job = getJob(escrow.jobId);
    if (job) {
      updateJob(escrow.jobId, { status: "completed" });
      const pct = splitPercent ?? 50;
      updateAgentReputation(
        escrow.freelancerAgentId,
        job.evaluation?.score ?? 50,
        escrow.amount * (pct / 100)
      );
    }
    return { success: true, escrow: updated };
  }
}

async function releaseEscrowForced(escrowId: string): Promise<{
  success: boolean;
  escrow?: Escrow;
  error?: string;
}> {
  const escrow = getEscrow(escrowId);
  if (!escrow) return { success: false, error: "Escrow not found" };

  const updated = updateEscrow(escrowId, {
    status: "released",
    releasedAt: Date.now(),
  });

  const job = getJob(escrow.jobId);
  if (job) {
    updateJob(escrow.jobId, { status: "completed" });
    updateAgentReputation(
      escrow.freelancerAgentId,
      job.evaluation?.score ?? 70,
      escrow.amount
    );
  }

  return { success: true, escrow: updated };
}
