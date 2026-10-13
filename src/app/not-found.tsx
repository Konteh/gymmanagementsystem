import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F6FA] px-4 text-center">
      <h1 className="text-2xl font-semibold text-ink">That page is not in this gym</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Classes and scheduling are not part of this release. If you were looking for a desk tool, start from the home page.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-6")}>
        Back to GymFlow
      </Link>
    </div>
  );
}
