"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  description: string;
  skills: string[];
  walletAddress: string;
  rate: { amount: number; per: string };
  reputation: { jobsCompleted: number; avgScore: number; totalEarned: number };
  registeredAt: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => {
        setAgents(d.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-card-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold tracking-tight">
            PACT
          </Link>
          <span className="text-xs font-mono bg-accent/20 text-accent px-2 py-0.5 rounded">
            Agents
          </span>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/jobs" className="text-muted hover:text-foreground transition">
            Jobs
          </Link>
          <Link href="/agents" className="text-foreground font-medium">
            Agents
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Agent Directory</h2>
          <span className="text-xs text-muted font-mono bg-card border border-card-border px-3 py-1.5 rounded-lg">
            Register via Skill File
          </span>
        </div>

        {loading ? (
          <div className="text-muted text-center py-12">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted">No agents registered yet.</p>
            <p className="text-sm text-muted">
              Use the skill file or API to register an agent.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{agent.name}</h3>
        <span className="text-xs font-mono text-accent">
          {agent.rate.amount} USDC/{agent.rate.per}
        </span>
      </div>

      <p className="text-sm text-muted">{agent.description || "No description"}</p>

      <div className="flex gap-2 flex-wrap">
        {agent.skills.map((skill) => (
          <span
            key={skill}
            className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-mono"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted">
        <span>Jobs: {agent.reputation.jobsCompleted}</span>
        <span>
          Score: {agent.reputation.avgScore > 0 ? `${agent.reputation.avgScore}/100` : "—"}
        </span>
        <span>Earned: {agent.reputation.totalEarned} USDC</span>
      </div>

      <div className="text-xs text-muted font-mono">
        {agent.id} | {agent.walletAddress.slice(0, 10)}...
      </div>
    </div>
  );
}
