import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { money, shortDate } from "@/lib/format";
import { syncExpiredMembers } from "@/lib/membership";

export default async function MemberHomePage() {
  const session = await requirePageSession("member");
  await syncExpiredMembers(session.gymId ?? undefined);
  const member = await prisma.member.findUnique({
    where: { id: session.memberId! },
    include: { plan: true, gym: true },
  });
  if (!member) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={member.gym.name}
        title={member.fullName}
        description="Your membership, plan, and renewal window. Other members are not visible here."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={member.status} />
            </div>
            <p className="text-2xl font-semibold">{member.plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {money(Number(member.plan.price), member.plan.currency)} · {member.plan.durationDays} days
            </p>
            <p className="text-sm">
              Joined {shortDate(member.joinedAt)}
              {member.expiresAt ? ` · renews or expires ${shortDate(member.expiresAt)}` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 px-5 py-5">
            <p className="text-sm font-medium">Your gym</p>
            <p className="text-lg font-semibold">{member.gym.name}</p>
            <p className="text-sm text-muted-foreground">{member.gym.address}</p>
            <p className="text-sm text-muted-foreground">{member.gym.phone}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
