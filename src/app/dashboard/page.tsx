import { getUserPersonas } from "@/server/actions/personas";
import { GeneratorForm } from "@/components/generator-form";

export default async function DashboardPage() {
  const personas = await getUserPersonas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Generate winning proposals in seconds.
        </p>
      </div>
      <GeneratorForm personas={personas} />
    </div>
  );
}
