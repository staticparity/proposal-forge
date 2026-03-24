"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Zod Schemas ───────────────────────────────────────────────────────────
const personaSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be under 100 characters"),
  content: z
    .string()
    .min(50, "Bio must be at least 50 characters")
    .max(2000, "Bio must be under 2000 characters"),
});

const personaIdSchema = z.object({
  id: z.string().uuid("Invalid persona ID"),
});

// ─── Helpers ───────────────────────────────────────────────────────────────
async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// ─── Create ────────────────────────────────────────────────────────────────
export async function createPersona(formData: FormData) {
  try {
    const userId = await getAuthUserId();

    const parsed = personaSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    await db.insert(personas).values({
      userId,
      title: parsed.data.title,
      content: parsed.data.content,
    });

    revalidatePath("/dashboard/personas");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create persona",
    };
  }
}

// ─── Update ────────────────────────────────────────────────────────────────
export async function updatePersona(formData: FormData) {
  try {
    const userId = await getAuthUserId();

    const idResult = personaIdSchema.safeParse({ id: formData.get("id") });
    if (!idResult.success) {
      return { error: idResult.error.issues[0].message };
    }

    const parsed = personaSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const result = await db
      .update(personas)
      .set({
        title: parsed.data.title,
        content: parsed.data.content,
      })
      .where(and(eq(personas.id, idResult.data.id), eq(personas.userId, userId)))
      .returning();

    if (result.length === 0) {
      return { error: "Persona not found or unauthorized" };
    }

    revalidatePath("/dashboard/personas");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update persona",
    };
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────
export async function deletePersona(id: string) {
  try {
    const userId = await getAuthUserId();

    const idResult = personaIdSchema.safeParse({ id });
    if (!idResult.success) {
      return { error: idResult.error.issues[0].message };
    }

    const result = await db
      .delete(personas)
      .where(and(eq(personas.id, idResult.data.id), eq(personas.userId, userId)))
      .returning();

    if (result.length === 0) {
      return { error: "Persona not found or unauthorized" };
    }

    revalidatePath("/dashboard/personas");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete persona",
    };
  }
}

// ─── Read ──────────────────────────────────────────────────────────────────
export async function getUserPersonas() {
  const userId = await getAuthUserId();

  return db
    .select()
    .from(personas)
    .where(eq(personas.userId, userId))
    .orderBy(personas.createdAt);
}
