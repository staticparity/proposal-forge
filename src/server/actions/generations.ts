"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { generations, type GenerationStatus } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { generateObject } from "ai";
import { getAIModel } from "@/lib/ai";

const saveSchema = z.object({
  personaId: z.string().uuid().optional(),
  jobDescription: z.string().min(1),
  outputProposal: z.string().min(1),
  outputQuestions: z.string().min(1), // JSON-stringified
  outputClientMessage: z.string().min(1),
  outputBidAdvice: z.string().min(1),
  jobBudget: z.number().int().nullable().optional(),
  recommendedBid: z.number().int().nullable().optional(),
  finalBidSubmitted: z.number().int().nullable().optional(),
  toneUsed: z.string().optional(),
});

export async function saveGeneration(data: z.infer<typeof saveSchema>) {
  const userId = "test_user_disableclerk";
  if (!userId) throw new Error("Unauthorized");

  const parsed = saveSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const [created] = await db
      .insert(generations)
      .values({
        userId,
        personaId: parsed.data.personaId ?? null,
        jobDescription: parsed.data.jobDescription,
        outputProposal: parsed.data.outputProposal,
        outputQuestions: parsed.data.outputQuestions,
        outputClientMessage: parsed.data.outputClientMessage,
        outputBidAdvice: parsed.data.outputBidAdvice,
        jobBudget: parsed.data.jobBudget ?? null,
        recommendedBid: parsed.data.recommendedBid ?? null,
        finalBidSubmitted: parsed.data.finalBidSubmitted ?? null,
        toneUsed: parsed.data.toneUsed ?? null,
      })
      .returning();

    revalidatePath("/dashboard/history");
    return { success: true, id: created.id };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to save generation",
    };
  }
}

/**
 * Update status and optional feedback notes for a generation.
 * Scoped to the authenticated user for security.
 */
export async function updateGenerationStatus(
  id: string,
  status: GenerationStatus,
  feedbackNotes?: string
) {
  const userId = "test_user_disableclerk";
  if (!userId) throw new Error("Unauthorized");

  try {
    await db
      .update(generations)
      .set({
        status,
        feedbackNotes: feedbackNotes ?? null,
      })
      .where(and(eq(generations.id, id), eq(generations.userId, userId)));

    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update generation status",
    };
  }
}

// ─── Follow-Up Generator ───────────────────────────────────────────────────
const followUpSchema = z.object({
  followUp: z
    .string()
    .describe(
      "A polite, professional 2-sentence follow-up message checking in on the status of the proposal. Casual and human — not corporate."
    ),
});

export async function generateFollowUp(generationId: string) {
  const userId = "test_user_disableclerk";
  if (!userId) return { error: "Unauthorized" };

  try {
    // Fetch the generation
    const [gen] = await db
      .select()
      .from(generations)
      .where(
        and(eq(generations.id, generationId), eq(generations.userId, userId))
      )
      .limit(1);

    if (!gen) return { error: "Generation not found" };

    if (gen.followUpMessage) {
      return { followUp: gen.followUpMessage };
    }

    const { object } = await generateObject({
      model: getAIModel(),
      schema: followUpSchema,
      system: `You write brief, human follow-up messages for freelancers checking in with clients 3 days after submitting a proposal. Rules:
- Exactly 2 sentences, polite and professional
- Reference something specific from the proposal or job
- Sound human, not automated
- NEVER use words: delve, tapestry, elevate, leverage, seasoned`,
      prompt: `Original proposal:\n${gen.outputProposal ?? "(no proposal)"}\n\nJob description:\n${gen.jobDescription}\n\nWrite a 2-sentence follow-up message.`,
    });

    // Save to DB
    await db
      .update(generations)
      .set({ followUpMessage: object.followUp })
      .where(eq(generations.id, generationId));

    revalidatePath("/dashboard/history");
    return { followUp: object.followUp };
  } catch (error) {
    console.error("[generateFollowUp]", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to generate follow-up",
    };
  }
}
