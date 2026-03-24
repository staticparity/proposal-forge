"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface HistoryItem {
  id: string;
  jobDescription: string;
  outputProposal: string | null;
  outputQuestions: string | null;
  outputClientMessage: string | null;
  outputBidAdvice: string | null;
  createdAt: Date;
  personaTitle: string | null;
}

export function HistoryCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function handleCopy(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const questions: string[] = item.outputQuestions
    ? JSON.parse(item.outputQuestions)
    : [];

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base leading-snug line-clamp-1">
              {item.jobDescription.slice(0, 100)}
              {item.jobDescription.length > 100 ? "…" : ""}
            </CardTitle>
            <CardDescription className="text-xs">
              {item.personaTitle ?? "Unknown persona"} •{" "}
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon-sm">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            {item.outputProposal && (
              <Section
                title="📝 Proposal"
                content={item.outputProposal}
                onCopy={() => handleCopy(item.outputProposal!, "proposal")}
                copied={copiedField === "proposal"}
              />
            )}

            {item.outputClientMessage && (
              <Section
                title="💬 Client Message"
                content={item.outputClientMessage}
                onCopy={() =>
                  handleCopy(item.outputClientMessage!, "message")
                }
                copied={copiedField === "message"}
              />
            )}

            {questions.length > 0 && (
              <Section
                title="❓ Smart Questions"
                content={questions
                  .map((q, i) => `${i + 1}. ${q}`)
                  .join("\n")}
                onCopy={() =>
                  handleCopy(
                    questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
                    "questions"
                  )
                }
                copied={copiedField === "questions"}
              />
            )}

            {item.outputBidAdvice && (
              <Section
                title="💰 Bid Advice"
                content={item.outputBidAdvice}
                onCopy={() =>
                  handleCopy(item.outputBidAdvice!, "bid")
                }
                copied={copiedField === "bid"}
              />
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}

function Section({
  title,
  content,
  onCopy,
  copied,
}: {
  title: string;
  content: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCopy}
          className="opacity-60 hover:opacity-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  );
}
