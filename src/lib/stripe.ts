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
    priceMonthly: 900, // $9.00 in cents
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    stripeProductId: process.env.STRIPE_PRO_PRODUCT_ID ?? "",
  },
} as const;

/**
 * Gets or creates the Stripe Price ID for the Pro plan.
 * If STRIPE_PRO_PRICE_ID is set, uses it directly.
 * Otherwise, looks up the default price from the product, or creates one.
 */
export async function getProPriceId(): Promise<string> {
  // 1. Use explicit price ID if set
  if (PLANS.pro.stripePriceId) {
    return PLANS.pro.stripePriceId;
  }

  // 2. Look up the product's default price
  const productId = PLANS.pro.stripeProductId;
  if (!productId) {
    throw new Error(
      "Neither STRIPE_PRO_PRICE_ID nor STRIPE_PRO_PRODUCT_ID is set. " +
        "Add one of these to your .env.local file."
    );
  }

  const product = await stripe.products.retrieve(productId);
  if (product.default_price) {
    return typeof product.default_price === "string"
      ? product.default_price
      : product.default_price.id;
  }

  // 3. No default price — create one
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: PLANS.pro.priceMonthly,
    currency: "usd",
    recurring: { interval: "month" },
  });

  return price.id;
}
