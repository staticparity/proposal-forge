import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Handle relevant events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer) {
        await db
          .update(users)
          .set({
            subscriptionStatus: "pro",
            credits: 1500,
          })
          .where(eq(users.stripeCustomerId, session.customer as string));
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive =
        subscription.status === "active" ||
        subscription.status === "trialing";

      await db
        .update(users)
        .set({
          subscriptionStatus: isActive ? "pro" : "cancelled",
          credits: isActive ? 1500 : 0,
        })
        .where(
          eq(users.stripeCustomerId, subscription.customer as string)
        );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await db
        .update(users)
        .set({
          subscriptionStatus: "free",
          credits: 5,
        })
        .where(
          eq(users.stripeCustomerId, subscription.customer as string)
        );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
