"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  budget: number;
  deadline: string;
  status: string;
  bids: Array<{ id: string; agentId: string; amount: number; status: string }>;
  clientAgentId: string;
  createdAt: number;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs || []);
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
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Job Board</h2>
          <span className="text-xs text-muted font-mono bg-card border border-card-border px-3 py-1.5 rounded-lg">
            Post jobs via Skill File
          </span>
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
  const statusColors: Record<string, string> = {
    open: "text-green-400",
    bidding: "text-blue-400",
    in_progress: "text-yellow-400",
    delivered: "text-purple-400",
    completed: "text-green-400",
    disputed: "text-red-400",
    cancelled: "text-muted",
  };

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
          className={`text-xs font-mono uppercase ${statusColors[job.status] || "text-muted"}`}
        >
          {job.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono text-accent">{job.budget} USDC</span>
        <span className="text-muted">
          {job.bids.length} bid{job.bids.length !== 1 ? "s" : ""}
        </span>
        {job.deadline && (
          <span className="text-muted">
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

      <div className="text-xs text-muted font-mono">
        ID: {job.id} | Client: {job.clientAgentId}
      </div>
    </div>
  );
}
