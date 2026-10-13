"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  Building2,
  ClipboardList,
  Dumbbell,
  UserCircle,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api-client";
import type { AuthContext } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV: Record<string, Item[]> = {
  super_admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/owners", label: "Gym owners", icon: Building2 },
    { href: "/admin/payments", label: "Platform payments", icon: Wallet },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/settings", label: "System settings", icon: Settings },
  ],
  gym_owner: [
    { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
    { href: "/owner/members", label: "Members", icon: Users },
    { href: "/owner/payments", label: "Dues", icon: CreditCard },
    { href: "/owner/plans", label: "Plans", icon: ClipboardList },
    { href: "/owner/staff", label: "Staff", icon: Dumbbell },
    { href: "/owner/settings", label: "Gym settings", icon: Settings },
  ],
  member: [
    { href: "/member", label: "Membership", icon: UserCircle },
    { href: "/member/payments", label: "Payments", icon: CreditCard },
    { href: "/member/attendance", label: "Check-ins", icon: ClipboardList },
  ],
};

function NavList({
  items,
  onNavigate,
}: {
  items: Item[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/admin" || item.href === "/owner" || item.href === "/member"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-link"
                : "text-navy/80 hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  session,
  children,
}: {
  session: AuthContext;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items =
    session.role === "gym_owner" && session.gymStatus !== "active"
      ? [
          { href: "/owner/pending", label: "Onboarding", icon: LayoutDashboard },
          { href: "/owner/settings", label: "Gym profile", icon: Settings },
        ]
      : NAV[session.role];

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <Logo />
        {session.gymName ? (
          <p className="mt-3 truncate rounded-lg bg-muted px-2.5 py-2 text-xs font-medium text-navy">
            {session.gymName}
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Platform console</p>
        )}
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <NavList items={items} onNavigate={() => setOpen(false)} />
      </div>
      <Separator />
      <div className="px-4 py-4">
        <p className="truncate text-sm font-medium text-ink">{session.email}</p>
        <p className="text-xs capitalize text-muted-foreground">
          {session.isStaff ? "staff" : session.role.replaceAll("_", " ")}
        </p>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}>
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar md:block">
        {sidebar}
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" />}>
              <Menu className="size-4" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
