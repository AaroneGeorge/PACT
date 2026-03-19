// In-memory data store for PACT
// For hackathon — production would use a database

export interface Agent {
  id: string;
  name: string;
  description: string;
  skills: string[];
  walletAddress: string;
  rate: {
    amount: number;
    per: "task" | "hour";
  };
  reputation: {
    jobsCompleted: number;
    avgScore: number;
    totalEarned: number;
  };
  registeredAt: number;
}

export interface Bid {
  id: string;
  jobId: string;
  agentId: string;
  amount: number;
  estimatedTime: string;
  proposal: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

export interface Delivery {
  jobId: string;
  agentId: string;
  artifacts: Array<{ type: "text" | "json" | "url" | "file"; content: string }>;
  notes: string;
  deliveredAt: number;
}

export interface Evaluation {
  jobId: string;
  score: number;
  passed: boolean;
  criteria: {
    completeness: number;
    accuracy: number;
    formatCompliance: number;
  };
  feedback: string;
  evaluatedAt: number;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  budget: number;
  deadline: string;
  clientAgentId: string;
  freelancerAgentId?: string;
  escrowId?: string;
  status:
    | "open"
    | "bidding"
    | "accepted"
    | "in_progress"
    | "delivered"
    | "evaluated"
    | "completed"
    | "disputed"
    | "cancelled";
  bids: Bid[];
  delivery?: Delivery;
  evaluation?: Evaluation;
  createdAt: number;
  updatedAt: number;
}

export interface Escrow {
  id: string;
  jobId: string;
  clientAgentId: string;
  freelancerAgentId: string;
  amount: number;
  status: "created" | "funded" | "delivered" | "released" | "refunded" | "disputed" | "resolved";
  fundedAt?: number;
  releasedAt?: number;
  createdAt: number;
}

export interface SpendLog {
  tool: string;
  cost: number;
  timestamp: number;
  detail: string;
}

// Storage
const agents: Agent[] = [];
const jobs: Job[] = [];
const escrows: Escrow[] = [];
const spending: SpendLog[] = [];

// Agent operations
export function addAgent(agent: Omit<Agent, "id" | "reputation" | "registeredAt">): Agent {
  const entry: Agent = {
    ...agent,
    id: `agent_${crypto.randomUUID().slice(0, 8)}`,
    reputation: { jobsCompleted: 0, avgScore: 0, totalEarned: 0 },
    registeredAt: Date.now(),
  };
  agents.push(entry);
  return entry;
}

export function getAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

export function getAgents(filter?: { skills?: string[] }): Agent[] {
  let result = [...agents];
  if (filter?.skills?.length) {
    result = result.filter((a) =>
      filter.skills!.some((s) => a.skills.includes(s))
    );
  }
  return result;
}

export function updateAgentReputation(
  id: string,
  score: number,
  earned: number
) {
  const agent = agents.find((a) => a.id === id);
  if (!agent) return;
  const rep = agent.reputation;
  const total = rep.jobsCompleted * rep.avgScore + score;
  rep.jobsCompleted += 1;
  rep.avgScore = Math.round(total / rep.jobsCompleted);
  rep.totalEarned += earned;
}

// Job operations
export function addJob(
  job: Omit<Job, "id" | "status" | "bids" | "createdAt" | "updatedAt">
): Job {
  const entry: Job = {
    ...job,
    id: `job_${crypto.randomUUID().slice(0, 8)}`,
    status: "open",
    bids: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.push(entry);
  return entry;
}

export function getJob(id: string): Job | undefined {
  return jobs.find((j) => j.id === id);
}

export function getJobs(filter?: {
  status?: string;
  skills?: string[];
}): Job[] {
  let result = [...jobs];
  if (filter?.status) {
    result = result.filter((j) => j.status === filter.status);
  }
  if (filter?.skills?.length) {
    result = result.filter((j) =>
      filter.skills!.some((s) => j.requiredSkills.includes(s))
    );
  }
  return result.reverse();
}

export function updateJob(id: string, update: Partial<Job>): Job | undefined {
  const job = jobs.find((j) => j.id === id);
  if (job) {
    Object.assign(job, update, { updatedAt: Date.now() });
  }
  return job;
}

export function addBidToJob(jobId: string, bid: Omit<Bid, "id" | "jobId" | "status" | "createdAt">): Bid | undefined {
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return undefined;
  const entry: Bid = {
    ...bid,
    id: `bid_${crypto.randomUUID().slice(0, 8)}`,
    jobId,
    status: "pending",
    createdAt: Date.now(),
  };
  job.bids.push(entry);
  if (job.status === "open") job.status = "bidding";
  job.updatedAt = Date.now();
  return entry;
}

// Escrow operations
export function addEscrow(
  escrow: Omit<Escrow, "id" | "status" | "createdAt">
): Escrow {
  const entry: Escrow = {
    ...escrow,
    id: `escrow_${crypto.randomUUID().slice(0, 8)}`,
    status: "created",
    createdAt: Date.now(),
  };
  escrows.push(entry);
  return entry;
}

export function getEscrow(id: string): Escrow | undefined {
  return escrows.find((e) => e.id === id);
}

export function updateEscrow(
  id: string,
  update: Partial<Escrow>
): Escrow | undefined {
  const escrow = escrows.find((e) => e.id === id);
  if (escrow) Object.assign(escrow, update);
  return escrow;
}

// Spending
export function logSpend(tool: string, cost: number, detail: string) {
  spending.push({ tool, cost, timestamp: Date.now(), detail });
}

export function getSpending() {
  return [...spending].reverse();
}

export function getTotalSpent() {
  return spending.reduce((sum, s) => sum + s.cost, 0);
}

// Stats
export function getStats() {
  return {
    totalAgents: agents.length,
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) =>
      ["open", "bidding", "accepted", "in_progress", "delivered"].includes(j.status)
    ).length,
    completedJobs: jobs.filter((j) => j.status === "completed").length,
    totalEscrowVolume: escrows.reduce((sum, e) => sum + e.amount, 0),
  };
}
