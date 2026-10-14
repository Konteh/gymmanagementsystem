import { AppIcon } from "@/components/app-icon";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TrendChart } from "@/components/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ownerAnalytics } from "@/lib/analytics";
import { requirePageSession } from "@/lib/guard";
import { money, percent, shortDate } from "@/lib/format";
import { syncExpiredMembers } from "@/lib/membership";

export default async function OwnerDashboardPage() {
  const session = await requirePageSession("gym_owner");
  await syncExpiredMembers(session.gymId ?? undefined);
  const stats = await ownerAnalytics(session.gymId!);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={session.gymName ?? "Gym"}
        title="Operations dashboard"
        description="Active members, dues collected, and churn for this gym only."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active members" value={String(stats.activeMembers)} hint={`${stats.totalMembers} total`} icon={<AppIcon name="users" className="size-4" />} />
        <MetricCard label="30-day dues" value={money(stats.revenue)} delta={stats.revenueDelta} icon={<AppIcon name="wallet" className="size-4" />} />
        <MetricCard label="Churn" value={percent(stats.churnRate)} hint={`${stats.lostMembers} lost in period`} icon={<AppIcon name="trending-down" className="size-4" />} />
        <MetricCard label="Check-ins" value={String(stats.checkins)} hint="Last 30 days" icon={<AppIcon name="activity" className="size-4" />} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Member dues trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={stats.revenueTrend} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Newest members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{member.fullName}</p>
                  <p className="text-xs text-muted-foreground">{member.plan.name} · {shortDate(member.joinedAt)}</p>
                </div>
                <StatusBadge status={member.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent dues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{payment.member.fullName}</p>
                  <p className="text-xs text-muted-foreground">{money(Number(payment.amount), payment.currency)}</p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
