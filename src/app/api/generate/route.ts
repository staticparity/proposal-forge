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

  const { personaContent, personaTitle, jobDescription, provider } =
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

    // Generate structured object (non-streaming, reliable JSON response)
    const { object } = await generateObject({
      model,
      schema: proposalOutputSchema,
      prompt: `FREELANCER PERSONA (${personaTitle}):\n${personaContent}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nGenerate a winning proposal, client message, 3 smart questions, and bid advice.`,
      system: systemPrompt,
    });

    return Response.json(object);
  } catch (err) {
    console.error("AI generation error:", err);
    return Response.json(
      { error: "AI generation failed. Please try again." },
      { status: 500 }
    );
  }
}
