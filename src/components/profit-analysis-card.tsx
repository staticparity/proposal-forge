"use client";

import {
  DollarSign,
  TrendingUp,
  Calculator,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ProfitAnalysis {
  recommendedBid: number;   // cents
  platformFee: number;      // cents
  netProfit: number;        // cents
  effectiveHourlyRate: number; // cents
  estimatedHours: number;
  urgencyPremiumApplied: boolean;
  jobType: "hourly" | "fixed";
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProfitAnalysisCard({
  analysis,
}: {
  analysis: ProfitAnalysis;
}) {
  return (
    <Card className="relative overflow-hidden border-emerald-500/20">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="h-4 w-4 text-emerald-500" />
          Profit Analysis
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {/* Recommended Bid */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Recommended Bid
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {fmt(analysis.recommendedBid)}
          </span>
        </div>

        {/* Platform Fee */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            Platform Fee (10%)
          </span>
          <span className="text-sm font-medium text-red-400 tabular-nums">
            -{fmt(analysis.platformFee)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Net Profit */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            Estimated Net Profit
          </span>
          <span className="text-base font-bold text-emerald-500 tabular-nums">
            {fmt(analysis.netProfit)}
          </span>
        </div>

        {/* Effective Rate */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Effective Rate ({analysis.estimatedHours}h est.)
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {fmt(analysis.effectiveHourlyRate)}/hr
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-zinc-500/10 border-zinc-500/20 text-zinc-400">
            {analysis.jobType === "hourly" ? "Hourly" : "Fixed Price"}
          </span>
          {analysis.urgencyPremiumApplied && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 border-amber-500/20 text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5" />
              +15% Urgency
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
