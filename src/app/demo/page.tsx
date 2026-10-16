"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_ACCOUNTS, DEMO_MEMBER, DEMO_PASSWORD } from "@/lib/demo";
import { demoSignInError, signInAndGo, toast } from "@/lib/demo-auth";

const STEPS = [
  {
    id: "signup",
    who: "Gym owner",
    title: "Owner creates an account",
    icon: UserPlus,
    say: "A gym owner signs up with gym name, email, and password. Members are not invited to register themselves.",
    does: "The gym is created immediately so the desk can add people. Super Admin still has to approve before the gym is fully live.",
    live: "Open owner signup",
    href: "/signup",
  },
  {
    id: "approve",
    who: "Super Admin",
    title: "Platform approves the gym",
    icon: ShieldCheck,
    say: "Super Admin sees gyms, not member files. Approve, reject, or suspend a tenant from one list.",
    does: "Open Gym owners as iris.p@example.org. Pending gyms wait here. Member phone numbers stay out of this screen.",
    live: "Sign in as Super Admin",
    email: DEMO_ACCOUNTS[0].email,
    next: "/admin/owners",
  },
  {
    id: "members",
    who: "Gym owner",
    title: "Desk adds members",
    icon: Users,
    say: "Name, phone, and plan. That is enough. The member is on the roster with no login and no password.",
    does: "Bakau Powerhouse already has Lamin Jallow. Add someone if you want, then show plan, due date, Check in, and Activate.",
    live: "Open the member list",
    email: DEMO_ACCOUNTS[1].email,
    next: "/owner/members",
  },
  {
    id: "qr",
    who: "Gym owner",
    title: "Print one door QR",
    icon: QrCode,
    say: "One code for the gym, taped at the entrance. Members use the phone camera — no app, no typed URL.",
    does: "Show the poster, then Print. On a real floor, open GymFlow with the LAN address before printing so phones can reach it.",
    live: "Open the door poster",
    email: DEMO_ACCOUNTS[1].email,
    next: "/owner/qr",
  },
  {
    id: "checkin",
    who: "Member",
    title: "Scan, see days left, check in",
    icon: Smartphone,
    say: "The camera opens this page. They type the phone the desk saved, then tap Check in. Membership type and days left sit above the button.",
    does: `Use ${DEMO_MEMBER.phone} for ${DEMO_MEMBER.name}. Plan is ${DEMO_MEMBER.plan}. Then Check in.`,
    live: "Open the door page",
    href: DEMO_MEMBER.doorPath,
  },
  {
    id: "renew",
    who: "Member + desk",
    title: "Pay to renew, activate at the desk",
    icon: Wallet,
    say: "Pay to renew sends a pending payment to the gym. The owner taps Activate — cash, Wave, or whatever they collected — and membership extends.",
    does: "From the door page tap Pay to renew, then switch to the owner roster and Activate. Dues also lists the pending payment.",
    live: "Open desk dues",
    email: DEMO_ACCOUNTS[1].email,
    next: "/owner/payments",
  },
] as const;

export default function DemoFlowPage() {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const current = STEPS[step];
  const Icon = current.icon;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setStep((value) => Math.min(STEPS.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setStep((value) => Math.max(0, value - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function openLive() {
    if ("href" in current && current.href) {
      window.location.assign(current.href);
      return;
    }
    if (!("email" in current) || !current.email || !("next" in current)) return;
    setPending(true);
    try {
      await signInAndGo(current.email, current.next);
    } catch (error) {
      setPending(false);
      toast.error(demoSignInError(error));
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
              Home
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
              Log in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Prototype demo</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          GymFlow in six live moves
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Use this page on the projector. Click a step, say the line, then open the real screen.
          Arrow keys also move the story. Seeded password is {DEMO_PASSWORD}.
        </p>

        <ol className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STEPS.map((item, index) => {
            const StepIcon = item.icon;
            const active = index === step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-full w-full flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition",
                    active
                      ? "border-primary bg-white shadow-sm ring-2 ring-primary/20"
                      : "border-transparent bg-white/70 hover:bg-white",
                  )}
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <StepIcon className="size-4" />
                  </span>
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {String(index + 1).padStart(2, "0")} · {item.who}
                  </span>
                  <span className="text-sm font-semibold leading-5 text-ink">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Step {step + 1} of {STEPS.length} · {current.who}
            </p>
            <div className="mt-4 flex items-start gap-3">
              <span className="mt-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{current.title}</h2>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-[#F3F6FA] p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Say this</p>
                <p className="mt-2 text-sm leading-6 text-ink">{current.say}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Do this</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.does}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button className="h-11 px-5" disabled={pending} onClick={() => void openLive()}>
                {pending ? "Opening…" : current.live}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={step === 0}
                  onClick={() => setStep((value) => value - 1)}
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={step === STEPS.length - 1}
                  onClick={() => setStep((value) => value + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border bg-[#0f2238] p-6 text-white shadow-sm">
            <Preview step={current.id} />
          </aside>
        </section>

        <section className="mt-10 rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-ink">Demo accounts on this machine</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                disabled={pending}
                onClick={() => {
                  setPending(true);
                  void signInAndGo(account.email, account.next).catch((error) => {
                    setPending(false);
                    toast.error(demoSignInError(error));
                  });
                }}
                className="rounded-xl border bg-[#F3F6FA] p-4 text-left hover:border-primary hover:bg-white"
              >
                <p className="text-sm font-semibold text-ink">{account.role}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{account.email}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{account.summary}</p>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Member has no account. Door page {DEMO_MEMBER.doorPath} · phone {DEMO_MEMBER.phone}.
          </p>
        </section>
      </main>
    </div>
  );
}

function Preview({ step }: { step: (typeof STEPS)[number]["id"] }) {
  if (step === "signup") {
    return (
      <Screen title="Owner signup">
        <Field label="Gym name" value="Serekunda Fit Club" />
        <Field label="Owner email" value="you@gym.gm" />
        <div className="mt-4 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium">
          Submit for review
        </div>
      </Screen>
    );
  }
  if (step === "approve") {
    return (
      <Screen title="Gym owners">
        <Row name="Bakau Powerhouse" status="Active" />
        <Row name="Brikama Motion Studio" status="Pending" accent />
        <Row name="Banjul Harbor Gym" status="Suspended" />
        <p className="mt-4 text-xs text-white/60">Approve · Reject · Suspend. No member PII.</p>
      </Screen>
    );
  }
  if (step === "members") {
    return (
      <Screen title="Members">
        <Row name={DEMO_MEMBER.name} status={DEMO_MEMBER.plan} accent />
        <p className="mt-2 text-xs text-white/70">Phone {DEMO_MEMBER.phone} · due date on the roster</p>
        <div className="mt-4 flex gap-2 text-xs">
          <span className="rounded-md bg-white/10 px-2 py-1">Check in</span>
          <span className="rounded-md bg-primary px-2 py-1">Activate</span>
        </div>
      </Screen>
    );
  }
  if (step === "qr") {
    return (
      <Screen title="Door QR">
        <div className="mx-auto mt-2 size-28 rounded-xl bg-white p-2">
          <div className="grid h-full grid-cols-5 grid-rows-5 gap-0.5">
            {Array.from({ length: 25 }).map((_, index) => (
              <span
                key={index}
                className={cn("rounded-[1px] bg-[#0f2238]", index % 3 === 0 ? "opacity-100" : "opacity-30")}
              />
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/70">Scan to check in · Bakau Powerhouse</p>
      </Screen>
    );
  }
  if (step === "checkin") {
    return (
      <Screen title="Phone camera">
        <p className="text-xs text-white/60">Bakau Powerhouse</p>
        <p className="mt-1 text-lg font-semibold">{DEMO_MEMBER.name}</p>
        <p className="mt-3 text-sm">{DEMO_MEMBER.plan}</p>
        <p className="text-xs text-white/70">Days left on the membership</p>
        <div className="mt-4 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium">Check in</div>
        <div className="mt-2 rounded-lg border border-white/20 px-3 py-2 text-center text-sm">Pay to renew</div>
      </Screen>
    );
  }
  return (
    <Screen title="Desk dues">
      <Row name={`${DEMO_MEMBER.name} · pending`} status="Activate" accent />
      <p className="mt-4 text-xs leading-5 text-white/70">
        Member taps Pay to renew. Owner marks it paid at the desk and the due date moves forward.
      </p>
    </Screen>
  );
}

function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-white/50 uppercase">On screen</p>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <div className="mt-5 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="mt-1 rounded-md bg-white/10 px-2 py-1.5 text-sm">{value}</p>
    </div>
  );
}

function Row({ name, status, accent }: { name: string; status: string; accent?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
      <span>{name}</span>
      <span className={cn("text-xs", accent ? "text-primary" : "text-white/60")}>{status}</span>
    </div>
  );
}
