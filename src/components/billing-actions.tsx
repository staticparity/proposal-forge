"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  createCheckoutSession,
  createPortalSession,
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

  if (isPro) {
    return (
      <Button
        onClick={handleManage}
        variant="outline"
        className="w-full mt-2"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Manage Subscription
      </Button>
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
