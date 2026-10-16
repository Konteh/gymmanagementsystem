import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { newCheckInToken } from "@/lib/check-in";
import { QrPoster } from "./qr-poster";

export default async function OwnerQrPage() {
  const session = await requirePageSession("gym_owner");
  let gym = session.gymId
    ? await prisma.gym.findUnique({ where: { id: session.gymId } })
    : null;
  if (gym && !gym.checkInToken) {
    gym = await prisma.gym.update({
      where: { id: gym.id },
      data: { checkInToken: newCheckInToken() },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={session.gymName ?? "Gym"}
        title="Door QR code"
        description="Print this poster and put it at the door. Members scan it with the phone camera — no app, no typed URL."
      />
      {gym ? (
        <QrPoster gymName={gym.name} token={gym.checkInToken} />
      ) : (
        <p className="text-sm text-muted-foreground">Your gym profile is not ready yet.</p>
      )}
    </div>
  );
}
