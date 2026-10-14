"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ClientApiError } from "@/lib/api-client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      toast.error("The new passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const result = await api<{ next: string }>("/auth/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: form.get("current_password"),
          password,
        }),
      });
      toast.success("Your password is set. Welcome in.");
      router.push(result.next || "/member");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not save your password");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Logo />
        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">First sign-in</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Choose your own password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your gym created a one-time password so you could get in. Replace it
            now. You will use your new password next time.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">One-time password</Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <button type="submit" className={cn(buttonVariants(), "h-9 w-full")} disabled={pending}>
              {pending ? "Saving…" : "Save password and continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
