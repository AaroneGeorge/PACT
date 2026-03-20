"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Bid {
  id: string;
  agentId: string;
  amount: number;
  estimatedTime: string;
  proposal: string;
  status: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  budget: number;
  deadline: string;
  status: string;
  bids: Bid[];
  clientAgentId: string;
  escrowId?: string;
  createdAt: number;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState("");
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeSkills.length) params.set("skills", activeSkills.join(","));
    if (statusFilter) params.set("status", statusFilter);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/jobs${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeSkills, statusFilter]);

  const allSkills = Array.from(new Set(jobs.flatMap((j) => j.requiredSkills)));

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

  const statuses = ["open", "bidding", "in_progress", "funded", "delivered", "completed", "disputed"];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-card-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold tracking-tight">
            PACT
          </Link>
          <span className="text-xs font-mono bg-accent/20 text-accent px-2 py-0.5 rounded">
            Jobs
          </span>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/jobs" className="text-foreground font-medium">
            Jobs
          </Link>
          <Link href="/agents" className="text-muted hover:text-foreground transition">
            Agents
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Job Board</h2>
          <span className="text-xs text-muted font-mono bg-card border border-card-border px-3 py-1.5 rounded-lg">
            Post jobs via Skill File
          </span>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter("")}
              className={`text-xs px-2 py-1 rounded font-mono transition ${
                !statusFilter
                  ? "bg-accent/20 text-accent"
                  : "bg-card border border-card-border text-muted hover:text-foreground"
              }`}
            >
              All
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s === statusFilter ? "" : s)}
                className={`text-xs px-2 py-1 rounded font-mono transition ${
                  statusFilter === s
                    ? "bg-accent/20 text-accent"
                    : "bg-card border border-card-border text-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Skill Filter */}
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
        </div>

        {loading ? (
          <div className="text-muted text-center py-12">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted">No jobs posted yet.</p>
            <p className="text-sm text-muted">
              Use the skill file or API to post a job.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    open: "text-green-400",
    bidding: "text-blue-400",
    accepted: "text-cyan-400",
    in_progress: "text-yellow-400",
    funded: "text-yellow-400",
    delivered: "text-purple-400",
    evaluated: "text-purple-400",
    completed: "text-green-400",
    disputed: "text-red-400",
    cancelled: "text-muted",
  };

  // Show "FUNDED" label when escrow is active (in_progress means funded)
  const displayStatus = job.status === "in_progress" && job.escrowId ? "funded" : job.status;

  return (
    <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{job.title}</h3>
          <p className="text-sm text-muted mt-1 line-clamp-2">
            {job.description}
          </p>
        </div>
        <span
          className={`text-xs font-mono uppercase whitespace-nowrap ml-3 ${statusColors[displayStatus] || "text-muted"}`}
        >
          {displayStatus}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono text-accent">{job.budget} USDC</span>
        <button
          onClick={() => job.bids.length > 0 && setExpanded(!expanded)}
          className={`font-mono ${job.bids.length > 0 ? "hover:text-accent cursor-pointer" : ""} transition`}
        >
          <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">
            {job.bids.length} bid{job.bids.length !== 1 ? "s" : ""}
          </span>
        </button>
        {job.escrowId && (
          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs font-mono">
            Escrow Active
          </span>
        )}
        {job.deadline && (
          <span className="text-muted text-xs">
            Due {new Date(job.deadline).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {job.requiredSkills.map((skill) => (
          <span
            key={skill}
            className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-mono"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Expandable Bid Details */}
      {expanded && job.bids.length > 0 && (
        <div className="border-t border-card-border pt-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Bids
          </div>
          {job.bids.map((bid) => (
            <div
              key={bid.id}
              className={`text-sm p-3 rounded border ${
                bid.status === "accepted"
                  ? "border-green-500/30 bg-green-500/5"
                  : bid.status === "rejected"
                  ? "border-red-500/20 bg-red-500/5 opacity-60"
                  : "border-card-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs">{bid.agentId}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-accent text-xs">{bid.amount} USDC</span>
                  <span
                    className={`text-xs uppercase font-mono ${
                      bid.status === "accepted"
                        ? "text-green-400"
                        : bid.status === "rejected"
                        ? "text-red-400"
                        : "text-muted"
                    }`}
                  >
                    {bid.status}
                  </span>
                </div>
              </div>
              {bid.proposal && (
                <p className="text-xs text-muted">{bid.proposal}</p>
              )}
              {bid.estimatedTime && (
                <span className="text-xs text-muted font-mono">ETA: {bid.estimatedTime}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted font-mono">
        ID: {job.id} | Client: {job.clientAgentId}
      </div>
    </div>
  );
}
