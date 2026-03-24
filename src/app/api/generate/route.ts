import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getAIModel } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { db } from "@/db";
import { users, generations } from "@/db/schema";
import { getWonProposals } from "@/server/actions/history";
import { eq } from "drizzle-orm";
import { PLANS } from "@/lib/stripe";
import { calculateOptimalBid, type BidResult } from "@/lib/bidding";

// ─── Output Schema ─────────────────────────────────────────────────────────
const proposalOutputSchema = z.object({
  proposal: z.string().describe("The full proposal text"),
  clientMessage: z
    .string()
    .describe("A short, direct message to send the client"),
  questions: z
    .array(z.string())
    .length(3)
    .describe("3 smart questions to ask the client"),
  bidAdvice: z
    .string()
    .describe("Brief advice on how to price/bid for this job"),
});

export type ProposalOutput = z.infer<typeof proposalOutputSchema>;

// ─── Budget Extraction Schema ──────────────────────────────────────────────
const budgetExtractionSchema = z.object({
  job_type: z
    .enum(["hourly", "fixed"])
    .describe("Whether the job is hourly or fixed-price"),
  estimated_budget: z
    .number()
    .describe("The estimated total budget in USD dollars (whole number)"),
  urgency: z
    .enum(["high", "normal"])
    .describe("How urgent the job seems based on the description"),
});

export type BudgetExtraction = z.infer<typeof budgetExtractionSchema>;

// ─── System Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert freelance proposal writer. You help freelancers win jobs by writing highly personalized, conversational, and direct proposals.

ABSOLUTE RULES:
- NEVER use these words: delve, tapestry, elevate, leverage, seasoned, esteemed, paramount, tailored, dynamic, synergistic, utilize, furthermore, moreover, comprehensive, cutting-edge, spearhead, facilitate, robust, holistic, paradigm, streamline
- Write like a real human freelancer, not a corporate robot
- Be conversational, direct, and confident — NOT salesy or desperate
- Use short sentences. Avoid filler.

FORMAT RULES for the "proposal" field:
- Start with a SHORT hook (1-2 sentences) that shows you understand the problem
- Use 3-5 bullet points for your relevant experience/skills
- End with a brief, confident closing (1-2 sentences)
- Total length: 150-250 words

FORMAT RULES for the "clientMessage" field:
- Ultra-short message (2-3 sentences max) to send alongside the proposal
- Casual, human, and warm

FORMAT RULES for the "questions" field:
- 3 smart, specific questions that prove you read the job description carefully
- Each question should help you scope the work better

FORMAT RULES for the "bidAdvice" field:
- 1-2 sentences of practical pricing/bidding advice for this specific job`;

const BUDGET_SYSTEM_PROMPT = `You are a job posting analyzer. Given a freelance job description, extract:
1. Whether it's hourly or fixed-price
2. The estimated total budget in USD (if not stated, estimate based on typical market rates for the described scope)
3. Whether the job seems urgent (tight deadlines, ASAP language, rush job)

Be practical and realistic with budget estimates. If a budget range is given, use the midpoint.`;

// ─── Request Schema ────────────────────────────────────────────────────────
const requestSchema = z.object({
  personaContent: z
    .string()
    .min(1, "Persona content is required"),
  personaTitle: z.string().min(1, "Persona title is required"),
  jobDescription: z
    .string()
    .min(20, "Job description must be at least 20 characters"),
  personaId: z.string().uuid().optional(),
  provider: z.enum(["openai", "google"]).optional(),
  baseHourlyRate: z.number().int().min(0).optional(), // cents
});

// ─── Route Handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limiting ──
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const genCount = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.userId, userId));

  const maxAllowed =
    user.subscriptionStatus === "pro"
      ? PLANS.pro.maxGenerations
      : PLANS.free.maxGenerations;

  if (genCount.length >= maxAllowed) {
    const message =
      user.subscriptionStatus === "pro"
        ? "You've reached the 1,500 generation limit. Contact support to increase."
        : "You've used all 5 free generations. Upgrade to Pro for 1,500 generations.";
    return Response.json({ error: message }, { status: 429 });
  }

  // Parse & validate input
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { personaContent, personaTitle, jobDescription, provider, baseHourlyRate } =
    parsed.data;

  const model = getAIModel(provider as AIProvider | undefined);

  try {
    // ── RAG: Fetch won proposals for few-shot context ──
    const wonProposals = await getWonProposals(userId);
    const wonTexts = wonProposals
      .map((r) => r.outputProposal)
      .filter(Boolean) as string[];

    let systemPrompt = SYSTEM_PROMPT;
    if (wonTexts.length > 0) {
      const examples = wonTexts
        .map((p, i) => `--- WINNING PROPOSAL ${i + 1} ---\n${p}`)
        .join("\n\n");
      systemPrompt += `\n\nBelow are examples of the user's past winning proposals. Analyze their tone, structure, and pacing. Mimic this exact winning style for the new proposal:\n\n${examples}`;
    }

    // ── Run proposal generation + budget extraction IN PARALLEL ──
    const [proposalResult, budgetResult] = await Promise.all([
      generateObject({
        model,
        schema: proposalOutputSchema,
        prompt: `FREELANCER PERSONA (${personaTitle}):\n${personaContent}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nGenerate a winning proposal, client message, 3 smart questions, and bid advice.`,
        system: systemPrompt,
      }),
      generateObject({
        model,
        schema: budgetExtractionSchema,
        prompt: `Analyze this job posting and extract budget information:\n\n${jobDescription}`,
        system: BUDGET_SYSTEM_PROMPT,
      }),
    ]);

    // ── Calculate optimal bid if base rate is set ──
    let profitAnalysis: (BidResult & { jobType: "hourly" | "fixed" }) | null = null;
    const budget = budgetResult.object;
    const jobBudgetCents = Math.round(budget.estimated_budget * 100); // dollars → cents

    if (baseHourlyRate && baseHourlyRate > 0) {
      const bidResult = calculateOptimalBid({
        baseRate: baseHourlyRate,
        jobBudget: jobBudgetCents,
        urgency: budget.urgency,
        jobType: budget.job_type,
      });
      profitAnalysis = { ...bidResult, jobType: budget.job_type };
    }

    return Response.json({
      ...proposalResult.object,
      budgetExtraction: budget,
      profitAnalysis,
      jobBudgetCents,
    });
  } catch (err) {
    console.error("AI generation error:", err);
    return Response.json(
      { error: "AI generation failed. Please try again." },
      { status: 500 }
    );
  }
}
