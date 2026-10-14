import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { money, relative, shortDate } from "@/lib/format";
import { syncExpiredMembers } from "@/lib/membership";
import { cn } from "@/lib/utils";
import { PayDuesButton } from "./payments/pay-button";

export default async function MemberHomePage() {
  const session = await requirePageSession("member");
  await syncExpiredMembers(session.gymId ?? undefined);
  const member = await prisma.member.findUnique({
    where: { id: session.memberId! },
    include: { plan: true, gym: true },
  });
  if (!member) return null;

  const [lastPayment, lastVisit, visitCount] = await Promise.all([
    prisma.paymentMember.findFirst({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendance.findFirst({
      where: { memberId: member.id },
      orderBy: { checkedInAt: "desc" },
    }),
    prisma.attendance.count({
      where: {
        memberId: member.id,
        checkedInAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  const firstName = member.fullName.split(" ")[0] ?? member.fullName;
  const daysLeft = member.expiresAt ? differenceInCalendarDays(member.expiresAt, new Date()) : null;
  const windowDays = member.plan.durationDays || 30;
  const remainingPct =
    daysLeft === null ? 100 : Math.min(100, Math.max(0, Math.round((daysLeft / windowDays) * 100)));
  const dueSoon = daysLeft !== null && daysLeft <= 7;
  const expired = member.status === "expired" || (daysLeft !== null && daysLeft < 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={member.gym.name}
        title={`Hello, ${firstName}`}
        description="Your membership, dues in dalasi (GMD), and visits — only yours."
        actions={!expired ? <PayDuesButton /> : undefined}
      />

      {expired ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This membership has ended. Pay current dues to renew, or ask the front desk.
        </div>
      ) : dueSoon ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Your plan {daysLeft === 0 ? "ends today" : `ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}.
          Renew with <span className="font-medium">{money(Number(member.plan.price))}</span> so you stay active.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Current plan</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{member.plan.name}</p>
              </div>
              <StatusBadge status={member.status} />
            </div>
            <p className="text-3xl font-semibold text-ink">{money(Number(member.plan.price))}</p>
            <p className="text-sm text-muted-foreground">
              {member.plan.durationDays}-day access · amounts are GMD, shown as D
            </p>
            {member.expiresAt ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Joined {shortDate(member.joinedAt)}</span>
                  <span>
                    {daysLeft !== null && daysLeft >= 0
                      ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                      : `Ended ${shortDate(member.expiresAt)}`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${remainingPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm">Joined {shortDate(member.joinedAt)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 px-5 py-5">
            <p className="text-sm font-medium">Your gym</p>
            <p className="text-lg font-semibold">{member.gym.name}</p>
            {member.gym.address ? (
              <p className="text-sm text-muted-foreground">{member.gym.address}</p>
            ) : null}
            {member.gym.phone ? (
              <p className="text-sm text-muted-foreground">{member.gym.phone}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Check in at the front desk. This page does not show other members.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 px-5 py-5">
            <p className="text-sm font-medium">Latest dues</p>
            {lastPayment ? (
              <>
                <p className="text-2xl font-semibold">{money(Number(lastPayment.amount))}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lastPayment.status} />
                  <span className="text-sm text-muted-foreground">
                    {shortDate(lastPayment.paidAt ?? lastPayment.createdAt)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No dues recorded yet.</p>
            )}
            <Link href="/member/payments" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              View payment history
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 px-5 py-5">
            <p className="text-sm font-medium">Visits this month</p>
            <p className="text-2xl font-semibold">{visitCount}</p>
            <p className="text-sm text-muted-foreground">
              {lastVisit ? `Last check-in ${relative(lastVisit.checkedInAt)}` : "No check-ins yet"}
            </p>
            <Link href="/member/attendance" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              See all visits
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
