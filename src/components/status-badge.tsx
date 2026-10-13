import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  active: "border-transparent bg-emerald-50 text-emerald-700",
  paid: "border-transparent bg-emerald-50 text-emerald-700",
  pending: "border-transparent bg-amber-50 text-amber-700",
  inactive: "border-transparent bg-slate-100 text-slate-600",
  expired: "border-transparent bg-slate-100 text-slate-600",
  rejected: "border-transparent bg-red-50 text-red-700",
  suspended: "border-transparent bg-red-50 text-red-700",
  failed: "border-transparent bg-red-50 text-red-700",
  refunded: "border-transparent bg-violet-50 text-violet-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", styles[status] ?? "bg-slate-100 text-slate-600")}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
