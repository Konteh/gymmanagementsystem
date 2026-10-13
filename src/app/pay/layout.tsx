import type { ReactNode } from "react";
import { Suspense } from "react";

export default function PayLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#F3F6FA]" />}>{children}</Suspense>;
}
