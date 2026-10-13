import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";

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

export async function getPlanForGym(planId: string, gymId: string) {
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.gymId !== gymId) {
    throw new ApiError(404, "not_found", "Membership plan not found.");
  }
  if (!plan.active) {
    throw new ApiError(400, "inactive_plan", "That plan is no longer offered.");
  }
  return plan;
}
