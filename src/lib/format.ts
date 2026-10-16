import { differenceInCalendarDays, format, formatDistanceToNow } from "date-fns";
import { DEFAULT_CURRENCY } from "@/lib/constants";

export function money(amount: number | string, _currency = DEFAULT_CURRENCY) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const n = Number.isFinite(value) ? value : 0;
  const digits = new Intl.NumberFormat("en-GM", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
  return `D${digits}`;
}

export function shortDate(value: string | Date) {
  return format(new Date(value), "d MMM yyyy");
}

export function dateTime(value: string | Date) {
  return format(new Date(value), "d MMM yyyy · h:mm a");
}

export function relative(value: string | Date) {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function daysLeftLabel(expiresAt: string | Date | null | undefined) {
  if (!expiresAt) return "No end date";
  const days = differenceInCalendarDays(new Date(expiresAt), new Date());
  if (days < 0) return `Ended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}
