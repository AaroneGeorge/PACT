// Locus payment infrastructure wrapper — adapted from alpha-agent
import { logSpend } from "./store";

const BASE_URL = "https://beta-api.paywithlocus.com/api";
const API_KEY = process.env.LOCUS_API_KEY!;

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function getBalance(): Promise<{
  balance: number;
  walletAddress: string;
}> {
  const res = await fetch(`${BASE_URL}/pay/balance`, { headers: headers() });
  if (!res.ok)
    throw new Error(`Locus balance error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getTransactions(limit = 10) {
  const res = await fetch(`${BASE_URL}/pay/transactions?limit=${limit}`, {
    headers: headers(),
  });
  if (!res.ok)
    throw new Error(`Locus transactions error: ${res.status}`);
  return res.json();
}

export async function callWrappedAPI(
  provider: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/wrapped/${provider}/${endpoint}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Locus wrapped API error (${provider}/${endpoint}): ${res.status} ${text}`
    );
  }
  const data = await res.json();

  const cost = provider === "exa" ? 0.01 : provider === "firecrawl" ? 0.05 : 0.01;
  logSpend(`wrapped:${provider}`, cost, `${provider}/${endpoint}`);

  return data;
}

export async function getX402Endpoints(): Promise<string> {
  const res = await fetch(`${BASE_URL}/x402/endpoints/md`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Locus x402 error: ${res.status}`);
  return res.text();
}

// Escrow-specific Locus operations
// In production, these would use Locus transfer API
// For hackathon, we simulate the hold/release pattern

export async function holdFunds(
  amount: number,
  memo: string
): Promise<{ success: boolean; txHash?: string }> {
  // Simulate escrow hold via Locus
  // In production: POST /api/pay/transfer to escrow hold address
  logSpend("escrow:hold", amount, memo);
  return {
    success: true,
    txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
  };
}

export async function releaseFunds(
  toWallet: string,
  amount: number,
  memo: string
): Promise<{ success: boolean; txHash?: string }> {
  // Simulate escrow release via Locus
  logSpend("escrow:release", 0, `${memo} → ${toWallet} (${amount} USDC)`);
  return {
    success: true,
    txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
  };
}
