import { format, formatDistanceToNow } from "date-fns";

export function money(amount: number | string, currency = "USD") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function shortDate(value: string | Date) {
  return format(new Date(value), "MMM d, yyyy");
}

export function dateTime(value: string | Date) {
  return format(new Date(value), "MMM d, yyyy · h:mm a");
}

export function relative(value: string | Date) {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function percent(value: number) {
  return `${value.toFixed(1)}%`;
}
