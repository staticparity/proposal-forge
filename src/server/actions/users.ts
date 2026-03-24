"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Ensures the currently authenticated Clerk user has a corresponding
 * row in the `users` table. Call this from any server component or
 * action that needs a guaranteed DB user record.
 *
 * Returns the DB user row, or null if no Clerk session.
 */
export async function ensureUserInDb() {
  const userId = "test_user_disableclerk";
  if (!userId) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // First time this Clerk user hits the app — create DB row
  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      subscriptionStatus: "free",
      credits: 15,
    })
    .returning();

  return newUser;
}
