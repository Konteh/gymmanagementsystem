import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { TrendChart } from "@/components/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformAnalytics } from "@/lib/analytics";
import { money } from "@/lib/format";

export default async function AdminAnalyticsPage() {
  const stats = await platformAnalytics();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="System analytics"
        description="Aggregates only. Gym member identities, attendance, and dues line items are not included."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Active tenants" value={String(stats.gyms.active)} />
        <MetricCard label="Rejected" value={String(stats.gyms.rejected)} />
        <MetricCard label="Suspended" value={String(stats.gyms.suspended)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Collected platform fees · 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-2xl font-semibold">{money(stats.platformRevenue)}</p>
          <TrendChart data={stats.revenueTrend} color="#2F80ED" />
        </CardContent>
      </Card>
    </div>
  );
}
