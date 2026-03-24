// ─── Profit Optimizer Math Engine ──────────────────────────────────────────
// All monetary values are in CENTS (integers) to avoid floating-point issues.
// Display helpers convert to dollars for the UI.

const PLATFORM_FEE_RATE = 0.1; // 10%
const URGENCY_PREMIUM = 0.15;  // 15%

export interface BidInput {
  /** User's base hourly rate in cents */
  baseRate: number;
  /** Extracted job budget in cents */
  jobBudget: number;
  /** AI-extracted urgency */
  urgency: "high" | "normal";
  /** AI-extracted job type */
  jobType: "hourly" | "fixed";
}

export interface BidResult {
  /** Recommended bid in cents */
  recommendedBid: number;
  /** Platform fee in cents */
  platformFee: number;
  /** Net profit in cents */
  netProfit: number;
  /** Effective hourly rate in cents */
  effectiveHourlyRate: number;
  /** Estimated hours for the project */
  estimatedHours: number;
  /** Whether urgency premium was applied */
  urgencyPremiumApplied: boolean;
}

/**
 * Calculate the optimal bid to maximize P&L.
 * Pure function — no side effects, integer math only.
 */
export function calculateOptimalBid(input: BidInput): BidResult {
  const { baseRate, jobBudget, urgency, jobType } = input;
  const urgencyPremiumApplied = urgency === "high";
  const multiplier = urgencyPremiumApplied ? 1 + URGENCY_PREMIUM : 1;

  let recommendedBid: number;
  let estimatedHours: number;

  if (jobType === "hourly") {
    // Hourly: bid is an hourly rate, hours estimated from budget
    const hourlyBid = Math.round(baseRate * multiplier);
    estimatedHours = baseRate > 0 ? Math.max(1, Math.round(jobBudget / baseRate)) : 1;
    recommendedBid = hourlyBid * estimatedHours;
  } else {
    // Fixed-price: bid is total project cost
    estimatedHours = baseRate > 0 ? Math.max(1, Math.round(jobBudget / baseRate)) : 1;
    recommendedBid = Math.round(baseRate * multiplier * estimatedHours);
  }

  const platformFee = Math.round(recommendedBid * PLATFORM_FEE_RATE);
  const netProfit = recommendedBid - platformFee;
  const effectiveHourlyRate =
    estimatedHours > 0 ? Math.round(netProfit / estimatedHours) : 0;

  return {
    recommendedBid,
    platformFee,
    netProfit,
    effectiveHourlyRate,
    estimatedHours,
    urgencyPremiumApplied,
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────

/** Convert cents to a formatted dollar string, e.g. 7500 → "$75.00" */
export function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Convert a dollar input (e.g. "75") to cents */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
