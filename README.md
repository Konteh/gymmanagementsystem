# GymFlow

Multi-tenant gym management for independent clubs. One platform, many gyms, hard walls between them.

GymFlow follows the product spec for three mutually exclusive roles:

- **Super Admin** onboards gym owners, reviews tenants, and sees platform-level commercial activity — not individual member records.
- **Gym Owner** (and delegated staff) runs one gym: members, dues, plans, check-ins, and analytics.
- **Gym Member** sees only their membership, payments, and attendance history.

Classes and scheduling are intentionally out of scope.

## Run locally

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

The app listens on [http://127.0.0.1:43127](http://127.0.0.1:43127).

SQLite is the local database (`prisma/gymflow.db`). Seeded demo password for every account below: `gymflow-demo`.

| Role | Email |
| --- | --- |
| Super Admin | `iris.p@example.org` |
| Gym owner (IronForge Athletics, active) | `maria.s@example.com` |
| Front desk staff | `tom.h@example.org` |
| Pending owner (Peak Motion Studio) | `uma.s@example.org` |
| Member | `victor.l@example.com` |

Owner signup is public. Member identities are created from the owner desk, not from a self-serve signup page.

## Payments

There is no live card processor in this build. Checkout at `/pay/[id]` is a demo provider: **Pay now** or **Simulate failure** posts a signed webhook into the same state machine production would use. Retries are idempotent.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, SQLite, JWT cookies, bcrypt.

Tenant isolation is enforced in authorization middleware and in every gym-scoped query. Super Admin APIs never return member PII.
