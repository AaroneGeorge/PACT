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
  const [skillFilter, setSkillFilter] = useState("");
  const [activeSkills, setActiveSkills] = useState<string[]>([]);

  useEffect(() => {
    const params = activeSkills.length
      ? `?skills=${activeSkills.join(",")}`
      : "";
    fetch(`/api/agents${params}`)
      .then((r) => r.json())
      .then((d) => {
        setAgents(d.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeSkills]);

  // Collect all unique skills from agents for chip suggestions
  const allSkills = Array.from(new Set(agents.flatMap((a) => a.skills)));

  function addSkillFilter(skill: string) {
    const s = skill.trim().toLowerCase();
    if (s && !activeSkills.includes(s)) {
      setActiveSkills([...activeSkills, s]);
    }
    setSkillFilter("");
  }

  function removeSkillFilter(skill: string) {
    setActiveSkills(activeSkills.filter((s) => s !== skill));
  }

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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Agent Directory</h2>
          <span className="text-xs text-muted font-mono bg-card border border-card-border px-3 py-1.5 rounded-lg">
            Register via Skill File
          </span>
        </div>

        {/* Skill Filter */}
        <div className="mb-6 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSkillFilter(skillFilter);
              }}
              className="bg-card border border-card-border rounded-lg px-3 py-1.5 text-sm font-mono flex-1 focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => addSkillFilter(skillFilter)}
              className="bg-accent/20 text-accent px-3 py-1.5 rounded-lg text-sm font-mono hover:bg-accent/30 transition"
            >
              Add
            </button>
          </div>
          {activeSkills.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {activeSkills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => removeSkillFilter(skill)}
                  className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-mono hover:bg-accent/30 transition flex items-center gap-1"
                >
                  {skill} <span className="opacity-60">x</span>
                </button>
              ))}
              <button
                onClick={() => setActiveSkills([])}
                className="text-xs text-muted hover:text-foreground transition"
              >
                Clear all
              </button>
            </div>
          )}
          {activeSkills.length === 0 && allSkills.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-muted">Popular:</span>
              {allSkills.slice(0, 8).map((skill) => (
                <button
                  key={skill}
                  onClick={() => addSkillFilter(skill)}
                  className="text-xs bg-card border border-card-border text-muted px-2 py-0.5 rounded font-mono hover:text-accent hover:border-accent/30 transition"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
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
  const rep = agent.reputation;
  const hasReputation = rep.jobsCompleted > 0;

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

      {/* Enhanced Reputation Section */}
      <div className="border-t border-card-border pt-3 mt-3">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Reputation
          </span>
          {hasReputation && (
            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono ml-auto">
              Verified
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold font-mono">{rep.jobsCompleted}</div>
            <div className="text-xs text-muted">Jobs</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold font-mono ${rep.avgScore >= 70 ? "text-green-400" : rep.avgScore > 0 ? "text-yellow-400" : "text-muted"}`}>
              {rep.avgScore > 0 ? rep.avgScore : "--"}
            </div>
            <div className="text-xs text-muted">Score</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-accent">
              {rep.totalEarned > 0 ? `$${rep.totalEarned.toFixed(2)}` : "--"}
            </div>
            <div className="text-xs text-muted">Earned</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted font-mono">
        {agent.id} | {agent.walletAddress.slice(0, 10)}...
      </div>
    </div>
  );
}
