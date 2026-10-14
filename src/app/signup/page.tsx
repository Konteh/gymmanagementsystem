"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ClientApiError } from "@/lib/api-client";

export default function SignupPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await api<{ next: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          requested_role: "gym_owner",
          gym_name: form.get("gym_name"),
          phone: form.get("phone") || undefined,
          address: form.get("address") || undefined,
        }),
      });
      toast.success("Gym submitted for review");
      router.push(result.next);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not create the gym");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
        <Logo />
        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Open your gym on GymFlow</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Owner signup creates your gym. You can register members and plans
            immediately. Super Admin approval is only required before collecting
            dues. Members cannot sign themselves up.
          </p>
          <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gym_name">Gym name</Label>
              <Input id="gym_name" name="gym_name" required maxLength={160} placeholder="Serekunda Fit Club" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Owner email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="+220 3XX XXXX" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" rows={2} placeholder="Kairaba Avenue, Serekunda" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <button type="submit" className={cn(buttonVariants(), "h-9 w-full")} disabled={pending}>
              {pending ? "Submitting…" : "Submit for review"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already on the platform?{" "}
            <Link href="/login" className="font-medium text-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
