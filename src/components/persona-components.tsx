"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Persona } from "@/db/schema";
import {
  createPersona,
  updatePersona,
  deletePersona,
} from "@/server/actions/personas";

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

// ─── PersonaForm (Create / Edit) ───────────────────────────────────────────
interface PersonaFormProps {
  persona?: Persona;
  onSuccess?: () => void;
}

export function PersonaForm({ persona, onSuccess }: PersonaFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [titleLen, setTitleLen] = useState(persona?.title?.length ?? 0);
  const [contentLen, setContentLen] = useState(
    persona?.content?.length ?? 0
  );
  const [rate, setRate] = useState(
    persona?.baseHourlyRate ? persona.baseHourlyRate / 100 : 0
  );
  const isEditing = !!persona;

  const titleValid = titleLen >= 2 && titleLen <= 100;
  const contentValid = contentLen >= 50 && contentLen <= 2000;

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      // Convert dollar input → cents for storage
      const rawRate = Number(formData.get("baseHourlyRate") || 0);
      formData.set("baseHourlyRate", String(Math.round(rawRate * 100)));

      if (isEditing) {
        formData.set("id", persona.id);
      }
      const result = isEditing
        ? await updatePersona(formData)
        : await createPersona(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEditing ? "Persona updated!" : "Persona created!"
      );
      setOpen(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEditing ? (
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
      ) : (
        <DialogTrigger
          render={
            <Button>
              <User className="mr-2 h-4 w-4" />
              New Persona
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Persona" : "Create Persona"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your freelancer profile."
              : "Add a new freelancer profile for proposal generation."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
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
              defaultValue={persona?.title ?? ""}
              onChange={(e) => setTitleLen(e.target.value.length)}
              required
              minLength={2}
              maxLength={100}
              className={cn(
                titleLen > 100 && "border-destructive focus-visible:ring-destructive/50"
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
              defaultValue={persona?.content ?? ""}
              onChange={(e) => setContentLen(e.target.value.length)}
              required
              minLength={50}
              maxLength={2000}
              rows={8}
              className={cn(
                "resize-none overflow-y-auto",
                contentLen > 2000 && "border-destructive focus-visible:ring-destructive/50",
                contentLen > 0 && contentLen < 50 && "border-amber-500 focus-visible:ring-amber-500/50"
              )}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="baseHourlyRate"
              className="text-sm font-medium leading-none"
            >
              Target Hourly Rate ($)
            </label>
            <Input
              id="baseHourlyRate"
              name="baseHourlyRate"
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 75"
              value={rate || ""}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">
              Used to calculate optimal bids and track your effective rate.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !titleValid || !contentValid}
            >
              {isPending
                ? "Saving…"
                : isEditing
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── PersonaCard ───────────────────────────────────────────────────────────
interface PersonaCardProps {
  persona: Persona;
}

export function PersonaCard({ persona }: PersonaCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this persona? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deletePersona(persona.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Persona deleted.");
    });
  }

  return (
    <Card className="group relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{persona.title}</CardTitle>
            <CardDescription className="text-xs">
              Created{" "}
              {persona.createdAt
                ? new Date(persona.createdAt).toLocaleDateString()
                : "recently"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <PersonaForm persona={persona} />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-3">
        <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
          {persona.content}
        </p>
        {persona.baseHourlyRate > 0 && (
          <p className="mt-2 text-xs font-medium text-emerald-500">
            💰 ${(persona.baseHourlyRate / 100).toFixed(0)}/hr
          </p>
        )}
      </CardContent>
    </Card>
  );
}
