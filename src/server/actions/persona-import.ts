"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { personas, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateObject } from "ai";
import { getAIModel } from "@/lib/ai";

const FREE_IMPORT_LIMIT = 5;

// ─── Zod schema for AI-generated persona ────────────────────────────────────
const generatedPersonaSchema = z.object({
  persona: z.object({
    title: z
      .string()
      .describe(
        "A short, specific freelance persona title, e.g. 'Full-Stack React & Node Engineer'"
      ),
    content: z
      .string()
      .describe(
        "A highly concise, ~150-word first-person summary of achievements in this specific domain"
      ),
  }),
});

// ─── Helpers ───────────────────────────────────────────────────────────────
async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

async function getUser(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error("User not found");
  return user;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { extractText } = await import("unpdf");
  const { text: pages } = await extractText(arrayBuffer);
  const text = pages.join("\n");

  if (!text || text.trim().length < 20) {
    throw new Error(
      "The PDF appears to be empty or image-only. Please use a text-based PDF."
    );
  }

  return text;
}

async function extractTextFromUrl(url: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/markdown" },
  });

  if (!response.ok) {
    if (response.status === 402) {
      throw new Error(
        "This URL requires a premium scraper. Try uploading a resume PDF instead."
      );
    }
    throw new Error(
      `Could not fetch the profile (HTTP ${response.status}). The site may be blocking scrapers.`
    );
  }

  const text = await response.text();
  if (!text || text.trim().length < 20) {
    throw new Error(
      "The page returned too little content. Make sure the URL is a public profile."
    );
  }

  return text;
}

async function generatePersonaFromText(text: string) {
  const truncated = text.slice(0, 12000);

  const { object } = await generateObject({
    model: getAIModel(),
    schema: generatedPersonaSchema,
    prompt: `You are an expert tech recruiter and freelance career strategist. Analyze the following resume/profile text and extract the person's core skills, experience, and standout achievements.

Create exactly 1 specialized freelance persona focusing on the person's strongest and most marketable niche.

Rules:
- "title" should be a specific, marketable freelance title (e.g. "Senior React & TypeScript Frontend Engineer", "DevOps & Cloud Infrastructure Specialist")
- "content" must be a highly concise, first-person summary (~150 words) of their absolute best achievements in that specific domain
- Write in a confident, professional tone as if the freelancer wrote it themselves
- Focus on concrete results, technologies, and impact — not generic fluff

Profile/Resume text:
---
${truncated}
---`,
  });

  return object.persona;
}

// ─── Public: check AI import status for the current user ────────────────────
export async function getAiImportStatus(): Promise<{
  used: number;
  limit: number;
  locked: boolean;
  isPro: boolean;
}> {
  const userId = await getAuthUserId();
  const user = await getUser(userId);
  const isPro = user.subscriptionStatus === "pro";

  return {
    used: user.aiImportAttempts,
    limit: FREE_IMPORT_LIMIT,
    locked: !isPro && user.aiImportAttempts >= FREE_IMPORT_LIMIT,
    isPro,
  };
}

// ─── Main Server Action ────────────────────────────────────────────────────
export async function importPersonaAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  try {
    const userId = await getAuthUserId();
    const user = await getUser(userId);

    // Enforce free-tier limit
    const isPro = user.subscriptionStatus === "pro";
    if (!isPro && user.aiImportAttempts >= FREE_IMPORT_LIMIT) {
      return {
        error: `You've used all ${FREE_IMPORT_LIMIT} free AI imports. Upgrade to Pro for unlimited access.`,
      };
    }

    const mode = formData.get("mode") as string;
    let extractedText: string;

    if (mode === "url") {
      const url = formData.get("url") as string;
      if (!url || !url.trim()) {
        return { error: "Please enter a URL." };
      }
      try {
        new URL(url);
      } catch {
        return {
          error:
            "Please enter a valid URL (e.g. https://linkedin.com/in/yourname).",
        };
      }
      extractedText = await extractTextFromUrl(url.trim());
    } else if (mode === "file") {
      const file = formData.get("file") as File | null;
      if (!file || file.size === 0) {
        return { error: "Please select a PDF file." };
      }
      if (!file.type.includes("pdf")) {
        return {
          error: "Only PDF files are supported. Please upload a .pdf file.",
        };
      }
      if (file.size > 10 * 1024 * 1024) {
        return { error: "File is too large. Maximum size is 10 MB." };
      }
      extractedText = await extractTextFromPdf(file);
    } else {
      return { error: "Invalid import mode." };
    }

    const persona = await generatePersonaFromText(extractedText);

    // Insert persona + increment usage counter
    await db.insert(personas).values({
      userId,
      title: persona.title,
      content: persona.content,
    });

    await db
      .update(users)
      .set({ aiImportAttempts: user.aiImportAttempts + 1 })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard/personas");
    return { success: true };
  } catch (error) {
    console.error("[importPersonaAction]", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }
}
