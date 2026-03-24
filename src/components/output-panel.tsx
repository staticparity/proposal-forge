"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OutputPanelProps {
  title: string;
  content: string;
}

export function OutputPanel({ title, content }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          disabled={!content}
          className="opacity-60 hover:opacity-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {content || (
            <span className="text-muted-foreground italic">No content</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
