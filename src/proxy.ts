import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_ACCESS, JWT_SECRET } from "@/lib/constants";

const secret = new TextEncoder().encode(JWT_SECRET);

const ROLE_HOME: Record<string, string> = {
  super_admin: "/admin",
  gym_owner: "/owner",
  member: "/member",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_ACCESS)?.value;
  let role: string | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.typ === "access") role = String(payload.role ?? "");
    } catch {
      role = null;
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isSetPassword = pathname === "/set-password";
  const isAdmin = pathname.startsWith("/admin");
  const isOwner = pathname.startsWith("/owner");
  const isMember = pathname.startsWith("/member");
  const isPay = pathname.startsWith("/pay");

  if (isAuthPage && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", request.url));
  }

  if ((isAdmin || isOwner || isMember || isPay || isSetPassword) && !role) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAdmin && role !== "super_admin") {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? ""] ?? "/", request.url));
  }
  if (isOwner && role !== "gym_owner") {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? ""] ?? "/", request.url));
  }
  if (isMember && role !== "member") {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? ""] ?? "/", request.url));
  }

  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/admin",
    "/admin/:path*",
    "/owner",
    "/owner/:path*",
    "/member",
    "/member/:path*",
    "/pay/:path*",
    "/set-password",
  ],
};
