import { randomBytes } from "node:crypto";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { phonesMatch } from "@/lib/phone";
import { syncExpiredMembers } from "@/lib/membership";
import type { Gym, Member, MembershipPlan } from "@prisma/client";

export function newCheckInToken() {
  return randomBytes(16).toString("hex");
}

export async function gymByCheckInToken(token: string) {
  const gym = await prisma.gym.findUnique({ where: { checkInToken: token } });
  if (!gym) throw new ApiError(404, "not_found", "That check-in code is not valid.");
  if (gym.status === "rejected" || gym.status === "suspended") {
    throw new ApiError(403, "gym_not_active", "This gym is not accepting check-ins right now.");
  }
  return gym;
}

export async function findMemberByPhone(gymId: string, phone: string) {
  const members = await prisma.member.findMany({
    where: { gymId },
    include: { plan: true },
  });
  return members.find((member) => phonesMatch(member.phone, phone)) ?? null;
}

export function memberCard(
  gym: Pick<Gym, "id" | "name">,
  member: Member & { plan: MembershipPlan },
) {
  const daysLeft = member.expiresAt ? differenceInCalendarDays(member.expiresAt, new Date()) : null;
  return {
    gym_id: gym.id,
    gym_name: gym.name,
    member_id: member.id,
    full_name: member.fullName,
    phone: member.phone,
    plan_name: member.plan.name,
    plan_price: Number(member.plan.price),
    currency: member.plan.currency,
    duration_days: member.plan.durationDays,
    status: member.status,
    expires_at: member.expiresAt?.toISOString() ?? null,
    days_left: daysLeft,
    can_check_in: member.status === "active" && (daysLeft === null || daysLeft >= 0),
  };
}

export async function lookupPublicMember(token: string, phone: string) {
  const gym = await gymByCheckInToken(token);
  await syncExpiredMembers(gym.id);
  const member = await findMemberByPhone(gym.id, phone);
  if (!member) {
    throw new ApiError(404, "not_found", "No member at this gym matches that phone number.");
  }
  const fresh = await prisma.member.findUnique({
    where: { id: member.id },
    include: { plan: true },
  });
  if (!fresh) throw new ApiError(404, "not_found", "No member at this gym matches that phone number.");
  return { gym, member: fresh, card: memberCard(gym, fresh) };
}
