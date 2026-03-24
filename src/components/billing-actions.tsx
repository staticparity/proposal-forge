"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Key, Copy, Check, Eye, EyeOff } from "lucide-react";
import {
  createCheckoutSession,
  createPortalSession,
  generateApiKey,
} from "@/server/actions/billing";

interface BillingActionsProps {
  tier: "basic" | "premium";
  currentTier: "free" | "basic" | "premium";
  apiKey?: string;
}

export function BillingActions({ tier, currentTier, apiKey }: BillingActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [localApiKey, setLocalApiKey] = useState<string | undefined>(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  function handleUpgrade() {
    startTransition(async () => {
      const result = await createCheckoutSession(tier);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  function handleManage() {
    startTransition(async () => {
      const result = await createPortalSession();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  function handleGenerateApiKey() {
    startTransition(async () => {
      const result = await generateApiKey();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.apiKey) {
        setLocalApiKey(result.apiKey);
        setShowKey(true);
        toast.success("API key generated! Store it securely.");
      }
    });
  }

  async function handleCopyKey() {
    if (localApiKey) {
      await navigator.clipboard.writeText(localApiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  const isCurrentTier = currentTier === tier;
  const isHigherTier = (tier === "basic" && currentTier === "premium") ||
    (tier === "premium" && currentTier === "premium");
  const isPaid = currentTier !== "free";

  // Show "Manage Subscription" if this is the current tier
  if (isCurrentTier) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-primary font-medium">✓ Current plan</p>
          <Button
            onClick={handleManage}
            variant="outline"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Manage Subscription
          </Button>
        </div>

        {/* API Key section — only for premium tier */}
        {tier === "premium" && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">Chrome Extension API Key</span>
            </div>
            {localApiKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono break-all">
                    {showKey ? localApiKey : "pf_••••••••••••••••••••••••"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCopyKey}
                  >
                    {copiedKey ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleGenerateApiKey}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Regenerate Key
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={handleGenerateApiKey}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Key className="mr-1 h-3.5 w-3.5" />
                )}
                Generate API Key
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Don't show upgrade button for a lower tier if user is on higher
  if (tier === "basic" && currentTier === "premium") {
    return null;
  }

  return (
    <Button
      onClick={handleUpgrade}
      className="w-full mt-2"
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : null}
      {isPaid ? `Upgrade to ${tier === "premium" ? "Premium" : "Basic"}` : `Upgrade to ${tier === "premium" ? "Premium" : "Basic"}`}
    </Button>
  );
}
