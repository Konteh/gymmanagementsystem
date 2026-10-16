import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo flow",
  description:
    "Present GymFlow in six live steps: owner signup, Super Admin approval, members, door QR, check-in, and renewal.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
