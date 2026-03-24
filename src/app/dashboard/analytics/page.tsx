import { getAnalyticsData, getProfitTrackingData } from "@/server/actions/history";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export default async function AnalyticsPage() {
  const [data, profitData] = await Promise.all([
    getAnalyticsData(),
    getProfitTrackingData(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track your proposal performance, win rate, and profit optimization.
        </p>
      </div>
      <AnalyticsDashboard data={data} profitData={profitData} />
    </div>
  );
}
