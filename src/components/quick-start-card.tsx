"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createQuickStartPersona } from "@/server/actions/personas";

export function QuickStartCard() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleQuickStart() {
    startTransition(async () => {
      const result = await createQuickStartPersona();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("🚀 Starter persona created! You're ready to generate.");
      router.refresh();
    });
  }

  return (
    <Card className="relative overflow-hidden border-dashed border-2 border-primary/30">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Rocket className="h-7 w-7 text-primary animate-pulse" />
        </div>
        <CardTitle className="text-xl">Welcome to ProposalForge!</CardTitle>
        <CardDescription className="text-sm max-w-md mx-auto">
          You need at least one Persona to start generating proposals. Create
          one from scratch, or get started instantly with our template.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-6">
        <Button
          onClick={handleQuickStart}
          disabled={isPending}
          size="lg"
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Quick Start — Full-Stack Developer
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">or</span>
        <a
          href="/dashboard/personas"
          className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Create Your Own
        </a>
      </CardContent>
    </Card>
  );
}
