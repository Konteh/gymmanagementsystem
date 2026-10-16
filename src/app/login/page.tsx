"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ClientApiError } from "@/lib/api-client";

const demos = [
  { role: "Super Admin", email: "iris.p@example.org" },
  { role: "Gym Owner", email: "maria.s@example.com" },
  { role: "Pending owner", email: "uma.s@example.org" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function authenticate(nextEmail: string, nextPassword: string) {
    setPending(true);
    try {
      const result = await api<{ next: string; must_change_password?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: nextEmail.trim(), password: nextPassword }),
      });
      toast.success("Signed in");
      const requested = new URLSearchParams(window.location.search).get("next");
      const safeNext =
        requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : null;
      const destination = result.must_change_password
        ? "/set-password"
        : safeNext || result.next || "/";
      window.location.assign(destination);
    } catch (error) {
      setPending(false);
      toast.error(error instanceof ClientApiError ? error.message : "Could not sign in");
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
        <div className="hidden lg:block">
          <Logo />
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-ink">
            Sign in to run a gym or the platform.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Super Admins review gym owners. Owners add members at the desk.
            Members do not log in — they scan the door QR with their phone camera.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-ink lg:mt-0">Log in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gym owners and Super Admins only. Members check in by QR.
          </p>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button
              type="button"
              data-testid="sign-in"
              className={cn(buttonVariants(), "h-9 w-full")}
              disabled={pending}
              onClick={() => void authenticate(email, password)}
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </div>
          <div className="mt-6 rounded-xl bg-[#F3F6FA] p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Demo accounts · password <span className="text-ink">gymflow-demo</span>
            </p>
            <div className="mt-2 grid gap-2">
              {demos.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-xs ring-1 ring-border hover:ring-primary"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword("gymflow-demo");
                  }}
                >
                  <span className="font-medium text-ink">{demo.role}</span>
                  <span className="text-muted-foreground">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Opening a gym?{" "}
            <Link href="/signup" className="font-medium text-link">
              Create an owner account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
