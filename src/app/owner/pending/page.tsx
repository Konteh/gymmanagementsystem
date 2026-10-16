import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { cn } from "@/lib/utils";

export default async function PendingPage() {
  const session = await requirePageSession("gym_owner");
  const gym = session.gymId
    ? await prisma.gym.findUnique({ where: { id: session.gymId } })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        title="Waiting on platform review"
        description="Super Admin still needs to approve the gym. You can register members and accept demo dues while you wait."
      />
      <Card>
        <CardContent className="space-y-4 px-5 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">{gym?.name ?? session.gymName}</h2>
            <StatusBadge status={gym?.status ?? session.gymStatus ?? "pending"} />
          </div>
          {gym?.statusReason ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{gym.statusReason}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A Super Admin will move this gym to active or rejected. Register members now. Demo dues they submit appear under Dues until you accept them.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href="/owner/members" className={cn(buttonVariants())}>
              Register members
            </Link>
            <Link href="/owner/qr" className={cn(buttonVariants({ variant: "outline" }))}>
              Print door QR
            </Link>
            <Link href="/owner/payments" className={cn(buttonVariants({ variant: "outline" }))}>
              Accept dues
            </Link>
            <Link href="/owner/settings" className={cn(buttonVariants({ variant: "outline" }))}>
              Edit gym profile
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
