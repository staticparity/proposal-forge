"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe, getProPriceId } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

/**
 * Cancels the user's Pro subscription at the end of the current billing period.
 */
export async function cancelSubscription(): Promise<{ error?: string }> {
  const { userId } = await auth();
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
    // Find active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { error: "No active subscription found" };
    }

    // Cancel at end of current period (not immediate)
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
 * Creates a Stripe Checkout session for the Pro plan.
 * Returns the checkout URL for the client to redirect to.
 */
export async function createCheckoutSession(): Promise<{ url?: string; error?: string }> {
  const { userId } = await auth();
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
    const priceId = await getProPriceId();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
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
 * Returns the portal URL for the client to redirect to.
 */
export async function createPortalSession(): Promise<{ url?: string; error?: string }> {
  const { userId } = await auth();
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
