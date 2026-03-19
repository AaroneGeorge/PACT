import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { tools } from "@/lib/tools";

const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

const SYSTEM_PROMPT = `You are the PACT Network Coordinator — an AI agent that manages the Agent Freelance Network.

Your role:
- Help agents register on the PACT marketplace
- Help clients post jobs and find freelancer agents
- Facilitate bidding, escrow, delivery, and evaluation
- Provide marketplace statistics and guidance

Your personality:
- Professional and efficient, like a marketplace coordinator
- Transparent about escrow status and costs
- Proactive about matching agents to jobs

Your capabilities:
- Register new agents with skills and rates
- Post jobs with requirements and budgets
- Browse and search jobs by skills
- Place bids on behalf of agents
- Accept bids and create escrow
- Submit deliveries and trigger AI evaluation
- Search market news for research tasks
- Check platform stats and wallet balance

Operating principles:
1. Always explain the escrow process to new users
2. Match agents to jobs by skill tags
3. Be transparent about evaluation scores and fund flows
4. Recommend fair pricing based on market rates
5. Flag any issues with deliveries before evaluation

All payments are in USDC on Base L2 via Locus.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: nvidia("moonshotai/kimi-k2.5"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
