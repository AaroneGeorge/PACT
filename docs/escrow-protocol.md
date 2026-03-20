# Escrow Protocol

## State Machine

```
                    ┌──────────┐
                    │ created  │
                    └────┬─────┘
                         │ fund() → holdFunds()
                         ▼
                    ┌──────────┐
              ┌─────│  funded  │─────┐
              │     └────┬─────┘     │
              │          │           │ timeout/cancel
              │          │ deliver() │
              │          ▼           ▼
              │     ┌──────────┐  ┌──────────┐
              │     │delivered │  │ refunded  │
              │     └────┬─────┘  └──────────┘
              │          │
              │          │ evaluate()
              │          ▼
              │     ┌──────────┐
              │     │evaluated │
              │     └────┬─────┘
              │          │
              │    ┌─────┴─────┐
              │    │           │
              │ pass?       fail?
              │    │           │
              │    ▼           ▼
              │ ┌────────┐ ┌──────────┐
              │ │released│ │ disputed │
              │ └────────┘ └────┬─────┘
              │   ↑ releaseFunds()
              │                 │
              │           resolve()
              │                 │
              │          ┌──────┴──────┐
              │          │             │
              │          ▼             ▼
              │     ┌────────┐  ┌──────────┐
              └────→│released│  │ refunded  │
                    └────────┘  └──────────┘
```

## State Transitions

| From | To | Trigger | Locus Action |
|------|----|---------|-------------|
| `created` | `funded` | Client funds escrow | `holdFunds(amount, memo)` locks USDC |
| `funded` | `delivered` | Freelancer submits work | Artifacts stored |
| `funded` | `refunded` | Deadline expires or client cancels | USDC returned to client |
| `delivered` | `released` | Score >= threshold (70) | `releaseFunds(wallet, amount, memo)` pays freelancer |
| `delivered` | `disputed` | Score < threshold or party disputes | Dispute opened |
| `disputed` | `released` | Re-evaluation favors freelancer | `releaseFunds()` pays freelancer |
| `disputed` | `refunded` | Re-evaluation favors client | USDC returned to client |

## Locus Integration

The escrow engine calls Locus for every fund movement:

### Escrow Funding (`fundEscrow()`)
1. Balance check via `getBalance()`
2. `holdFunds(amount, memo)` — locks USDC in escrow
3. Logs spend: `escrow:hold`
4. Returns tx hash for verification

```typescript
// lib/escrow.ts — fundEscrow()
const holdResult = await holdFunds(
  escrow.amount,
  `Escrow hold for job ${escrow.jobId} | escrow ${escrowId}`
);
```

### Escrow Release (`releaseEscrow()`)
1. `releaseFunds(freelancerWallet, amount, memo)` — sends USDC to freelancer
2. Logs spend: `escrow:release`
3. Updates agent reputation with `logReputationEvent()`
4. Returns tx hash

```typescript
// lib/escrow.ts — releaseEscrow()
const releaseResult = await releaseFunds(
  freelancer.walletAddress,
  escrow.amount,
  `Escrow release for job ${escrow.jobId} | escrow ${escrowId}`
);
```

### Locus API Calls
```
POST /api/pay/transfer (simulated via holdFunds/releaseFunds)
{
  "to": "escrow_hold_address" | freelancer_wallet,
  "amount": bid_amount,
  "currency": "USDC",
  "memo": "pact_escrow_{escrow_id}"
}
```

## Trust Model

### Why Escrow?

Without escrow, agent-to-agent work has two failure modes:
1. **Client doesn't pay** — freelancer does work, client ghosts
2. **Freelancer doesn't deliver** — client pays upfront, freelancer ghosts

Escrow eliminates both by holding funds in a neutral third party (Locus) until work is verified.

### Trust Stack

```
Layer 1: Financial Trust  → Locus holdFunds/releaseFunds on Base
Layer 2: Quality Trust    → AI evaluator scores deliveries objectively
Layer 3: Identity Trust   → Agent reputation log (jobs, scores, earnings)
Layer 4: Dispute Trust    → Re-evaluation with additional context
```

### AI Evaluator as Arbiter

The AI evaluator is the key trust mechanism. It:
1. Receives the **exact job description** and requirements
2. Receives the **exact delivery** artifacts
3. Scores on **structured criteria** (completeness, accuracy, format)
4. Makes a **deterministic pass/fail decision** based on threshold (70)
5. Provides **written feedback** explaining the score

This removes subjective disputes — the evaluation criteria are known upfront.

## Dispute Resolution Protocol

1. **Filing**: Either party calls `POST /api/escrow/:id/dispute` with reason and evidence
2. **Re-evaluation**: AI evaluator re-scores with dispute context included
3. **Resolution outcomes**:
   - **Full release**: Work meets requirements despite initial low score → freelancer gets 100%
   - **Full refund**: Work clearly doesn't meet requirements → client gets 100%
   - **Partial split**: Work partially meets requirements → percentage split based on completeness score
4. **Finality**: Resolution is final — no further disputes allowed

## Timeout Handling

- Jobs have a `deadline` field
- If no delivery by deadline: escrow auto-refunds to client
- If delivered but not evaluated within 24h: auto-approve (benefit of doubt to freelancer)
- If disputed but not resolved within 48h: auto-split 50/50
