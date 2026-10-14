import type {
  Attendance,
  Gym,
  Member,
  MembershipPlan,
  PaymentMember,
  PaymentPlatform,
  User,
} from "@prisma/client";

export function publicUser(user: Pick<User, "id" | "email" | "role" | "status" | "createdAt" | "mustChangePassword">) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    must_change_password: user.mustChangePassword,
    created_at: user.createdAt.toISOString(),
  };
}

export function serializeGym(gym: Gym) {
  return {
    id: gym.id,
    owner_id: gym.ownerId,
    name: gym.name,
    phone: gym.phone,
    email: gym.email,
    address: gym.address,
    status: gym.status,
    status_reason: gym.statusReason,
    settings: safeJson(gym.settingsJson),
    created_at: gym.createdAt.toISOString(),
  };
}

export function serializePlan(plan: MembershipPlan) {
  return {
    id: plan.id,
    gym_id: plan.gymId,
    name: plan.name,
    price: Number(plan.price),
    currency: plan.currency,
    duration_days: plan.durationDays,
    active: plan.active,
  };
}

export function serializeMember(
  member: Member & { plan?: MembershipPlan },
) {
  return {
    id: member.id,
    gym_id: member.gymId,
    user_id: member.userId,
    plan_id: member.planId,
    plan: member.plan ? serializePlan(member.plan) : undefined,
    full_name: member.fullName,
    phone: member.phone,
    email: member.email,
    photo_url: member.photoUrl,
    status: member.status,
    joined_at: member.joinedAt.toISOString(),
    expires_at: member.expiresAt?.toISOString() ?? null,
  };
}

export function serializeMemberPayment(
  payment: PaymentMember & { member?: Pick<Member, "fullName" | "email"> },
) {
  return {
    id: payment.id,
    member_id: payment.memberId,
    gym_id: payment.gymId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    paid_at: payment.paidAt?.toISOString() ?? null,
    provider_ref: payment.providerRef,
    created_at: payment.createdAt.toISOString(),
    member_name: payment.member?.fullName,
    member_email: payment.member?.email,
  };
}

export function serializePlatformPayment(
  payment: PaymentPlatform & { gymOwner?: Pick<User, "email">; gymName?: string },
) {
  return {
    id: payment.id,
    gym_owner_id: payment.gymOwnerId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    paid_at: payment.paidAt?.toISOString() ?? null,
    invoice: payment.invoice,
    provider_ref: payment.providerRef,
    created_at: payment.createdAt.toISOString(),
    owner_email: payment.gymOwner?.email,
    gym_name: payment.gymName,
  };
}

export function serializeAttendance(row: Attendance & { gymName?: string }) {
  return {
    id: row.id,
    member_id: row.memberId,
    gym_id: row.gymId,
    checked_in_at: row.checkedInAt.toISOString(),
    source: row.source,
    gym_name: row.gymName,
  };
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
