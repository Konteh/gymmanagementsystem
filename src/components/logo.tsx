import { cn } from "@/lib/utils";

export function Logo({
  className,
  markClassName,
  wordmark = true,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg bg-primary text-white shadow-[0_8px_16px_-8px_rgba(22,166,160,0.9)]",
          markClassName,
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="M4 9.5h3.2L9.8 15h4.4l2.6-5.5H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.2 9.5V7.8c0-.7.5-1.3 1.2-1.3h1.1M16.8 9.5V7.8c0-.7-.5-1.3-1.2-1.3h-1.1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17.4" r="1.15" fill="currentColor" />
        </svg>
      </span>
      {wordmark ? (
        <span className="text-[17px] font-semibold tracking-tight text-ink">
          GymFlow
        </span>
      ) : null}
    </div>
  );
}
