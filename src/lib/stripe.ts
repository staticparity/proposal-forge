import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

// ─── Pricing ───────────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    name: "Free",
    maxGenerations: 5,
    price: 0,
  },
  pro: {
    name: "Pro",
    maxGenerations: 1500,
    priceMonthly: 9, // $9/month
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  },
} as const;
