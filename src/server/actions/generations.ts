"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { generations, type GenerationStatus } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

const saveSchema = z.object({
  personaId: z.string().uuid().optional(),
  jobDescription: z.string().min(1),
  outputProposal: z.string().min(1),
  outputQuestions: z.string().min(1), // JSON-stringified
  outputClientMessage: z.string().min(1),
  outputBidAdvice: z.string().min(1),
});

export async function saveGeneration(data: z.infer<typeof saveSchema>) {
  const { userId } = await auth();
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
  const { userId } = await auth();
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
