import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  delta,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon?: ReactNode;
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
            {typeof delta === "number" ? (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  delta >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}% vs prior period
              </p>
            ) : null}
          </div>
          {icon ? (
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
