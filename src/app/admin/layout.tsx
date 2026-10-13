import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requirePageSession } from "@/lib/guard";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession("super_admin");
  return <AppShell session={session}>{children}</AppShell>;
}
