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

const SOURCE_LABEL: Record<string, string> = {
  front_desk: "Front desk",
  owner: "Gym owner",
  staff: "Staff",
};

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
        eyebrow="Your visits"
        title="Check-ins"
        description={
          rows.length
            ? `${rows.length} visit${rows.length === 1 ? "" : "s"} on record. The desk checks you in — you do not check yourself in from here.`
            : "When the desk checks you in, each visit appears here."
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No visits yet"
          description="Ask the front desk to check you in the next time you train."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Checked in by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{dateTime(row.checkedInAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {SOURCE_LABEL[row.source] ?? row.source.replaceAll("_", " ")}
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
