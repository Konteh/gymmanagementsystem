"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  CreditCard,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const trust = [
  "Bakau Powerhouse",
  "Brikama Motion",
  "Banjul Harbor Gym",
  "Lamin Boxing Club",
  "Serekunda Fit",
  "Kotu Iron",
];

const features = [
  {
    value: "members",
    label: "Members",
    title: "Register a new member in under a minute",
    copy: "Owners capture name, phone, and plan. No member account, no extra fields, no class booking clutter. The desk stays the source of truth.",
    points: [
      "Quick registration with plan and due date",
      "Active, inactive, and expired status at a glance",
      "Desk check-in or QR check-in at the door",
    ],
  },
  {
    value: "payments",
    label: "Payments",
    title: "Keep platform fees and member dues in separate ledgers",
    copy: "Gym owners pay GymFlow. Members pay their gym. Super admins never see individual dues, and members never see another member’s balance.",
    points: [
      "Owner-to-platform invoices with auditable status",
      "Member dues intents with webhook-finalized states",
      "Refunds require confirmation and leave an audit trail",
    ],
  },
  {
    value: "analytics",
    label: "Analytics",
    title: "See retention and revenue without a BI project",
    copy: "Each gym dashboard is tenant-scoped: active members, dues collected, churn, and a 30-day revenue trend. Super admins get platform aggregates only.",
    points: [
      "Own-gym metrics for owners and delegated staff",
      "System-wide commercial analytics for Super Admin",
      "Bounded date ranges — no unbounded table scans",
    ],
  },
  {
    value: "access",
    label: "Access",
    title: "Owners run the gym. Members just scan.",
    copy: "Super Admin onboards gyms. Gym owners add people, print one QR, and activate payments. Members never create an account. Deny-by-default authorization sits next to every owner query.",
    points: [
      "One printed QR per gym, scanned with the phone camera",
      "Phone number is how the door page finds the member",
      "No Classes module — on purpose, for this release",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-navy/80 md:flex">
            <Link href="/demo" className="hover:text-ink">
              Demo flow
            </Link>
            <a href="#features" className="hover:text-ink">
              Product
            </a>
            <a href="#roles" className="hover:text-ink">
              Roles
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Log in
            </Link>
            <Link href="/signup" className={cn(buttonVariants())}>
              Start your gym
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            For independent Gambian gyms
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Modern gym management that stays out of the way.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            GymFlow hosts many gyms on one platform, with a hard wall between
            tenants.             Owners register members at the desk. Members never log in — they
            scan a printed QR with the phone camera, check in, and renew if
            they need to. Super Admins onboard gyms, not rummage through
            member files.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/demo" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
              Present the prototype
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}
            >
              Log in
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Demo password for seeded accounts: <span className="font-medium text-ink">gymflow-demo</span>
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border bg-[#0f2238] shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80"
            alt="Athletes training in a well-lit gym"
            className="h-80 w-full object-cover opacity-80 sm:h-[28rem]"
          />
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/95 p-4 shadow-lg">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Bakau Powerhouse
            </p>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Active</p>
                <p className="text-lg font-semibold">11</p>
              </div>
              <div>
                <p className="text-muted-foreground">30-day dues</p>
                <p className="text-lg font-semibold">D18,500</p>
              </div>
              <div>
                <p className="text-muted-foreground">Churn</p>
                <p className="text-lg font-semibold">8.3%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-[#F3F6FA]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-center text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Trusted by growing independent gyms
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-navy/70">
            {trust.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Everything a local gym needs. Nothing it does not.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Classes and scheduling are deferred on purpose. GymFlow focuses on
            the daily work of independent clubs: people, money, and who walked
            through the door.
          </p>
        </div>
        <Tabs defaultValue="members" className="mt-10">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1">
            {features.map((feature) => (
              <TabsTrigger key={feature.value} value={feature.value} className="px-3">
                {feature.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {features.map((feature) => (
            <TabsContent key={feature.value} value={feature.value} className="mt-6">
              <div className="grid gap-8 rounded-2xl border bg-white p-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                  <ul className="mt-5 space-y-2">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 text-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-[#F3F6FA] p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FeatureCard icon={<Users className="size-4" />} title="Own-gym only" body="Every member query is filtered by gym_id before it hits the database." />
                    <FeatureCard icon={<CreditCard className="size-4" />} title="Webhook-final" body="Browser redirects never mark a payment paid. The provider event does." />
                    <FeatureCard icon={<BarChart3 className="size-4" />} title="Actionable" body="Active members, revenue trend, and churn — not a 40-tab warehouse." />
                    <FeatureCard icon={<Shield className="size-4" />} title="Deny by default" body="Authenticated is not authorized. Role, tenant, and own-data all have to match." />
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section id="stats" className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3">
          <Stat value="3 roles" label="Super Admin, Gym Owner, Member — mutually exclusive identities" />
          <Stat value="0 leakage" label="Cross-tenant reads return 403. Super Admin never sees member PII." />
          <Stat value="< 1 min" label="Owner quick registration: name, contact, plan, optional photo" />
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-semibold tracking-tight">Who GymFlow is for</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <RoleCard
            title="Super Admin"
            body="Onboard gym owners, approve or suspend tenants, reconcile platform invoices, and watch commercial health. Individual member records stay out of reach by policy."
          />
          <RoleCard
            title="Gym Owner"
            body="Run one gym: profile, staff, members, dues, settings, and analytics. Pending gyms wait for approval before tenant administration unlocks."
          />
          <RoleCard
            title="Gym Member"
            body="No login. Scan the gym QR, enter your phone, check in, see days left, and pay to renew. The desk can also check you in and activate payment by hand."
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#F3F6FA] p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-semibold">Walk a room through the product</p>
            <p className="text-sm text-muted-foreground">
              Six live steps: owner signup, Super Admin approval, members, door QR, check-in, renewal.
            </p>
          </div>
          <Link href="/demo" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
            Open the demo flow
          </Link>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-2 max-w-sm text-xs text-muted-foreground">
              Multi-tenant gym operations for independent clubs. Classes and scheduling stay on the roadmap until local demand is proven.
            </p>
          </div>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <Link href="/demo">Demo flow</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Owner signup</Link>
            <span>© {new Date().getFullYear()} GymFlow</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-border">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-white/70">{label}</p>
    </div>
  );
}

function RoleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <Wallet className="size-5 text-primary" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
