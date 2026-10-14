import { AppIcon } from "@/components/app-icon";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TrendChart } from "@/components/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformAnalytics } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";

export default async function AdminHomePage() {
  const [stats, pendingGyms] = await Promise.all([
    platformAnalytics(),
    prisma.gym.findMany({
      where: { status: "pending" },
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Platform overview"
        description="Commercial activity across gym tenants. Individual member records are out of scope for this role."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active gyms" value={String(stats.gyms.active)} icon={<AppIcon name="building" className="size-4" />} />
        <MetricCard label="Pending reviews" value={String(stats.gyms.pending)} hint={`${stats.gyms.suspended} suspended`} />
        <MetricCard label="Owner accounts" value={String(stats.owners)} icon={<AppIcon name="users" className="size-4" />} />
        <MetricCard
          label="Platform revenue"
          value={money(stats.platformRevenue)}
          hint={`${money(stats.memberDuesVolume)} member dues volume (not visible as PII)`}
          icon={<AppIcon name="wallet" className="size-4" />}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Platform subscription collections</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={stats.revenueTrend} color="#2F80ED" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Waiting on review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingGyms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending gyms.</p>
            ) : (
              pendingGyms.map((gym) => (
                <div key={gym.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{gym.name}</p>
                    <p className="text-xs text-muted-foreground">{gym.owner.email}</p>
                  </div>
                  <StatusBadge status={gym.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
