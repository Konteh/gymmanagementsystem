import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { DEFAULT_CURRENCY, PLAN_PRICES } from "@/lib/constants";

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function extendMembership(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { plan: true },
  });
  if (!member) return;
  const basis =
    member.expiresAt && member.expiresAt > new Date() ? member.expiresAt : new Date();
  await prisma.member.update({
    where: { id: memberId },
    data: {
      status: "active",
      expiresAt: addDays(basis, member.plan.durationDays),
    },
  });
}

export async function syncExpiredMembers(gymId?: string) {
  await prisma.member.updateMany({
    where: {
      status: "active",
      expiresAt: { lt: new Date() },
      ...(gymId ? { gymId } : {}),
    },
    data: { status: "expired" },
  });
}

export async function ensureDefaultPlans(gymId: string) {
  const count = await prisma.membershipPlan.count({ where: { gymId } });
  if (count > 0) return;
  await prisma.membershipPlan.createMany({
    data: [
      {
        gymId,
        name: "Day Pass",
        price: PLAN_PRICES.dayPass,
        currency: DEFAULT_CURRENCY,
        durationDays: 1,
        active: true,
      },
      {
        gymId,
        name: "Monthly Unlimited",
        price: PLAN_PRICES.monthly,
        currency: DEFAULT_CURRENCY,
        durationDays: 30,
        active: true,
      },
    ],
  });
}

export async function getPlanForGym(planId: string, gymId: string) {
  let plan = planId
    ? await prisma.membershipPlan.findFirst({ where: { id: planId, gymId } })
    : null;
  if (!plan) {
    await ensureDefaultPlans(gymId);
    plan = await prisma.membershipPlan.findFirst({
      where: { gymId, active: true },
      orderBy: { price: "asc" },
    });
  }
  if (!plan || plan.gymId !== gymId) {
    throw new ApiError(404, "not_found", "Membership plan not found. Add a plan, then register the member.");
  }
  if (!plan.active) {
    throw new ApiError(400, "inactive_plan", "That plan is no longer offered.");
  }
  return plan;
}
