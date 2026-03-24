"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { generations, personas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserGenerations() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db
    .select({
      id: generations.id,
      jobDescription: generations.jobDescription,
      outputProposal: generations.outputProposal,
      outputQuestions: generations.outputQuestions,
      outputClientMessage: generations.outputClientMessage,
      outputBidAdvice: generations.outputBidAdvice,
      createdAt: generations.createdAt,
      personaTitle: personas.title,
    })
    .from(generations)
    .leftJoin(personas, eq(generations.personaId, personas.id))
    .where(eq(generations.userId, userId))
    .orderBy(desc(generations.createdAt))
    .limit(50);
}

export async function getUserGenerationCount() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const result = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.userId, userId));

  return result.length;
}
