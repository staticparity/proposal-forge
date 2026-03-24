"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { generations, personas } from "@/db/schema";
import { eq, desc, and, sql, isNotNull } from "drizzle-orm";

export async function getUserGenerations() {
  const userId = "test_user_disableclerk";
  if (!userId) throw new Error("Unauthorized");

  return db
    .select({
      id: generations.id,
      jobDescription: generations.jobDescription,
      outputProposal: generations.outputProposal,
      outputQuestions: generations.outputQuestions,
      outputClientMessage: generations.outputClientMessage,
      outputBidAdvice: generations.outputBidAdvice,
      toneUsed: generations.toneUsed,
      followUpMessage: generations.followUpMessage,
      status: generations.status,
      feedbackNotes: generations.feedbackNotes,
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
  const userId = "test_user_disableclerk";
  if (!userId) throw new Error("Unauthorized");

  const result = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.userId, userId));

  return result.length;
}

/**
 * Fetch the 3 most recent "won" proposals for RAG injection.
 */
export async function getWonProposals(userId: string) {
  return db
    .select({ outputProposal: generations.outputProposal })
    .from(generations)
    .where(
      and(eq(generations.userId, userId), eq(generations.status, "won"))
    )
    .orderBy(desc(generations.createdAt))
    .limit(3);
}

/**
 * Analytics aggregation: total, interview, won, rejected counts + monthly breakdown.
 */
export async function getAnalyticsData() {
  const userId = "test_user_disableclerk";
  if (!userId) throw new Error("Unauthorized");

  // Status counts
  const statusCounts = await db
    .select({
      status: generations.status,
      count: sql<number>`count(*)::int`,
    })
    .from(generations)
    .where(eq(generations.userId, userId))
    .groupBy(generations.status);

  const counts: Record<string, number> = {
    pending: 0,
    interview: 0,
    won: 0,
    rejected: 0,
  };
  for (const row of statusCounts) {
    counts[row.status] = row.count;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Monthly breakdown (last 6 months)
  const monthly = await db
    .select({
      month: sql<string>`to_char(${generations.createdAt}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(generations)
    .where(
      and(
        eq(generations.userId, userId),
        sql`${generations.createdAt} >= now() - interval '6 months'`
      )
    )
    .groupBy(sql`to_char(${generations.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${generations.createdAt}, 'YYYY-MM')`);

  return { total, counts, monthly };
}

/**
 * Fetch monthly average effective hourly rate data for profit tracking.
 * Only includes generations with finalBidSubmitted or recommendedBid set.
 */
export async function getProfitTrackingData() {
  const userId = "test_user_disableclerk";
  if (!userId) throw new Error("Unauthorized");

  // Monthly avg effective rate from bid data
  const monthlyRates = await db
    .select({
      month: sql<string>`to_char(${generations.createdAt}, 'YYYY-MM')`,
      avgBid: sql<number>`round(avg(coalesce(${generations.finalBidSubmitted}, ${generations.recommendedBid})))::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(generations)
    .where(
      and(
        eq(generations.userId, userId),
        sql`coalesce(${generations.finalBidSubmitted}, ${generations.recommendedBid}) is not null`,
        sql`${generations.createdAt} >= now() - interval '6 months'`
      )
    )
    .groupBy(sql`to_char(${generations.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${generations.createdAt}, 'YYYY-MM')`);

  // Get user's avg base rate from personas for reference line
  const personaRates = await db
    .select({
      avgRate: sql<number>`round(avg(${personas.baseHourlyRate}))::int`,
    })
    .from(personas)
    .where(
      and(
        eq(personas.userId, userId),
        sql`${personas.baseHourlyRate} > 0`
      )
    );

  const avgBaseRate = personaRates[0]?.avgRate ?? 0;

  return { monthlyRates, avgBaseRate };
}
