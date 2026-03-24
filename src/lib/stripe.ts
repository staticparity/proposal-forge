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
    maxGenerations: 15,
    price: 0,
  },
  basic: {
    name: "Basic",
    maxGenerations: Infinity,
    priceMonthly: 900, // $9.00 in cents
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID ?? "",
    stripeProductId: process.env.STRIPE_BASIC_PRODUCT_ID ?? process.env.STRIPE_PRO_PRODUCT_ID ?? "",
  },
  premium: {
    name: "Premium",
    maxGenerations: Infinity,
    priceMonthly: 2500, // $25.00 in cents
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
    stripeProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID ?? "",
  },
  // Legacy alias — keep for compat with existing "pro" checks
  pro: {
    name: "Basic",
    maxGenerations: Infinity,
    priceMonthly: 900,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID ?? "",
    stripeProductId: process.env.STRIPE_BASIC_PRODUCT_ID ?? process.env.STRIPE_PRO_PRODUCT_ID ?? "",
  },
} as const;

/**
 * Gets or creates the Stripe Price ID for a given plan.
 */
async function resolvePriceId(
  plan: { stripePriceId: string; stripeProductId: string; priceMonthly: number }
): Promise<string> {
  if (plan.stripePriceId) return plan.stripePriceId;

  const productId = plan.stripeProductId;
  if (!productId) {
    throw new Error("No Stripe product or price ID configured for this plan.");
  }

  const product = await stripe.products.retrieve(productId);
  if (product.default_price) {
    return typeof product.default_price === "string"
      ? product.default_price
      : product.default_price.id;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.priceMonthly,
    currency: "usd",
    recurring: { interval: "month" },
  });

  return price.id;
}

export async function getProPriceId(): Promise<string> {
  return resolvePriceId(PLANS.basic);
}

export async function getBasicPriceId(): Promise<string> {
  return resolvePriceId(PLANS.basic);
}

export async function getPremiumPriceId(): Promise<string> {
  return resolvePriceId(PLANS.premium);
}
