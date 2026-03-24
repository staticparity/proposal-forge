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
import { Check, CreditCard, Sparkles, Zap } from "lucide-react";

export default async function BillingPage() {
  const user = await ensureUserInDb();
  const generationCount = await getUserGenerationCount();

  if (!user) return null;

  const isPro = user.subscriptionStatus === "pro";
  const maxGenerations = isPro ? PLANS.pro.maxGenerations : PLANS.free.maxGenerations;
  const usagePercent = Math.min(
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
            {generationCount} / {maxGenerations} generations used
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
            {isPro
              ? "Pro plan — up to 1,500 generations per month"
              : "Free plan — upgrade to Pro for 1,500 generations"}
          </p>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free Plan */}
        <Card className={!isPro ? "ring-2 ring-primary" : ""}>
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
                <Check className="h-4 w-4 text-green-500" />5 generations
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited personas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Copy & paste outputs
              </li>
            </ul>
            {!isPro && (
              <p className="text-xs text-primary font-medium pt-2">
                ✓ Current plan
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={isPro ? "ring-2 ring-primary" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Pro</CardTitle>
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
                1,500 generations
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited personas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority AI models
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Full history access
              </li>
            </ul>

            <BillingActions isPro={isPro} />
          </CardContent>
        </Card>
      </div>

      {/* Payment Info */}
      {isPro && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Payment</CardTitle>
            </div>
            <CardDescription>
              Manage your subscription via Stripe
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
