import { getUserPersonas } from "@/server/actions/personas";
import { PersonaCard } from "@/components/persona-components";
import { CreatePersonaModal } from "@/components/persona-import-modal";
import { User } from "lucide-react";

export default async function PersonasPage() {
  const userPersonas = await getUserPersonas();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your freelancer profiles. Each persona powers a unique
            proposal style.
          </p>
        </div>
        <CreatePersonaModal />
      </div>

      {/* List */}
      {userPersonas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No personas yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first persona to start generating proposals. Include
            your skills, experience, and portfolio highlights.
          </p>
          <div className="mt-6">
            <CreatePersonaModal />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userPersonas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} />
          ))}
        </div>
      )}
    </div>
  );
}
