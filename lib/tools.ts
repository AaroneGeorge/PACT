// AI SDK tools for PACT agents
import { tool } from "ai";
import { z } from "zod";
import { getBalance, callWrappedAPI } from "./locus";
import {
  addAgent,
  getAgents,
  addJob,
  getJobs,
  getJob,
  addBidToJob,
  updateJob,
  getAgent,
  getStats,
} from "./store";
import { createEscrow, fundEscrow, releaseEscrow } from "./escrow";
import { evaluateDelivery } from "./evaluator";

export const tools = {
  check_balance: tool({
    description:
      "Check the PACT platform USDC wallet balance on Base via Locus",
    inputSchema: z.object({}),
    execute: async () => {
      const data = await getBalance();
      return {
        balance: data.balance,
        walletAddress: data.walletAddress,
        currency: "USDC",
        network: "Base",
      };
    },
  }),

  register_agent: tool({
    description:
      "Register a new agent on the PACT freelance network with skills and rate",
    inputSchema: z.object({
      name: z.string().describe("Agent name"),
      description: z.string().describe("What this agent does"),
      skills: z.array(z.string()).describe("Skill tags like web-scraping, market-research"),
      rateAmount: z.number().describe("Rate in USDC"),
      ratePer: z.enum(["task", "hour"]).describe("Rate unit"),
    }),
    execute: async ({ name, description, skills, rateAmount, ratePer }) => {
      const { walletAddress } = await getBalance();
      const agent = addAgent({
        name,
        description,
        skills,
        walletAddress,
        rate: { amount: rateAmount, per: ratePer },
      });
      return { agent, message: `Agent "${name}" registered with ID ${agent.id}` };
    },
  }),

  search_agents: tool({
    description: "Search for agents by skill on the PACT network",
    inputSchema: z.object({
      skills: z.array(z.string()).describe("Skills to search for"),
    }),
    execute: async ({ skills }) => {
      const agents = getAgents({ skills });
      return {
        count: agents.length,
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          skills: a.skills,
          rate: a.rate,
          reputation: a.reputation,
        })),
      };
    },
  }),

  post_job: tool({
    description:
      "Post a new job on the PACT marketplace that other agents can bid on",
    inputSchema: z.object({
      title: z.string().describe("Job title"),
      description: z.string().describe("Detailed job description"),
      requiredSkills: z.array(z.string()).describe("Required skill tags"),
      budget: z.number().describe("Budget in USDC"),
      deadline: z.string().describe("Deadline as ISO date string"),
      clientAgentId: z.string().describe("Your agent ID"),
    }),
    execute: async ({ title, description, requiredSkills, budget, deadline, clientAgentId }) => {
      const job = addJob({
        title,
        description,
        requiredSkills,
        budget,
        deadline,
        clientAgentId,
      });
      return { job, message: `Job "${title}" posted with ID ${job.id}` };
    },
  }),

  browse_jobs: tool({
    description: "Browse open jobs on the PACT marketplace, optionally filtered by skills",
    inputSchema: z.object({
      skills: z.array(z.string()).optional().describe("Filter by required skills"),
      status: z.string().optional().describe("Filter by status"),
    }),
    execute: async ({ skills, status }) => {
      const jobs = getJobs({ skills, status });
      return {
        count: jobs.length,
        jobs: jobs.map((j) => ({
          id: j.id,
          title: j.title,
          budget: j.budget,
          requiredSkills: j.requiredSkills,
          status: j.status,
          bidCount: j.bids.length,
          deadline: j.deadline,
        })),
      };
    },
  }),

  bid_on_job: tool({
    description: "Place a bid on an open job",
    inputSchema: z.object({
      jobId: z.string().describe("Job ID to bid on"),
      agentId: z.string().describe("Your agent ID"),
      amount: z.number().describe("Bid amount in USDC"),
      estimatedTime: z.string().describe("Estimated completion time"),
      proposal: z.string().describe("How you'll complete the work"),
    }),
    execute: async ({ jobId, agentId, amount, estimatedTime, proposal }) => {
      const bid = addBidToJob(jobId, { agentId, amount, estimatedTime, proposal });
      if (!bid) return { error: "Job not found" };
      return { bid, message: `Bid placed on job ${jobId} for ${amount} USDC` };
    },
  }),

  accept_bid: tool({
    description:
      "Accept a bid on your job, creating an escrow and locking funds",
    inputSchema: z.object({
      jobId: z.string().describe("Job ID"),
      bidId: z.string().describe("Bid ID to accept"),
    }),
    execute: async ({ jobId, bidId }) => {
      const job = getJob(jobId);
      if (!job) return { error: "Job not found" };
      const bid = job.bids.find((b) => b.id === bidId);
      if (!bid) return { error: "Bid not found" };

      // Mark bid as accepted, others as rejected
      job.bids.forEach((b) => {
        b.status = b.id === bidId ? "accepted" : "rejected";
      });

      // Create and fund escrow
      const escrow = await createEscrow(
        jobId,
        job.clientAgentId,
        bid.agentId,
        bid.amount
      );
      const fundResult = await fundEscrow(escrow.id);

      updateJob(jobId, { freelancerAgentId: bid.agentId, escrowId: escrow.id });

      return {
        escrow,
        funded: fundResult.success,
        message: `Bid accepted. ${bid.amount} USDC escrowed for ${bid.agentId}`,
      };
    },
  }),

  deliver_work: tool({
    description: "Submit completed work for a job you were hired for",
    inputSchema: z.object({
      jobId: z.string().describe("Job ID"),
      agentId: z.string().describe("Your agent ID"),
      artifacts: z
        .array(
          z.object({
            type: z.enum(["text", "json", "url", "file"]),
            content: z.string(),
          })
        )
        .describe("Delivery artifacts"),
      notes: z.string().describe("Delivery notes"),
    }),
    execute: async ({ jobId, agentId, artifacts, notes }) => {
      const job = getJob(jobId);
      if (!job) return { error: "Job not found" };
      if (job.freelancerAgentId !== agentId)
        return { error: "You are not the assigned freelancer" };

      updateJob(jobId, {
        status: "delivered",
        delivery: { jobId, agentId, artifacts, notes, deliveredAt: Date.now() },
      });

      // Auto-trigger evaluation
      const evaluation = await evaluateDelivery(jobId);

      // Auto-release if passed
      if (evaluation.passed && job.escrowId) {
        await releaseEscrow(job.escrowId);
      }

      return {
        evaluation,
        autoReleased: evaluation.passed,
        message: evaluation.passed
          ? `Delivery scored ${evaluation.score}/100 — PASSED. Funds released!`
          : `Delivery scored ${evaluation.score}/100 — below threshold. Dispute window open.`,
      };
    },
  }),

  search_market_news: tool({
    description:
      "Search for recent market news using Exa via Locus (~$0.01 per search)",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      numResults: z.number().optional().default(5),
    }),
    execute: async ({ query, numResults }) => {
      return callWrappedAPI("exa", "search", {
        query,
        numResults,
        type: "neural",
        useAutoprompt: true,
        contents: { text: { maxCharacters: 500 } },
      });
    },
  }),

  get_platform_stats: tool({
    description: "Get PACT marketplace statistics",
    inputSchema: z.object({}),
    execute: async () => getStats(),
  }),
};
