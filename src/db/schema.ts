import { pgTable, text, integer, timestamp, uuid, varchar, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

// ─── Status enum ────────────────────────────────────────────────────────────
export const GENERATION_STATUSES = [
  "pending",
  "interview",
  "won",
  "rejected",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

// ─── Tier enum ──────────────────────────────────────────────────────────────
export const USER_TIERS = ["free", "basic", "premium"] as const;
export type UserTier = (typeof USER_TIERS)[number];

// ─── Tone options ───────────────────────────────────────────────────────────
export const TONE_OPTIONS = [
  { value: "direct", label: "Direct & Punchy (Fiverr)" },
  { value: "professional", label: "Professional (LinkedIn)" },
  { value: "consultative", label: "Consultative (Upwork)" },
  { value: "enthusiastic", label: "Enthusiastic" },
] as const;
export type ToneValue = (typeof TONE_OPTIONS)[number]["value"];

// ─── Portfolio Item Schema ──────────────────────────────────────────────────
export const portfolioItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string(),
});
export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
export const portfolioItemsSchema = z.array(portfolioItemSchema);

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status", {
    enum: ["free", "pro", "cancelled"],
  })
    .default("free")
    .notNull(),
  tier: varchar("tier", { length: 20 }).$type<UserTier>().default("free").notNull(),
  apiKey: varchar("api_key", { length: 64 }).unique(),
  credits: integer("credits").default(15).notNull(),
  aiImportAttempts: integer("ai_import_attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Personas ───────────────────────────────────────────────────────────────
export const personas = pgTable("personas", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  baseHourlyRate: integer("base_hourly_rate").default(0).notNull(), // cents
  portfolioItems: jsonb("portfolio_items").$type<PortfolioItem[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Generations ────────────────────────────────────────────────────────────
export const generations = pgTable("generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  personaId: uuid("persona_id").references(() => personas.id, {
    onDelete: "set null",
  }),
  jobDescription: text("job_description").notNull(),
  outputProposal: text("output_proposal"),
  outputQuestions: text("output_questions"), // JSON-stringified string[]
  outputClientMessage: text("output_client_message"),
  outputBidAdvice: text("output_bid_advice"),
  toneUsed: varchar("tone_used", { length: 50 }),
  followUpMessage: text("follow_up_message"),
  status: text("status", {
    enum: ["pending", "interview", "won", "rejected"],
  })
    .default("pending")
    .notNull(),
  feedbackNotes: text("feedback_notes"),
  jobBudget: integer("job_budget"),             // cents — extracted from job description
  recommendedBid: integer("recommended_bid"),   // cents — calculated optimal bid
  finalBidSubmitted: integer("final_bid_submitted"), // cents — what user actually bid
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Type exports ───────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
