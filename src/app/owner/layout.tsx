import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currentPath, requirePageSession } from "@/lib/guard";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession("gym_owner");
  const path = await currentPath();
  const active = session.gymStatus === "active";
  const allowedWhilePending =
    path.startsWith("/owner/pending") ||
    path === "/owner/settings" ||
    path.startsWith("/owner/members") ||
    path.startsWith("/owner/qr") ||
    path.startsWith("/owner/payments") ||
    path.startsWith("/owner/plans") ||
    path.startsWith("/owner/staff");
  if (!active && !allowedWhilePending) {
    redirect("/owner/pending");
  }
  if (active && path.startsWith("/owner/pending")) {
    redirect("/owner");
  }
  return <AppShell session={session}>{children}</AppShell>;
}
