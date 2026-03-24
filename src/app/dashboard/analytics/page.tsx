import { getAnalyticsData } from "@/server/actions/history";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track your proposal performance and win rate.
        </p>
      </div>
      <AnalyticsDashboard data={data} />
    </div>
  );
}
