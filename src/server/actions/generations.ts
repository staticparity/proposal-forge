"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
