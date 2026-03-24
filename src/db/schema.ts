import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

// ─── Status enum ────────────────────────────────────────────────────────────
export const GENERATION_STATUSES = [
  "pending",
  "interview",
  "won",
  "rejected",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status", {
    enum: ["free", "pro", "cancelled"],
  })
    .default("free")
    .notNull(),
  credits: integer("credits").default(5).notNull(),
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
