import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const HOME: Record<string, string> = {
  super_admin: "/admin",
  gym_owner: "/owner",
  member: "/member",
};

export default async function SetPasswordLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/set-password");
  }
  if (!session.mustChangePassword) {
    redirect(HOME[session.role] ?? "/");
  }
  return children;
}
