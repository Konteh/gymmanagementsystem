import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ACCESS_TTL_SECONDS,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  JWT_SECRET,
  REFRESH_TTL_SECONDS,
} from "@/lib/constants";
import { ApiError } from "@/lib/http";
import type { GymStatus, UserRole, UserStatus } from "@prisma/client";

const secret = new TextEncoder().encode(JWT_SECRET);

export type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  gymId: string | null;
  gymStatus: GymStatus | null;
  gymName: string | null;
  memberId: string | null;
  isStaff: boolean;
  mustChangePassword: boolean;
};

type TokenClaims = JWTPayload & {
  sub: string;
  role: UserRole;
  email: string;
  typ: "access" | "refresh";
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(userId: string, email: string, role: UserRole) {
  return new SignJWT({ role, email, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secret);
}

export async function signRefreshToken(userId: string) {
  return new SignJWT({ typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(randomBytes(16).toString("hex"))
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL_SECONDS}s`)
    .sign(secret);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as TokenClaims;
}

export async function buildAuthContext(userId: string): Promise<AuthContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedGym: true,
      gymAdmins: { include: { gym: true } },
      memberProfile: true,
    },
  });
  if (!user || user.status === "deleted") {
    throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  }

  let gymId: string | null = null;
  let gymStatus: GymStatus | null = null;
  let gymName: string | null = null;
  let isStaff = false;

  if (user.ownedGym) {
    gymId = user.ownedGym.id;
    gymStatus = user.ownedGym.status;
    gymName = user.ownedGym.name;
  } else if (user.gymAdmins[0]) {
    gymId = user.gymAdmins[0].gymId;
    gymStatus = user.gymAdmins[0].gym.status;
    gymName = user.gymAdmins[0].gym.name;
    isStaff = true;
  } else if (user.memberProfile) {
    gymId = user.memberProfile.gymId;
    const gym = await prisma.gym.findUnique({ where: { id: user.memberProfile.gymId } });
    gymStatus = gym?.status ?? null;
    gymName = gym?.name ?? null;
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    gymId,
    gymStatus,
    gymName,
    memberId: user.memberProfile?.id ?? null,
    isStaff,
    mustChangePassword: user.mustChangePassword,
  };
}

function cookieSecure(request?: NextRequest) {
  const forwarded = request?.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  if (request?.nextUrl.protocol === "https:") return true;
  return false;
}

export function applyAuthCookies(
  response: NextResponse,
  access: string,
  refresh: string,
  request?: NextRequest,
) {
  const secure = cookieSecure(request);
  response.cookies.set(COOKIE_ACCESS, access, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  response.cookies.set(COOKIE_REFRESH, refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(COOKIE_ACCESS, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(COOKIE_REFRESH, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export async function persistRefreshToken(userId: string, refresh: string) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    },
  });
}

export async function rotateRefreshToken(oldToken: string, userId: string) {
  const oldHash = hashToken(oldToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!existing || existing.userId !== userId || existing.revokedAt || existing.expiresAt < new Date()) {
    throw new ApiError(401, "unauthenticated", "Session expired. Sign in again.");
  }
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  const next = await signRefreshToken(userId);
  await persistRefreshToken(userId, next);
  return next;
}

export async function issueSession(userId: string, email: string, role: UserRole) {
  const access = await signAccessToken(userId, email, role);
  const refresh = await signRefreshToken(userId);
  await persistRefreshToken(userId, refresh);
  return { access, refresh };
}

export async function authFromRequest(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  try {
    const claims = await verifyToken(token);
    if (claims.typ !== "access" || !claims.sub) return null;
    return buildAuthContext(claims.sub);
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  try {
    const claims = await verifyToken(token);
    if (claims.typ !== "access" || !claims.sub) return null;
    return buildAuthContext(claims.sub);
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest,
  policy: {
    roles: UserRole[];
    tenantScoped?: boolean;
    gymMustBeActive?: boolean;
    ownMemberOnly?: boolean;
  },
  gymId?: string | null,
): Promise<AuthContext> {
  const ctx = await authFromRequest(request);
  if (!ctx) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  if (ctx.status === "suspended" || ctx.status === "deleted") {
    throw new ApiError(403, "forbidden", "This account is not allowed to perform that action.");
  }
  if (!policy.roles.includes(ctx.role) && !(ctx.isStaff && policy.roles.includes("gym_owner"))) {
    throw new ApiError(403, "forbidden", "You do not have permission for this action.");
  }
  if (policy.tenantScoped) {
    const targetGym = gymId ?? ctx.gymId;
    if (!targetGym || !ctx.gymId || targetGym !== ctx.gymId) {
      throw new ApiError(403, "forbidden", "That record is outside your gym.");
    }
  }
  if (policy.gymMustBeActive && ctx.gymStatus !== "active") {
    throw new ApiError(
      403,
      "gym_not_active",
      ctx.gymStatus === "pending"
        ? "Your gym is waiting for platform approval."
        : "This gym cannot use administration tools in its current status.",
    );
  }
  if (policy.ownMemberOnly && !ctx.memberId) {
    throw new ApiError(403, "forbidden", "Member profile not found.");
  }
  return ctx;
}
