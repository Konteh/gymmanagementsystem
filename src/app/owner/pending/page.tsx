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
        description="Your gym stays in pending until Super Admin approves it. Tenant administration — members, dues, staff — stays locked until then."
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
              A Super Admin will move this gym to active or rejected. You can still correct the gym profile while you wait.
            </p>
          )}
          <Link href="/owner/settings" className={cn(buttonVariants({ variant: "outline" }))}>
            Edit gym profile
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
