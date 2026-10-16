import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  applyAuthCookies,
  authFromRequest,
  buildAuthContext,
  clearAuthCookies,
  hashPassword,
  issueSession,
  normalizeEmail,
  persistRefreshToken,
  requireAuth,
  rotateRefreshToken,
  signAccessToken,
  verifyPassword,
  verifyToken,
} from "@/lib/auth";
import { ownerAnalytics, platformAnalytics } from "@/lib/analytics";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE, PLAN_PRICES, PLATFORM_FEE_DEFAULT } from "@/lib/constants";
import { gymByCheckInToken, lookupPublicMember, newCheckInToken } from "@/lib/check-in";
import { normalizePhone } from "@/lib/phone";
import { ApiError, ok, readJson } from "@/lib/http";
import { addDays, getPlanForGym, syncExpiredMembers } from "@/lib/membership";
import {
  acceptMemberPayment,
  applyProviderEvent,
  createMemberIntent,
  demoEventId,
  demoRef,
  recordDeskPayment,
  signWebhook,
  verifyWebhookSignature,
} from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import {
  publicUser,
  serializeAttendance,
  serializeGym,
  serializeMember,
  serializeMemberPayment,
  serializePlan,
  serializePlatformPayment,
} from "@/lib/serializers";
import type { GymStatus } from "@prisma/client";

type RouteCtx = {
  request: NextRequest;
  params: Record<string, string>;
  requestId: string;
};

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  requested_role: z.enum(["gym_owner"]),
  gym_name: z.string().min(2).max(160),
  phone: z.string().max(40).optional(),
  address: z.string().max(400).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const setPasswordSchema = z.object({
  current_password: z.string().min(1),
  password: z.string().min(8).max(72),
});

const ownerStatusSchema = z.object({
  decision: z.enum(["approve", "reject", "suspend"]),
  reason: z.string().max(400).optional(),
});

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const memberSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(40),
  email: z.preprocess(emptyToUndefined, z.string().trim().email().optional()),
  plan_id: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  photo_url: z.preprocess(emptyToUndefined, z.string().max(400000).optional()),
});

const publicPhoneSchema = z.object({
  phone: z.string().trim().min(7).max(40),
});

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, "invalid_input", result.error.issues[0]?.message ?? "Invalid input.");
  }
  return result.data;
}

export async function handleSignup({ request, requestId }: RouteCtx) {
  const body = parse(signupSchema, await readJson(request));
  const email = normalizeEmail(body.email);
  const limited = rateLimit(`signup:${request.headers.get("x-forwarded-for") ?? "local"}`);
  if (!limited.ok) throw new ApiError(429, "rate_limited", "Too many signup attempts. Try later.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "gym_owner") {
      throw new ApiError(409, "role_conflict", "That identity already has a different role.");
    }
    throw new ApiError(409, "account_exists", "An account with that email already exists.");
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash: await hashPassword(body.password),
        role: "gym_owner",
        status: "active",
      },
    });
    const gym = await tx.gym.create({
      data: {
        ownerId: created.id,
        name: body.gym_name,
        phone: body.phone,
        email,
        address: body.address,
        status: "pending",
        checkInToken: newCheckInToken(),
        settingsJson: JSON.stringify({
          currency: DEFAULT_CURRENCY,
          timezone: DEFAULT_TIMEZONE,
          checkin_notes: "Members scan the gym QR code at the door.",
        }),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: created.id,
        gymId: gym.id,
        action: "owner_signup",
        entityType: "gyms",
        entityId: gym.id,
        metadata: "{}",
      },
    });
    await tx.membershipPlan.createMany({
      data: [
        { gymId: gym.id, name: "Monthly Unlimited", price: PLAN_PRICES.monthly, currency: DEFAULT_CURRENCY, durationDays: 30, active: true },
        { gymId: gym.id, name: "Day Pass", price: PLAN_PRICES.dayPass, currency: DEFAULT_CURRENCY, durationDays: 1, active: true },
      ],
    });
    const invoiceCount = await tx.paymentPlatform.count();
    await tx.paymentPlatform.create({
      data: {
        gymOwnerId: created.id,
        amount: PLATFORM_FEE_DEFAULT,
        currency: DEFAULT_CURRENCY,
        status: "pending",
        invoice: `INV-2026-${String(invoiceCount + 1).padStart(4, "0")}`,
      },
    });
    return created;
  });

  const tokens = await issueSession(user.id, user.email, user.role);
  const response = ok(requestId, {
    user: publicUser(user),
    next: "/owner/pending",
  }, 201);
  return applyAuthCookies(response, tokens.access, tokens.refresh, request);
}

export async function handleLogin({ request, requestId }: RouteCtx) {
  const body = parse(loginSchema, await readJson(request));
  const email = normalizeEmail(body.email);
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`login:${ip}:${email}`);
  if (!limited.ok) throw new ApiError(429, "rate_limited", "Too many sign-in attempts. Try later.");

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(body.password, user.passwordHash) : false;
  if (!user || !valid) {
    throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
  }
  if (user.status === "suspended" || user.status === "deleted") {
    throw new ApiError(403, "forbidden", "This account cannot sign in.");
  }
  if (user.role === "member") {
    throw new ApiError(
      403,
      "forbidden",
      "Gym members do not sign in. Scan the gym QR code with your phone camera.",
    );
  }

  const tokens = await issueSession(user.id, user.email, user.role);
  const ctx = await buildAuthContext(user.id);
  const next = user.mustChangePassword
    ? "/set-password"
    : user.role === "super_admin"
      ? "/admin"
      : ctx.gymStatus === "active"
        ? "/owner"
        : "/owner/pending";
  const response = ok(requestId, {
    user: publicUser(user),
    next,
    must_change_password: user.mustChangePassword,
  });
  return applyAuthCookies(response, tokens.access, tokens.refresh, request);
}

export async function handleSetPassword({ request, requestId }: RouteCtx) {
  const ctx = await requireAuth(request, { roles: ["member", "gym_owner", "super_admin"] });
  const body = parse(setPasswordSchema, await readJson(request));
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  const valid = await verifyPassword(body.current_password, user.passwordHash);
  if (!valid) {
    throw new ApiError(400, "invalid_credentials", "Current password is incorrect.");
  }
  if (body.password === body.current_password) {
    throw new ApiError(400, "invalid_input", "Choose a new password that is different from the one-time password.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(body.password),
      mustChangePassword: false,
    },
  });
  const tokens = await issueSession(user.id, user.email, user.role);
  const home = user.role === "super_admin" ? "/admin" : "/owner";
  const response = ok(requestId, { next: home, must_change_password: false });
  return applyAuthCookies(response, tokens.access, tokens.refresh, request);
}

export async function handleRefresh({ request, requestId }: RouteCtx) {
  const token = request.cookies.get("gf_refresh")?.value;
  if (!token) throw new ApiError(401, "unauthenticated", "Session expired. Sign in again.");
  const claims = await verifyToken(token).catch(() => {
    throw new ApiError(401, "unauthenticated", "Session expired. Sign in again.");
  });
  if (claims.typ !== "refresh" || !claims.sub) {
    throw new ApiError(401, "unauthenticated", "Session expired. Sign in again.");
  }
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) throw new ApiError(401, "unauthenticated", "Session expired. Sign in again.");
  const refresh = await rotateRefreshToken(token, user.id);
  const access = await signAccessToken(user.id, user.email, user.role);
  const response = ok(requestId, { ok: true });
  return applyAuthCookies(response, access, refresh, request);
}

export async function handleLogout({ request, requestId }: RouteCtx) {
  const token = request.cookies.get("gf_refresh")?.value;
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: (await import("@/lib/auth")).hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }
  const response = ok(requestId, { ok: true });
  return clearAuthCookies(response);
}

export async function handleSession({ request, requestId }: RouteCtx) {
  const ctx = await authFromRequest(request);
  if (!ctx) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  return ok(requestId, { session: ctx });
}

export async function handleAdminOwners({ request, requestId }: RouteCtx) {
  await requireAuth(request, { roles: ["super_admin"] });
  const owners = await prisma.user.findMany({
    where: { role: "gym_owner", ownedGym: { isNot: null } },
    include: { ownedGym: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    requestId,
    owners.map((owner) => ({
      ...publicUser(owner),
      gym: owner.ownedGym ? serializeGym(owner.ownedGym) : null,
    })),
  );
}

export async function handleOwnerStatus({ request, params, requestId }: RouteCtx) {
  const admin = await requireAuth(request, { roles: ["super_admin"] });
  const body = parse(ownerStatusSchema, await readJson(request));
  const owner = await prisma.user.findUnique({
    where: { id: params.id },
    include: { ownedGym: true },
  });
  if (!owner || owner.role !== "gym_owner" || !owner.ownedGym) {
    throw new ApiError(404, "not_found", "Gym owner not found.");
  }
  const target: GymStatus =
    body.decision === "approve" ? "active" : body.decision === "reject" ? "rejected" : "suspended";

  await prisma.$transaction(async (tx) => {
    await tx.gym.update({
      where: { id: owner.ownedGym!.id },
      data: { status: target, statusReason: body.reason ?? null },
    });
    if (target === "suspended") {
      await tx.user.update({ where: { id: owner.id }, data: { status: "suspended" } });
    } else if (target === "active") {
      await tx.user.update({ where: { id: owner.id }, data: { status: "active" } });
    }
  });

  await writeAudit({
    actorId: admin.userId,
    gymId: owner.ownedGym.id,
    action: "owner_status_changed",
    entityType: "gyms",
    entityId: owner.ownedGym.id,
    metadata: { decision: body.decision, reason: body.reason ?? null },
  });

  const gym = await prisma.gym.findUnique({ where: { id: owner.ownedGym.id } });
  return ok(requestId, { status: target, gym: gym ? serializeGym(gym) : null });
}

export async function handleAdminPlatformPayments({ request, requestId }: RouteCtx) {
  await requireAuth(request, { roles: ["super_admin"] });
  const payments = await prisma.paymentPlatform.findMany({
    include: { gymOwner: { include: { ownedGym: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    requestId,
    payments.map((payment) =>
      serializePlatformPayment({
        ...payment,
        gymName: payment.gymOwner.ownedGym?.name,
      }),
    ),
  );
}

export async function handleAdminAnalytics({ request, requestId }: RouteCtx) {
  await requireAuth(request, { roles: ["super_admin"] });
  return ok(requestId, await platformAnalytics());
}

export async function handleGetAdminSettings({ request, requestId }: RouteCtx) {
  await requireAuth(request, { roles: ["super_admin"] });
  const rows = await prisma.systemSetting.findMany();
  return ok(
    requestId,
    Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)])),
  );
}

export async function handlePutAdminSettings({ request, requestId }: RouteCtx) {
  const admin = await requireAuth(request, { roles: ["super_admin"] });
  const body = await readJson<Record<string, unknown>>(request);
  const entries = Object.entries(body);
  for (const [key, value] of entries) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value), updatedBy: admin.userId },
      update: { value: JSON.stringify(value), updatedBy: admin.userId },
    });
  }
  await writeAudit({
    actorId: admin.userId,
    action: "system_settings_updated",
    entityType: "system_settings",
    metadata: { keys: entries.map(([key]) => key) },
  });
  return handleGetAdminSettings({ request, params: {}, requestId });
}

export async function handleCreateGym({ request, requestId }: RouteCtx) {
  const ctx = await requireAuth(request, { roles: ["gym_owner"] });
  if (ctx.isStaff) {
    throw new ApiError(403, "forbidden", "Staff accounts cannot create a gym.");
  }
  const existing = await prisma.gym.findUnique({ where: { ownerId: ctx.userId } });
  if (existing) {
    return ok(requestId, serializeGym(existing));
  }
  const body = await readJson<{ name: string; phone?: string; email?: string; address?: string }>(request);
  if (!body.name) throw new ApiError(400, "invalid_input", "Gym name is required.");
  const gym = await prisma.gym.create({
    data: {
      ownerId: ctx.userId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      status: "pending",
      checkInToken: newCheckInToken(),
    },
  });
  await writeAudit({
    actorId: ctx.userId,
    gymId: gym.id,
    action: "gym_created",
    entityType: "gyms",
    entityId: gym.id,
  });
  return ok(requestId, serializeGym(gym), 201);
}

export async function handleOwnerDashboard({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true, gymMustBeActive: true },
    params.gymId,
  );
  await syncExpiredMembers(ctx.gymId!);
  return ok(requestId, await ownerAnalytics(ctx.gymId!));
}

export async function handleListMembers({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  await syncExpiredMembers(ctx.gymId!);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const status = url.searchParams.get("status");
  const members = await prisma.member.findMany({
    where: {
      gymId: ctx.gymId!,
      ...(status ? { status: status as "active" | "inactive" | "expired" } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    include: { plan: true },
    orderBy: { joinedAt: "desc" },
  });
  return ok(requestId, members.map(serializeMember));
}

export async function handleRegisterMember({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  if (!ctx.gymId) {
    throw new ApiError(400, "gym_missing", "Your gym profile is not ready yet. Sign out, sign in, and try again.");
  }
  const body = parse(memberSchema, await readJson(request));
  const phone = normalizePhone(body.phone);
  if (phone.replace(/\D/g, "").length < 7) {
    throw new ApiError(400, "invalid_input", "Enter a valid phone number. Members use it to check in.");
  }
  const email = body.email ? normalizeEmail(body.email) : null;
  const plan = await getPlanForGym(body.plan_id, ctx.gymId);

  const existing = await prisma.member.findFirst({
    where: { gymId: ctx.gymId, phone },
  });
  if (existing) {
    throw new ApiError(409, "account_exists", "A member with that phone number is already on your roster.");
  }

  const member = await prisma.member.create({
    data: {
      gymId: ctx.gymId,
      planId: plan.id,
      fullName: body.full_name,
      phone,
      email,
      photoUrl: body.photo_url,
      status: "active",
      expiresAt: addDays(new Date(), plan.durationDays),
    },
    include: { plan: true },
  });

  await writeAudit({
    actorId: ctx.userId,
    gymId: ctx.gymId,
    action: "member_created",
    entityType: "members",
    entityId: member.id,
  });

  return ok(requestId, { member: serializeMember(member) }, 201);
}

export async function handleActivateMemberPayment({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  const payment = await recordDeskPayment({
    memberId: params.memberId,
    gymId: ctx.gymId!,
    actorId: ctx.userId,
  });
  const member = await prisma.member.findUnique({
    where: { id: params.memberId },
    include: { plan: true },
  });
  return ok(requestId, {
    payment: serializeMemberPayment(payment),
    member: member ? serializeMember(member) : null,
  });
}

export async function handlePatchMember({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  const member = await prisma.member.findFirst({
    where: { id: params.memberId, gymId: ctx.gymId! },
  });
  if (!member) throw new ApiError(404, "not_found", "Member not found.");
  const body = await readJson<{ status?: "active" | "inactive" | "expired"; plan_id?: string }>(request);
  const data: { status?: "active" | "inactive" | "expired"; planId?: string } = {};
  if (body.status) data.status = body.status;
  if (body.plan_id) {
    const plan = await getPlanForGym(body.plan_id, ctx.gymId!);
    data.planId = plan.id;
  }
  const updated = await prisma.member.update({
    where: { id: member.id },
    data,
    include: { plan: true },
  });
  await writeAudit({
    actorId: ctx.userId,
    gymId: ctx.gymId,
    action: "member_updated",
    entityType: "members",
    entityId: member.id,
    metadata: body,
  });
  return ok(requestId, serializeMember(updated));
}

export async function handleGymPayments({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  const payments = await prisma.paymentMember.findMany({
    where: { gymId: ctx.gymId! },
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(requestId, payments.map(serializeMemberPayment));
}

export async function handleAcceptMemberPayment({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  const updated = await acceptMemberPayment({
    paymentId: params.paymentId,
    gymId: ctx.gymId!,
    actorId: ctx.userId,
  });
  return ok(requestId, serializeMemberPayment(updated));
}

export async function handleRefundMemberPayment({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  const payment = await prisma.paymentMember.findFirst({
    where: { id: params.paymentId, gymId: ctx.gymId! },
  });
  if (!payment) throw new ApiError(404, "not_found", "Payment not found.");
  if (payment.status !== "paid") {
    throw new ApiError(400, "invalid_state", "Only paid dues can be refunded.");
  }
  const updated = await prisma.paymentMember.update({
    where: { id: payment.id },
    data: { status: "refunded" },
    include: { member: true },
  });
  await writeAudit({
    actorId: ctx.userId,
    gymId: ctx.gymId,
    action: "payment_refunded",
    entityType: "payments_member",
    entityId: payment.id,
  });
  return ok(requestId, serializeMemberPayment(updated));
}

export async function handleGymSettings({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  const gym = await prisma.gym.findUnique({ where: { id: ctx.gymId! } });
  if (!gym) throw new ApiError(404, "not_found", "Gym not found.");
  if (request.method === "PATCH") {
    if (ctx.gymStatus !== "active" && ctx.gymStatus !== "pending") {
      throw new ApiError(403, "forbidden", "This gym cannot be edited in its current status.");
    }
    const body = await readJson<{
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      settings?: Record<string, unknown>;
    }>(request);
    const updated = await prisma.gym.update({
      where: { id: gym.id },
      data: {
        name: body.name ?? gym.name,
        phone: body.phone ?? gym.phone,
        email: body.email ?? gym.email,
        address: body.address ?? gym.address,
        settingsJson: body.settings ? JSON.stringify(body.settings) : gym.settingsJson,
      },
    });
    await writeAudit({
      actorId: ctx.userId,
      gymId: gym.id,
      action: "gym_settings_updated",
      entityType: "gyms",
      entityId: gym.id,
    });
    return ok(requestId, serializeGym(updated));
  }
  return ok(requestId, serializeGym(gym));
}

export async function handlePlans({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  if (request.method === "POST") {
    const body = await readJson<{
      name: string;
      price: number;
      duration_days: number;
      currency?: string;
    }>(request);
    if (!body.name || !body.price || !body.duration_days) {
      throw new ApiError(400, "invalid_input", "Name, price, and duration are required.");
    }
    const plan = await prisma.membershipPlan.create({
      data: {
        gymId: ctx.gymId!,
        name: body.name,
        price: body.price,
        durationDays: body.duration_days,
        currency: body.currency ?? DEFAULT_CURRENCY,
        active: true,
      },
    });
    return ok(requestId, serializePlan(plan), 201);
  }
  const plans = await prisma.membershipPlan.findMany({
    where: { gymId: ctx.gymId! },
    orderBy: { price: "asc" },
  });
  return ok(requestId, plans.map(serializePlan));
}

export async function handleStaff({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  if (ctx.isStaff) throw new ApiError(403, "forbidden", "Only the gym owner can manage staff.");
  if (request.method === "POST") {
    const body = await readJson<{ email: string; title?: string; password?: string }>(request);
    const email = normalizeEmail(body.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== "gym_owner") {
      throw new ApiError(409, "role_conflict", "Staff must use a dedicated staff email.");
    }
    if (existing) throw new ApiError(409, "account_exists", "That email is already in use.");
    const password = body.password ?? `Staff-${Math.random().toString(36).slice(2, 10)}!`;
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
          role: "gym_owner",
          status: "active",
        },
      });
      const admin = await tx.gymAdmin.create({
        data: {
          gymId: ctx.gymId!,
          userId: user.id,
          title: body.title ?? "Front desk",
          permissions: JSON.stringify(["members", "payments", "checkins"]),
        },
      });
      return { user, admin, password };
    });
    await writeAudit({
      actorId: ctx.userId,
      gymId: ctx.gymId,
      action: "staff_created",
      entityType: "gym_admins",
      entityId: created.admin.id,
    });
    return ok(requestId, {
      id: created.admin.id,
      email: created.user.email,
      title: created.admin.title,
      temporary_password: created.password,
    }, 201);
  }
  const staff = await prisma.gymAdmin.findMany({
    where: { gymId: ctx.gymId! },
    include: { user: true },
  });
  return ok(
    requestId,
    staff.map((row) => ({
      id: row.id,
      email: row.user.email,
      title: row.title,
      permissions: JSON.parse(row.permissions),
    })),
  );
}

export async function handleCheckIn({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(
    request,
    { roles: ["gym_owner"], tenantScoped: true },
    params.gymId,
  );
  const body = await readJson<{ member_id: string }>(request);
  const member = await prisma.member.findFirst({
    where: { id: body.member_id, gymId: ctx.gymId! },
  });
  if (!member) throw new ApiError(404, "not_found", "Member not found.");
  if (member.status !== "active") {
    throw new ApiError(400, "inactive_member", "Only active members can check in.");
  }
  const row = await prisma.attendance.create({
    data: { memberId: member.id, gymId: ctx.gymId!, source: "front_desk" },
  });
  return ok(requestId, serializeAttendance(row), 201);
}

export async function handlePublicGym({ request, params, requestId }: RouteCtx) {
  const gym = await gymByCheckInToken(params.token);
  return ok(requestId, {
    name: gym.name,
    address: gym.address,
    phone: gym.phone,
  });
}

export async function handlePublicLookup({ request, params, requestId }: RouteCtx) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`public-lookup:${params.token}:${ip}`, 30, 10 * 60 * 1000);
  if (!limited.ok) throw new ApiError(429, "rate_limited", "Too many attempts. Wait a moment.");
  const body = parse(publicPhoneSchema, await readJson(request));
  const { card } = await lookupPublicMember(params.token, body.phone);
  return ok(requestId, card);
}

export async function handlePublicCheckIn({ request, params, requestId }: RouteCtx) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`public-checkin:${params.token}:${ip}`, 40, 10 * 60 * 1000);
  if (!limited.ok) throw new ApiError(429, "rate_limited", "Too many attempts. Wait a moment.");
  const body = parse(publicPhoneSchema, await readJson(request));
  const { gym, member, card } = await lookupPublicMember(params.token, body.phone);
  if (!card.can_check_in) {
    throw new ApiError(
      400,
      "inactive_member",
      "This membership is not active. Ask the desk to activate payment, or renew below.",
    );
  }
  const recent = await prisma.attendance.findFirst({
    where: {
      memberId: member.id,
      gymId: gym.id,
      checkedInAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    orderBy: { checkedInAt: "desc" },
  });
  if (recent) {
    return ok(requestId, {
      already_checked_in: true,
      attendance: serializeAttendance(recent),
      member: card,
    });
  }
  const row = await prisma.attendance.create({
    data: { memberId: member.id, gymId: gym.id, source: "qr" },
  });
  await writeAudit({
    gymId: gym.id,
    action: "member_checked_in",
    entityType: "attendance",
    entityId: row.id,
    metadata: { source: "qr" },
  });
  return ok(requestId, { already_checked_in: false, attendance: serializeAttendance(row), member: card }, 201);
}

export async function handlePublicPay({ request, params, requestId }: RouteCtx) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`public-pay:${params.token}:${ip}`, 20, 10 * 60 * 1000);
  if (!limited.ok) throw new ApiError(429, "rate_limited", "Too many attempts. Wait a moment.");
  const body = parse(publicPhoneSchema, await readJson(request));
  const { gym, member, card } = await lookupPublicMember(params.token, body.phone);
  const payment = await createMemberIntent({
    memberId: member.id,
    gymId: gym.id,
    amount: Number(member.plan.price),
    currency: member.plan.currency,
  });
  return ok(
    requestId,
    {
      payment: serializeMemberPayment(payment),
      member: card,
      message: "Payment sent to the desk. Staff will activate your membership once it is confirmed.",
    },
    201,
  );
}

export async function handleMe({ request, requestId }: RouteCtx) {
  const ctx = await requireAuth(request, { roles: ["member"], ownMemberOnly: true });
  await syncExpiredMembers(ctx.gymId ?? undefined);
  const member = await prisma.member.findUnique({
    where: { id: ctx.memberId! },
    include: { plan: true, gym: true },
  });
  if (!member) throw new ApiError(404, "not_found", "Membership not found.");
  return ok(requestId, {
    profile: serializeMember(member),
    gym: { id: member.gym.id, name: member.gym.name, address: member.gym.address, phone: member.gym.phone },
  });
}

export async function handleMyAttendance({ request, requestId }: RouteCtx) {
  const ctx = await requireAuth(request, { roles: ["member"], ownMemberOnly: true });
  const rows = await prisma.attendance.findMany({
    where: { memberId: ctx.memberId! },
    orderBy: { checkedInAt: "desc" },
    take: 100,
  });
  return ok(
    requestId,
    rows.map((row) => serializeAttendance({ ...row, gymName: ctx.gymName ?? undefined })),
  );
}

export async function handleMyPaymentIntent({ request, requestId }: RouteCtx) {
  const ctx = await requireAuth(request, { roles: ["member"], ownMemberOnly: true });
  const member = await prisma.member.findUnique({
    where: { id: ctx.memberId! },
    include: { plan: true },
  });
  if (!member) throw new ApiError(404, "not_found", "Membership not found.");
  const payment = await createMemberIntent({
    memberId: member.id,
    gymId: member.gymId,
    amount: Number(member.plan.price),
    currency: member.plan.currency,
    actorId: ctx.userId,
  });
  return ok(requestId, {
    payment: serializeMemberPayment(payment),
    checkout_url: `/pay/${payment.id}?kind=member`,
  }, 201);
}

export async function handlePlatformPay({ request, params, requestId }: RouteCtx) {
  const ctx = await requireAuth(request, { roles: ["gym_owner"] });
  const invoice = await prisma.paymentPlatform.findUnique({ where: { id: params.id } });
  if (!invoice || invoice.gymOwnerId !== ctx.userId) {
    throw new ApiError(404, "not_found", "Invoice not found.");
  }
  if (invoice.status === "paid") {
    throw new ApiError(400, "invalid_state", "This invoice is already paid.");
  }
  return ok(requestId, {
    payment: serializePlatformPayment(invoice),
    checkout_url: `/pay/${invoice.id}?kind=platform`,
  });
}

export async function handleOwnerInvoices({ request, requestId }: RouteCtx) {
  const ctx = await requireAuth(request, { roles: ["gym_owner"] });
  const invoices = await prisma.paymentPlatform.findMany({
    where: { gymOwnerId: ctx.userId },
    orderBy: { createdAt: "desc" },
  });
  return ok(requestId, invoices.map(serializePlatformPayment));
}

export async function handleWebhook({ request, params, requestId }: RouteCtx) {
  const payload = await request.text();
  const signature = request.headers.get("x-gymflow-signature");
  if (!verifyWebhookSignature(payload, signature)) {
    throw new ApiError(401, "invalid_signature", "Webhook signature is invalid.");
  }
  const event = JSON.parse(payload) as {
    id: string;
    kind: "member" | "platform";
    payment_id: string;
    status: "succeeded" | "failed" | "canceled";
    ref: string;
  };
  const result = await applyProviderEvent({
    provider: params.provider,
    eventId: event.id,
    kind: event.kind,
    paymentId: event.payment_id,
    status: event.status,
    ref: event.ref,
  });
  return ok(requestId, { applied: !result.duplicate, duplicate: result.duplicate });
}

export async function handleDemoCheckout({ request, params, requestId }: RouteCtx) {
  const body = await readJson<{ kind: "member" | "platform"; outcome: "succeeded" | "failed" }>(request);
  const event = {
    id: demoEventId(),
    kind: body.kind,
    payment_id: params.id,
    status: body.outcome,
    ref: demoRef(),
  };
  const payload = JSON.stringify(event);
  const result = await applyProviderEvent({
    provider: "demo",
    eventId: event.id,
    kind: event.kind,
    paymentId: event.payment_id,
    status: event.status,
    ref: event.ref,
  });
  return ok(requestId, {
    applied: !result.duplicate,
    signature: signWebhook(payload),
    event,
  });
}

export async function handlePaymentLookup({ request, params, requestId }: RouteCtx) {
  const ctx = await authFromRequest(request);
  if (!ctx) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind === "platform") {
    const invoice = await prisma.paymentPlatform.findUnique({ where: { id: params.id } });
    if (!invoice) throw new ApiError(404, "not_found", "Invoice not found.");
    if (ctx.role !== "super_admin" && invoice.gymOwnerId !== ctx.userId) {
      throw new ApiError(403, "forbidden", "You cannot view this invoice.");
    }
    return ok(requestId, { kind: "platform", payment: serializePlatformPayment(invoice) });
  }
  const payment = await prisma.paymentMember.findUnique({
    where: { id: params.id },
    include: { member: true },
  });
  if (!payment) throw new ApiError(404, "not_found", "Payment not found.");
  const allowed =
    (ctx.role === "member" && payment.memberId === ctx.memberId) ||
    (ctx.role === "gym_owner" && payment.gymId === ctx.gymId);
  if (!allowed) throw new ApiError(403, "forbidden", "You cannot view this payment.");
  return ok(requestId, { kind: "member", payment: serializeMemberPayment(payment) });
}

export { persistRefreshToken };
