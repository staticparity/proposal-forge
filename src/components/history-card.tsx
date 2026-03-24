"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Copy, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateGenerationStatus } from "@/server/actions/generations";
import {
  GENERATION_STATUSES,
  type GenerationStatus,
} from "@/db/schema";

const STATUS_CONFIG: Record<
  GenerationStatus,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10 border-zinc-500/20",
  },
  interview: {
    label: "Interview",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  won: {
    label: "Won",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

interface HistoryItem {
  id: string;
  jobDescription: string;
  outputProposal: string | null;
  outputQuestions: string | null;
  outputClientMessage: string | null;
  outputBidAdvice: string | null;
  status: GenerationStatus;
  feedbackNotes: string | null;
  createdAt: Date;
  personaTitle: string | null;
}

export function HistoryCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(item.status);
  const [notes, setNotes] = useState(item.feedbackNotes ?? "");
  const [showNotes, setShowNotes] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleCopy(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleStatusChange(value: string) {
    const newStatus = value as GenerationStatus;
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateGenerationStatus(item.id, newStatus, notes || undefined);
      if (result.success) {
        toast.success(`Status updated to "${STATUS_CONFIG[newStatus].label}"`);
      } else {
        toast.error(result.error ?? "Failed to update status");
        setStatus(item.status); // revert on failure
      }
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await updateGenerationStatus(item.id, status, notes || undefined);
      if (result.success) {
        toast.success("Notes saved");
      } else {
        toast.error(result.error ?? "Failed to save notes");
      }
    });
  }

  const questions: string[] = item.outputQuestions
    ? JSON.parse(item.outputQuestions)
    : [];

  const cfg = STATUS_CONFIG[status];

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base leading-snug line-clamp-1">
                {item.jobDescription.slice(0, 100)}
                {item.jobDescription.length > 100 ? "…" : ""}
              </CardTitle>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
              >
                {cfg.label}
              </span>
            </div>
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
            {/* Status Selector + Notes Toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Status:
                </span>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    if (value) handleStatusChange(value);
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    className="h-8 w-[130px] text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span
                          className={`flex items-center gap-1.5 ${STATUS_CONFIG[s].color}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              s === "pending"
                                ? "bg-zinc-400"
                                : s === "interview"
                                  ? "bg-amber-400"
                                  : s === "won"
                                    ? "bg-emerald-400"
                                    : "bg-red-400"
                            }`}
                          />
                          {STATUS_CONFIG[s].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes(!showNotes);
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {showNotes ? "Hide Notes" : "Add Notes"}
              </Button>
            </div>

            {/* Feedback Notes */}
            {showNotes && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Why did this proposal win or lose? Notes for future reference…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveNotes();
                  }}
                  disabled={isPending}
                >
                  Save Notes
                </Button>
              </div>
            )}

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
