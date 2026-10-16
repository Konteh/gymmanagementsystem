import { DEMO_PASSWORD } from "@/lib/constants";

export { DEMO_PASSWORD };

export const DEMO_ACCOUNTS = [
  {
    id: "admin",
    role: "Super Admin",
    email: "iris.p@example.org",
    next: "/admin/owners",
    summary: "Approves gyms. Never sees member phone numbers.",
  },
  {
    id: "owner",
    role: "Gym Owner",
    email: "maria.s@example.com",
    next: "/owner/members",
    summary: "Bakau Powerhouse — roster, door QR, desk check-in.",
  },
  {
    id: "pending",
    role: "Pending owner",
    email: "uma.s@example.org",
    next: "/owner/pending",
    summary: "Brikama Motion Studio, waiting on Super Admin.",
  },
] as const;

export const DEMO_MEMBER = {
  name: "Lamin Jallow",
  phone: "301 1191",
  plan: "Strength Monthly",
  doorPath: "/g/demo-bakau-powerhouse",
} as const;
