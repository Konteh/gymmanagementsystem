import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { dateTime } from "@/lib/format";

export default async function AttendancePage() {
  const session = await requirePageSession("member");
  const rows = await prisma.attendance.findMany({
    where: { memberId: session.memberId! },
    orderBy: { checkedInAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Floor"
        title="Your check-ins"
        description="Attendance history for this gym. Class schedules are not part of this release."
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No check-ins yet"
          description="When the desk checks you in, visits appear here."
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{dateTime(row.checkedInAt)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {row.source.replaceAll("_", " ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
