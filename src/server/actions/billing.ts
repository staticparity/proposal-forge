"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe, getBasicPriceId, getPremiumPriceId } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

/**
 * Cancels the user's subscription at the end of the current billing period.
 */
export async function cancelSubscription(): Promise<{ error?: string }> {
  const userId = "test_user_disableclerk";
  if (!userId) return { error: "Unauthorized" };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.stripeCustomerId) {
    return { error: "No billing account found" };
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { error: "No active subscription found" };
    }

    await stripe.subscriptions.update(subscriptions.data[0].id, {
      cancel_at_period_end: true,
    });

    await db
      .update(users)
      .set({ subscriptionStatus: "cancelled" })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard/billing");
    return {};
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return { error: err instanceof Error ? err.message : "Cancellation failed" };
  }
}

/**
 * Creates a Stripe Checkout session for a given tier.
 */
export async function createCheckoutSession(
  tier: "basic" | "premium" = "basic"
): Promise<{ url?: string; error?: string }> {
  const userId = "test_user_disableclerk";
  if (!userId) return { error: "Unauthorized" };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { error: "User not found" };

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkUserId: userId },
    });
    customerId = customer.id;

    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  try {
    const priceId = tier === "premium"
      ? await getPremiumPriceId()
      : await getBasicPriceId();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tier },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing?cancelled=true`,
    });

    return { url: session.url ?? undefined };
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return { error: err instanceof Error ? err.message : "Checkout failed" };
  }
}

/**
 * Creates a Stripe Customer Portal session.
 */
export async function createPortalSession(): Promise<{ url?: string; error?: string }> {
  const userId = "test_user_disableclerk";
  if (!userId) return { error: "Unauthorized" };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.stripeCustomerId) {
    return { error: "No billing account found" };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`,
    });

    return { url: session.url ?? undefined };
  } catch (err) {
    console.error("Stripe portal error:", err);
    return { error: err instanceof Error ? err.message : "Portal failed" };
  }
}

/**
 * Generates a secure API key for premium users.
 */
export async function generateApiKey(): Promise<{ apiKey?: string; error?: string }> {
  const userId = "test_user_disableclerk";
  if (!userId) return { error: "Unauthorized" };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { error: "User not found" };

  if (user.tier !== "premium") {
    return { error: "API key is only available for Premium tier users." };
  }

  try {
    const key = `pf_${randomBytes(24).toString("hex")}`;

    await db
      .update(users)
      .set({ apiKey: key })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard/billing");
    return { apiKey: key };
  } catch (err) {
    console.error("API key generation error:", err);
    return { error: err instanceof Error ? err.message : "Failed to generate API key" };
  }
}
