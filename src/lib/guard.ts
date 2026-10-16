import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, type AuthContext } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

const HOME: Record<UserRole, string> = {
  super_admin: "/admin",
  gym_owner: "/owner",
  member: "/",
};

export async function requirePageSession(role: UserRole): Promise<AuthContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== role) redirect(HOME[session.role]);
  if (session.mustChangePassword) redirect("/set-password");
  return session;
}

export async function currentPath() {
  return (await headers()).get("x-pathname") ?? "";
}
