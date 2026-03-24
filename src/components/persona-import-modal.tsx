"use client";

import { useState, useRef, useCallback, useTransition, useEffect } from "react";
import { toast } from "sonner";
import {
  Upload,
  Link,
  FileText,
  Loader2,
  Sparkles,
  Brain,
  Search,
  CheckCircle2,
  X,
  Pencil,
  Lock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  importPersonaAction,
  getAiImportStatus,
} from "@/server/actions/persona-import";
import { createPersona } from "@/server/actions/personas";

// ─── Platform presets ──────────────────────────────────────────────────────
const PLATFORMS = [
  {
    name: "LinkedIn",
    icon: "in",
    placeholder: "https://linkedin.com/in/yourname",
    color: "bg-[#0A66C2]",
  },
  {
    name: "Upwork",
    icon: "Up",
    placeholder: "https://upwork.com/freelancers/~yourprofile",
    color: "bg-[#14A800]",
  },
  {
    name: "Fiverr",
    icon: "Fi",
    placeholder: "https://fiverr.com/yourname",
    color: "bg-[#1DBF73]",
  },
] as const;

// ─── Progress steps ────────────────────────────────────────────────────────
const PROGRESS_STEPS = [
  { label: "Parsing content…", icon: Search },
  { label: "Analyzing skills & experience…", icon: Brain },
  { label: "Generating persona…", icon: Sparkles },
] as const;

type CreationMode = "manual" | "url" | "file";

// ─── Character Counter ─────────────────────────────────────────────────────
function CharCount({
  current,
  min,
  max,
}: {
  current: number;
  min: number;
  max: number;
}) {
  const isUnder = current < min && current > 0;
  const isOver = current > max;
  const isNearMax = current > max * 0.9 && current <= max;

  return (
    <span
      className={cn(
        "text-xs tabular-nums transition-colors",
        isOver
          ? "text-destructive font-medium"
          : isUnder
            ? "text-amber-500"
            : isNearMax
              ? "text-amber-500"
              : "text-muted-foreground"
      )}
    >
      {current} / {max}
      {isUnder && ` (min ${min})`}
      {isOver && ` — too long`}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function CreatePersonaModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CreationMode>("manual");
  const [url, setUrl] = useState("");
  const [urlPlaceholder, setUrlPlaceholder] = useState(
    "https://linkedin.com/in/yourname"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [progressStep, setProgressStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual mode state
  const [titleLen, setTitleLen] = useState(0);
  const [contentLen, setContentLen] = useState(0);

  // AI import usage status
  const [aiStatus, setAiStatus] = useState<{
    used: number;
    limit: number;
    locked: boolean;
    isPro: boolean;
  } | null>(null);

  // Fetch AI usage status when modal opens
  useEffect(() => {
    if (open) {
      getAiImportStatus().then(setAiStatus).catch(() => {});
    }
  }, [open]);

  const resetState = useCallback(() => {
    setUrl("");
    setUrlPlaceholder("https://linkedin.com/in/yourname");
    setSelectedFile(null);
    setIsDragging(false);
    setProgressStep(0);
    setTitleLen(0);
    setContentLen(0);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetState();
  }

  function handlePlatformClick(placeholder: string) {
    setMode("url");
    setUrl("");
    setUrlPlaceholder(placeholder);
    setTimeout(() => {
      const input = document.getElementById(
        "persona-import-url"
      ) as HTMLInputElement | null;
      input?.focus();
    }, 50);
  }

  // ─── Drag & drop ──────────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast.error("Only PDF files are supported.");
    }
  }
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast.error("Only PDF files are supported.");
      }
    }
  }

  // ─── Submit: Manual mode ──────────────────────────────────────────────
  function handleManualSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPersona(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Persona created!");
      setOpen(false);
      resetState();
    });
  }

  // ─── Submit: AI mode (URL or File) ────────────────────────────────────
  function handleAISubmit() {
    startTransition(async () => {
      setProgressStep(0);
      const t1 = setTimeout(() => setProgressStep(1), 2000);
      const t2 = setTimeout(() => setProgressStep(2), 5000);

      try {
        const formData = new FormData();
        formData.set("mode", mode);

        if (mode === "url") {
          formData.set("url", url);
        } else if (mode === "file" && selectedFile) {
          formData.set("file", selectedFile);
        }

        const result = await importPersonaAction(formData);
        clearTimeout(t1);
        clearTimeout(t2);

        if (result.error) {
          toast.error(result.error);
          setProgressStep(0);
          return;
        }

        toast.success("🎉 Persona generated from your profile!");
        setOpen(false);
        resetState();
      } catch {
        clearTimeout(t1);
        clearTimeout(t2);
        toast.error("Something went wrong. Please try again.");
        setProgressStep(0);
      }
    });
  }

  const isAiLocked = aiStatus?.locked ?? false;
  const titleValid = titleLen >= 2 && titleLen <= 100;
  const contentValid = contentLen >= 50 && contentLen <= 2000;
  const canSubmitManual = !isPending && titleValid && contentValid;
  const canSubmitUrl = !isPending && url.trim().length > 10 && !isAiLocked;
  const canSubmitFile = !isPending && selectedFile !== null && !isAiLocked;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Persona
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Persona</DialogTitle>
          <DialogDescription>
            Write one manually, paste a profile URL, or upload a resume — the
            AI will generate a polished persona for you.
          </DialogDescription>
        </DialogHeader>

        {/* ── Loading overlay ─────────────────────────────────────────── */}
        {isPending && mode !== "manual" ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="w-full max-w-xs space-y-3">
              {PROGRESS_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === progressStep;
                const isDone = i < progressStep;
                return (
                  <div
                    key={step.label}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300",
                      isActive && "bg-primary/10 text-primary font-medium",
                      isDone && "text-muted-foreground",
                      !isActive && !isDone && "text-muted-foreground/50"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" />
                    )}
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* ── Mode tabs ───────────────────────────────────────────── */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(
                [
                  { key: "manual", label: "Manual", icon: Pencil },
                  { key: "url", label: "Profile URL", icon: Link },
                  { key: "file", label: "Resume PDF", icon: FileText },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isAiTab = tab.key !== "manual";
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setMode(tab.key)}
                    disabled={isPending}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                      tab.key !== "manual" && "border-l border-border",
                      mode === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                      isAiTab && isAiLocked && mode !== tab.key && "opacity-60"
                    )}
                  >
                    {isAiTab && isAiLocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── AI usage indicator (for URL/File tabs) ──────────────── */}
            {mode !== "manual" && aiStatus && !aiStatus.isPro && (
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                  isAiLocked
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span>
                  {isAiLocked
                    ? "Free AI imports used up"
                    : `${aiStatus.used} of ${aiStatus.limit} free AI imports used`}
                </span>
                {isAiLocked && (
                  <a
                    href="/dashboard/billing"
                    className="font-medium underline underline-offset-2 hover:text-destructive/80"
                  >
                    Upgrade to Pro
                  </a>
                )}
              </div>
            )}

            {/* ── MANUAL MODE ─────────────────────────────────────────── */}
            {mode === "manual" && (
              <form action={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="title"
                      className="text-sm font-medium leading-none"
                    >
                      Title
                    </label>
                    <CharCount current={titleLen} min={2} max={100} />
                  </div>
                  <Input
                    id="title"
                    name="title"
                    placeholder='e.g. "React Developer"'
                    onChange={(e) => setTitleLen(e.target.value.length)}
                    required
                    minLength={2}
                    maxLength={100}
                    className={cn(
                      titleLen > 100 &&
                        "border-destructive focus-visible:ring-destructive/50"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="content"
                      className="text-sm font-medium leading-none"
                    >
                      Bio / Skills
                    </label>
                    <CharCount current={contentLen} min={50} max={2000} />
                  </div>
                  <Textarea
                    id="content"
                    name="content"
                    placeholder="Describe your skills, experience, portfolio highlights… (150-300 words works best)"
                    onChange={(e) => setContentLen(e.target.value.length)}
                    required
                    minLength={50}
                    maxLength={2000}
                    rows={6}
                    className={cn(
                      "resize-none overflow-y-auto",
                      contentLen > 2000 &&
                        "border-destructive focus-visible:ring-destructive/50",
                      contentLen > 0 &&
                        contentLen < 50 &&
                        "border-amber-500 focus-visible:ring-amber-500/50"
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!canSubmitManual}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* ── URL MODE ────────────────────────────────────────────── */}
            {mode === "url" && (
              <div className="space-y-4">
                {isAiLocked ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Free imports exhausted</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Upgrade to Pro for unlimited AI persona generation
                        from URLs and resumes.
                      </p>
                    </div>
                    <a
                      href="/dashboard/billing"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Upgrade to Pro
                    </a>
                  </div>
                ) : (
                  <>
                    {/* Platform quick-links */}
                    <div className="flex gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => handlePlatformClick(p.placeholder)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5",
                            "hover:border-primary/40 hover:bg-accent transition-all duration-200 text-xs font-medium",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white",
                              p.color
                            )}
                          >
                            {p.icon}
                          </span>
                          {p.name}
                        </button>
                      ))}
                    </div>

                    <Input
                      id="persona-import-url"
                      type="url"
                      placeholder={urlPlaceholder}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="h-11"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={!canSubmitUrl}
                        onClick={handleAISubmit}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── FILE MODE ───────────────────────────────────────────── */}
            {mode === "file" && (
              <div className="space-y-4">
                {isAiLocked ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Free imports exhausted</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Upgrade to Pro for unlimited AI persona generation
                        from URLs and resumes.
                      </p>
                    </div>
                    <a
                      href="/dashboard/billing"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Upgrade to Pro
                    </a>
                  </div>
                ) : (
                  <>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200",
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.02]"
                          : selectedFile
                            ? "border-green-500/50 bg-green-500/5"
                            : "border-border hover:border-primary/40 hover:bg-accent/50"
                      )}
                    >
                      {selectedFile ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                            <FileText className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="text-muted-foreground"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Remove
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              Drop your resume here
                            </p>
                            <p className="text-xs text-muted-foreground">
                              or click to browse · PDF only · 10 MB max
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={!canSubmitFile}
                        onClick={handleAISubmit}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
