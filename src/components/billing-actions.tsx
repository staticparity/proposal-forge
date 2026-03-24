"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
} from "@/server/actions/billing";

interface BillingActionsProps {
  isPro: boolean;
}

export function BillingActions({ isPro }: BillingActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleUpgrade() {
    startTransition(async () => {
      const result = await createCheckoutSession();
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

  function handleCancel() {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the end of your billing period.")) {
      return;
    }

    startTransition(async () => {
      const result = await cancelSubscription();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscription cancelled. You'll keep Pro access until the end of this billing period.");
    });
  }

  if (isPro) {
    return (
      <div className="space-y-2 mt-2">
        <Button
          onClick={handleManage}
          variant="outline"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Manage Subscription
        </Button>
        <Button
          onClick={handleCancel}
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={isPending}
        >
          Cancel Subscription
        </Button>
      </div>
    );
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
      Upgrade to Pro
    </Button>
  );
}
