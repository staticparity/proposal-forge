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
import type { Persona } from "@/db/schema";
import {
  createPersona,
  updatePersona,
  deletePersona,
} from "@/server/actions/personas";

// ─── PersonaForm (Create / Edit) ───────────────────────────────────────────
interface PersonaFormProps {
  persona?: Persona;
  onSuccess?: () => void;
}

export function PersonaForm({ persona, onSuccess }: PersonaFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditing = !!persona;

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
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
            <label
              htmlFor="title"
              className="text-sm font-medium leading-none"
            >
              Title
            </label>
            <Input
              id="title"
              name="title"
              placeholder='e.g. "React Developer"'
              defaultValue={persona?.title ?? ""}
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="content"
              className="text-sm font-medium leading-none"
            >
              Bio / Skills
            </label>
            <Textarea
              id="content"
              name="content"
              placeholder="Describe your skills, experience, portfolio highlights… (150-300 words works best)"
              defaultValue={persona?.content ?? ""}
              required
              minLength={50}
              maxLength={2000}
              rows={8}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              50–2000 characters. Be specific — this powers the AI.
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
            <Button type="submit" disabled={isPending}>
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
      </CardContent>
    </Card>
  );
}
