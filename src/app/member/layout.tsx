import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requirePageSession } from "@/lib/guard";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession("member");
  return <AppShell session={session}>{children}</AppShell>;
}
