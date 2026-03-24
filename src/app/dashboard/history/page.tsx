import { getUserGenerations } from "@/server/actions/history";
import { HistoryCard } from "@/components/history-card";
import { History } from "lucide-react";

export default async function HistoryPage() {
  const historyItems = await getUserGenerations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="mt-1 text-muted-foreground">
          Your past proposals and generations.
        </p>
      </div>

      {historyItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No generations yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Generate your first proposal from the{" "}
            <a
              href="/dashboard"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Dashboard
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyItems.map((item) => (
            <HistoryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
