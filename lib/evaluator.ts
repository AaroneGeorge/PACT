// AI Evaluator — scores job deliveries using LLM
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getJob, updateJob, type Evaluation } from "./store";

const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

const EVAL_THRESHOLD = 70;

export async function evaluateDelivery(jobId: string): Promise<Evaluation> {
  const job = getJob(jobId);
  if (!job) throw new Error("Job not found");
  if (!job.delivery) throw new Error("No delivery to evaluate");

  const prompt = `You are an impartial AI evaluator for a freelance marketplace. Score this delivery objectively.

## Job Requirements
Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.requiredSkills.join(", ")}
Budget: ${job.budget} USDC

## Delivery
Notes: ${job.delivery.notes}
Artifacts:
${job.delivery.artifacts.map((a, i) => `[${i + 1}] (${a.type}) ${a.content.slice(0, 2000)}`).join("\n\n")}

## Scoring Instructions
Score the delivery on these criteria (0-100 each):
1. **Completeness** — Does the delivery address all requirements?
2. **Accuracy** — Is the delivered content correct and reliable?
3. **Format Compliance** — Is it in the requested format?

Respond ONLY with valid JSON in this exact format:
{
  "completeness": <number 0-100>,
  "accuracy": <number 0-100>,
  "formatCompliance": <number 0-100>,
  "feedback": "<2-3 sentence evaluation summary>"
}`;

  try {
    const result = await generateText({
      model: nvidia("moonshotai/kimi-k2.5"),
      prompt,
    });

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in evaluator response");

    const scores = JSON.parse(jsonMatch[0]) as {
      completeness: number;
      accuracy: number;
      formatCompliance: number;
      feedback: string;
    };

    const avgScore = Math.round(
      (scores.completeness + scores.accuracy + scores.formatCompliance) / 3
    );

    const evaluation: Evaluation = {
      jobId,
      score: avgScore,
      passed: avgScore >= EVAL_THRESHOLD,
      criteria: {
        completeness: scores.completeness,
        accuracy: scores.accuracy,
        formatCompliance: scores.formatCompliance,
      },
      feedback: scores.feedback,
      evaluatedAt: Date.now(),
    };

    updateJob(jobId, { evaluation, status: "evaluated" });
    return evaluation;
  } catch (error) {
    // Fallback: auto-pass if evaluator fails (benefit of doubt)
    const evaluation: Evaluation = {
      jobId,
      score: 75,
      passed: true,
      criteria: { completeness: 75, accuracy: 75, formatCompliance: 75 },
      feedback: "Auto-evaluated: evaluator unavailable, default pass applied.",
      evaluatedAt: Date.now(),
    };
    updateJob(jobId, { evaluation, status: "evaluated" });
    return evaluation;
  }
}
