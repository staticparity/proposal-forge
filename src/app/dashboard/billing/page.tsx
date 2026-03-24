import { ensureUserInDb } from "@/server/actions/users";
import { getUserGenerationCount } from "@/server/actions/history";
import { BillingActions } from "@/components/billing-actions";
import { PLANS } from "@/lib/stripe";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

export default async function BillingPage() {
  const user = await ensureUserInDb();
  const generationCount = await getUserGenerationCount();

  if (!user) return null;

  const isPaid = user.subscriptionStatus === "pro";
  const isPremium = user.tier === "premium";
  const isBasic = user.tier === "basic" || (isPaid && !isPremium);
  const currentTier = isPremium ? "premium" : isBasic ? "basic" : "free";

  const maxGenerations = isPaid ? PLANS.basic.maxGenerations : PLANS.free.maxGenerations;
  const isUnlimited = !isFinite(maxGenerations);
  const usagePercent = isUnlimited ? 15 : Math.min(
    100,
    Math.round((generationCount / maxGenerations) * 100)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and usage.
        </p>
      </div>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
          <CardDescription>
            {isUnlimited
              ? `${generationCount} generations used (unlimited)`
              : `${generationCount} / ${maxGenerations} generations used`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full rounded-full bg-muted h-2.5">
            <div
              className="h-2.5 rounded-full bg-primary transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {isPremium
              ? "Premium plan — unlimited generations + Chrome Extension API"
              : isBasic
                ? "Basic plan — unlimited web app generations"
                : "Free plan — upgrade for unlimited generations"}
          </p>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Free Plan */}
        <Card className={currentTier === "free" ? "ring-2 ring-primary" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Free</CardTitle>
            </div>
            <CardDescription>Get started for free</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            <p className="text-3xl font-bold">
              $0<span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />15 generations
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited personas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Tone customization
              </li>
            </ul>
            {currentTier === "free" && (
              <p className="text-xs text-primary font-medium pt-2">
                ✓ Current plan
              </p>
            )}
          </CardContent>
        </Card>

        {/* Basic Plan */}
        <Card className={currentTier === "basic" ? "ring-2 ring-primary" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Basic</CardTitle>
            </div>
            <CardDescription>For serious freelancers</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            <p className="text-3xl font-bold">
              $9<span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited generations
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited personas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Tone customization
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Follow-up generator
              </li>
            </ul>
            <BillingActions tier="basic" currentTier={currentTier} />
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative ${currentTier === "premium" ? "ring-2 ring-primary" : "ring-1 ring-amber-500/30"}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Most Popular
            </span>
          </div>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Premium</CardTitle>
            </div>
            <CardDescription>Chrome Extension + API access</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            <p className="text-3xl font-bold">
              $25<span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Everything in Basic
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Chrome Extension API key
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Profile URL syncing
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
            <BillingActions
              tier="premium"
              currentTier={currentTier}
              apiKey={user.apiKey ?? undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
