import { generateObject } from "ai";
import { z } from "zod";
import { getAIModel } from "@/lib/ai";
import { db } from "@/db";
import { users, personas, generations, portfolioItemsSchema, type PortfolioItem } from "@/db/schema";
import { getWonProposals } from "@/server/actions/history";
import { eq } from "drizzle-orm";

// ─── Tone Descriptions ─────────────────────────────────────────────────────
const TONE_DESCRIPTIONS: Record<string, string> = {
  direct: "You must adopt a Direct & Punchy tone suitable for Fiverr. Be concise, bold, and action-oriented. Cut the fluff. Do not deviate.",
  professional: "You must adopt a Professional tone suitable for LinkedIn and corporate platforms. Be polished, articulate, and measured. Do not deviate.",
  consultative: "You must adopt a Consultative tone suitable for Upwork. Position yourself as an advisor, ask thoughtful questions, and show strategic thinking. Do not deviate.",
  enthusiastic: "You must adopt an Enthusiastic tone. Show genuine excitement about the project while remaining professional. Be energetic and positive. Do not deviate.",
};

// ─── Schemas ────────────────────────────────────────────────────────────────
const proposalOutputSchema = z.object({
  proposal: z.string().describe("The full proposal text"),
  clientMessage: z.string().describe("A short, direct message to send the client"),
  questions: z.array(z.string()).length(3).describe("3 smart questions to ask the client"),
  bidAdvice: z.string().describe("Brief advice on how to price/bid for this job"),
});

const requestSchema = z.object({
  job_description: z.string().min(20, "Job description must be at least 20 characters"),
  tone: z.enum(["direct", "professional", "consultative", "enthusiastic"]).default("professional"),
  persona_id: z.string().uuid("Invalid persona ID"),
});

// ─── System Prompt ──────────────────────────────────────────────────────────
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

// ─── Route Handler ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // ── Validate Bearer token ──
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing or invalid Authorization header. Use: Bearer <API_KEY>" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey || !apiKey.startsWith("pf_")) {
    return Response.json(
      { error: "Invalid API key format" },
      { status: 401 }
    );
  }

  // ── Look up user by API key ──
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.apiKey, apiKey))
    .limit(1);

  if (!user) {
    return Response.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  if (user.tier !== "premium") {
    return Response.json(
      { error: "API access requires a Premium subscription" },
      { status: 403 }
    );
  }

  // ── Parse request body ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { job_description, tone, persona_id } = parsed.data;

  // ── Fetch persona ──
  const [persona] = await db
    .select()
    .from(personas)
    .where(eq(personas.id, persona_id))
    .limit(1);

  if (!persona) {
    return Response.json({ error: "Persona not found" }, { status: 404 });
  }

  if (persona.userId !== user.id) {
    return Response.json({ error: "Persona not found" }, { status: 404 });
  }

  const model = getAIModel();

  try {
    // ── Build system prompt ──
    let systemPrompt = SYSTEM_PROMPT;

    // Tone injection
    const toneInstruction = TONE_DESCRIPTIONS[tone] ?? TONE_DESCRIPTIONS.professional;
    systemPrompt += `\n\nTONE INSTRUCTION:\n${toneInstruction}`;

    // Portfolio injection
    const portfolioItems = persona.portfolioItems as PortfolioItem[] | null;
    if (portfolioItems && portfolioItems.length > 0) {
      const itemsList = portfolioItems
        .map((item) => `- ${item.title}: ${item.url} — ${item.description}`)
        .join("\n");
      systemPrompt += `\n\nPORTFOLIO ITEMS (reference these to prove expertise — do NOT invent links):\n${itemsList}`;
      systemPrompt += `\nInstruction: Review the client's job description and the user's portfolio items above. Select the 1 or 2 most relevant portfolio links and seamlessly weave them into the proposal as proof of competence.`;
    }

    // RAG: Won proposals
    const wonProposals = await getWonProposals(user.id);
    const wonTexts = wonProposals
      .map((r) => r.outputProposal)
      .filter(Boolean) as string[];
    if (wonTexts.length > 0) {
      const examples = wonTexts
        .map((p, i) => `--- WINNING PROPOSAL ${i + 1} ---\n${p}`)
        .join("\n\n");
      systemPrompt += `\n\nBelow are examples of the user's past winning proposals. Mimic this winning style:\n\n${examples}`;
    }

    const { object } = await generateObject({
      model,
      schema: proposalOutputSchema,
      prompt: `FREELANCER PERSONA (${persona.title}):\n${persona.content}\n\nJOB DESCRIPTION:\n${job_description}\n\nGenerate a winning proposal, client message, 3 smart questions, and bid advice.`,
      system: systemPrompt,
    });

    // Save to history
    await db.insert(generations).values({
      userId: user.id,
      personaId: persona_id,
      jobDescription: job_description,
      outputProposal: object.proposal,
      outputQuestions: JSON.stringify(object.questions),
      outputClientMessage: object.clientMessage,
      outputBidAdvice: object.bidAdvice,
      toneUsed: tone,
    });

    return Response.json({
      proposal: object.proposal,
      client_message: object.clientMessage,
      questions: object.questions,
      bid_advice: object.bidAdvice,
      tone_used: tone,
    });
  } catch (err) {
    console.error("[Extension API] Generation error:", err);
    return Response.json(
      { error: "AI generation failed. Please try again." },
      { status: 500 }
    );
  }
}
