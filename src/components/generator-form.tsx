"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OutputPanel } from "@/components/output-panel";
import { saveGeneration } from "@/server/actions/generations";
import type { Persona } from "@/db/schema";

interface ProposalOutput {
  proposal?: string;
  clientMessage?: string;
  questions?: string[];
  bidAdvice?: string;
}

interface GeneratorFormProps {
  personas: Persona[];
}

export function GeneratorForm({ personas }: GeneratorFormProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<ProposalOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

  const handleGenerate = useCallback(async () => {
    if (!selectedPersona) {
      toast.error("Please select a persona first.");
      return;
    }
    if (jobDescription.length < 20) {
      toast.error("Job description must be at least 20 characters.");
      return;
    }

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setOutput(null);
    setError(null);
    setHasSaved(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaContent: selectedPersona.content,
          personaTitle: selectedPersona.title,
          jobDescription,
          personaId: selectedPersona.id,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Try to parse the accumulated buffer as JSON
        // streamObject sends partial JSON that grows over time
        try {
          const parsed = JSON.parse(buffer);
          setOutput(parsed);
        } catch {
          // Not valid JSON yet — keep accumulating
          // Try to find the last complete JSON object in the stream
          const lastNewline = buffer.lastIndexOf("\n");
          if (lastNewline !== -1) {
            const lastLine = buffer.slice(lastNewline + 1).trim();
            const prevLine = buffer.slice(0, lastNewline).split("\n").pop()?.trim();
            const lineToTry = lastLine || prevLine;
            if (lineToTry) {
              try {
                const parsed = JSON.parse(lineToTry);
                setOutput(parsed);
              } catch {
                // still not valid
              }
            }
          }
        }
      }

      // Final parse
      buffer += decoder.decode();
      try {
        const finalParsed = JSON.parse(buffer);
        setOutput(finalParsed);
      } catch {
        // Try last line
        const lines = buffer.trim().split("\n").filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            setOutput(parsed);
            break;
          } catch {
            // try previous line
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPersona, jobDescription]);

  const handleSave = useCallback(async () => {
    if (!output?.proposal || hasSaved) return;

    const result = await saveGeneration({
      personaId: selectedPersonaId || undefined,
      jobDescription,
      outputProposal: output.proposal ?? "",
      outputQuestions: JSON.stringify(output.questions ?? []),
      outputClientMessage: output.clientMessage ?? "",
      outputBidAdvice: output.bidAdvice ?? "",
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Generation saved to history!");
      setHasSaved(true);
    }
  }, [output, hasSaved, selectedPersonaId, jobDescription]);

  const hasOutput = !!(
    output?.proposal ||
    output?.clientMessage ||
    output?.questions?.length ||
    output?.bidAdvice
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* ── Left: Input Form ─────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Persona</label>
          {personas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No personas yet.{" "}
              <a
                href="/dashboard/personas"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Create one first
              </a>
              .
            </p>
          ) : (
            <Select
              value={selectedPersonaId}
              onValueChange={(val) => setSelectedPersonaId(val ?? "")}
            >
              <SelectTrigger id="persona-select">
                <SelectValue placeholder="Select a persona…" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="job-description" className="text-sm font-medium">
            Job Description
          </label>
          <Textarea
            id="job-description"
            placeholder="Paste the full job description here…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {jobDescription.length} characters
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={
            isLoading || !selectedPersonaId || jobDescription.length < 20
          }
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Proposal
            </>
          )}
        </Button>

        {error && (
          <p className="text-sm text-destructive">Error: {error}</p>
        )}
      </div>

      {/* ── Right: Output Stream ─────────────────────────────────────── */}
      <div className="space-y-4">
        {isLoading && !hasOutput && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        )}

        {hasOutput && (
          <>
            <OutputPanel
              title="📝 Proposal"
              content={output?.proposal ?? ""}
              isStreaming={isLoading}
            />

            <OutputPanel
              title="💬 Client Message"
              content={output?.clientMessage ?? ""}
              isStreaming={isLoading}
            />

            {(output?.questions?.length ?? 0) > 0 && (
              <OutputPanel
                title="❓ Smart Questions"
                content={
                  output?.questions
                    ?.map((q, i) => `${i + 1}. ${q}`)
                    .join("\n") ?? ""
                }
                isStreaming={isLoading}
              />
            )}

            <OutputPanel
              title="💰 Bid Advice"
              content={output?.bidAdvice ?? ""}
              isStreaming={isLoading}
            />

            {!isLoading && (
              <Button
                onClick={handleSave}
                disabled={hasSaved}
                variant="outline"
                className="w-full"
              >
                {hasSaved ? "✓ Saved to History" : "Save to History"}
              </Button>
            )}
          </>
        )}

        {!isLoading && !hasOutput && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Your generated proposal will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
