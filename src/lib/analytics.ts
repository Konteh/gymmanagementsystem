import { prisma } from "@/lib/db";

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function ownerAnalytics(gymId: string, days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const priorStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);

  const [active, expired, inactive, members, paid, priorPaid, priorCount, lost, checkins] =
    await Promise.all([
      prisma.member.count({ where: { gymId, status: "active" } }),
      prisma.member.count({ where: { gymId, status: "expired" } }),
      prisma.member.count({ where: { gymId, status: "inactive" } }),
      prisma.member.count({ where: { gymId } }),
      prisma.paymentMember.aggregate({
        where: { gymId, status: "paid", paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.paymentMember.aggregate({
        where: { gymId, status: "paid", paidAt: { gte: priorStart, lt: start } },
        _sum: { amount: true },
      }),
      prisma.member.count({ where: { gymId, joinedAt: { lt: start } } }),
      prisma.member.count({
        where: {
          gymId,
          status: { in: ["inactive", "expired"] },
          updatedAt: { gte: start, lte: end },
        },
      }),
      prisma.attendance.count({
        where: { gymId, checkedInAt: { gte: start, lte: end } },
      }),
    ]);

  const payments = await prisma.paymentMember.findMany({
    where: { gymId, status: "paid", paidAt: { gte: start, lte: end } },
    select: { amount: true, paidAt: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = startOfDay(new Date(start.getTime() + i * 86400000));
    byDay.set(day.toISOString().slice(0, 10), 0);
  }
  for (const payment of payments) {
    if (!payment.paidAt) continue;
    const key = startOfDay(payment.paidAt).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(payment.amount));
  }

  const revenue = Number(paid._sum.amount ?? 0);
  const priorRevenue = Number(priorPaid._sum.amount ?? 0);
  const churn = (lost / Math.max(priorCount, 1)) * 100;
  const revenueDelta =
    priorRevenue === 0 ? (revenue > 0 ? 100 : 0) : ((revenue - priorRevenue) / priorRevenue) * 100;

  const recentMembers = await prisma.member.findMany({
    where: { gymId },
    orderBy: { joinedAt: "desc" },
    take: 6,
    include: { plan: true },
  });

  const recentPayments = await prisma.paymentMember.findMany({
    where: { gymId },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { member: true },
  });

  return {
    periodDays: days,
    activeMembers: active,
    expiredMembers: expired,
    inactiveMembers: inactive,
    totalMembers: members,
    checkins,
    revenue,
    priorRevenue,
    revenueDelta,
    churnRate: Number(churn.toFixed(1)),
    lostMembers: lost,
    revenueTrend: [...byDay.entries()].map(([date, amount]) => ({ date, amount })),
    recentMembers,
    recentPayments,
  };
}

export async function platformAnalytics() {
  const [gyms, owners, members, platformPaid, memberPaid] = await Promise.all([
    prisma.gym.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.count({ where: { role: "gym_owner", ownedGym: { isNot: null } } }),
    prisma.member.count(),
    prisma.paymentPlatform.aggregate({
      where: { status: "paid" },
      _sum: { amount: true },
    }),
    prisma.paymentMember.aggregate({
      where: { status: "paid" },
      _sum: { amount: true },
    }),
  ]);

  const gymCounts = Object.fromEntries(gyms.map((row) => [row.status, row._count._all]));
  const last30 = new Date(Date.now() - 30 * 86400000);
  const recentPlatform = await prisma.paymentPlatform.findMany({
    where: { status: "paid", paidAt: { gte: last30 } },
    select: { amount: true, paidAt: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    byDay.set(day, 0);
  }
  for (const payment of recentPlatform) {
    if (!payment.paidAt) continue;
    const key = payment.paidAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(payment.amount));
  }

  return {
    owners,
    members,
    gyms: {
      pending: gymCounts.pending ?? 0,
      active: gymCounts.active ?? 0,
      rejected: gymCounts.rejected ?? 0,
      suspended: gymCounts.suspended ?? 0,
    },
    platformRevenue: Number(platformPaid._sum.amount ?? 0),
    memberDuesVolume: Number(memberPaid._sum.amount ?? 0),
    revenueTrend: [...byDay.entries()].map(([date, amount]) => ({ date, amount })),
  };
}
