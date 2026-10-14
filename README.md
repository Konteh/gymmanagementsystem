# GymFlow

Multi-tenant gym management for independent clubs. One platform, many gyms, hard walls between them.

GymFlow follows the product spec for three mutually exclusive roles:

- **Super Admin** onboards gym owners, reviews tenants, and sees platform-level commercial activity — not individual member records.
- **Gym Owner** (and delegated staff) runs one gym: members, dues, plans, check-ins, and analytics.
- **Gym Member** sees only their membership, payments, and attendance history.

Classes and scheduling are intentionally out of scope.

## Get it on your machine (Windows, no WSL)

You need [Git for Windows](https://git-scm.com/download/win) and [Node.js 20 LTS](https://nodejs.org/) (`node -v` should print v20 or newer). PowerShell is enough.

After GymFlow has been pushed to your `gymmanagementsystem` GitHub repo:

```powershell
git clone https://github.com/Konteh/gymmanagementsystem.git
cd gymmanagementsystem
copy .env.example .env
npm install
npm run db:setup
npm run dev
```

Then open [http://127.0.0.1:43127](http://127.0.0.1:43127).

`npm run db:setup` writes a **local SQLite** file (`prisma/gymflow.db`) on your machine and seeds Gambian demo gyms. Amounts are in **GMD**, shown as **D** (for example D1,500). After pulling this change, run `npm run db:setup` once so the old USD seed is replaced.

Seeded demo password for every account below: `gymflow-demo`.

| Role | Email |
| --- | --- |
| Super Admin | `iris.p@example.org` |
| Gym owner (Bakau Powerhouse, active) | `maria.s@example.com` |
| Front desk staff | `tom.h@example.org` |
| Pending owner (Brikama Motion Studio) | `uma.s@example.org` |
| Member (Lamin Jallow) | `victor.l@example.com` |

Owner signup is public. The desk registers members and shares a one-time password. On first sign-in the member must choose their own password.

## Payments

There is no live card processor in this build. Checkout at `/pay/[id]` is a demo provider: **Pay now** or **Simulate failure** posts a signed webhook into the same state machine production would use. Retries are idempotent.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, SQLite, JWT cookies, bcrypt.

Tenant isolation is enforced in authorization middleware and in every gym-scoped query. Super Admin APIs never return member PII.

## Source control

GitHub repo: [Konteh/gymmanagementsystem](https://github.com/Konteh/gymmanagementsystem). Origin copy: [kontehebrima993/gym-flow](https://cursor.com/codebase/kontehebrima993/gym-flow) (`no-mirror`).

Direct connection: push GymFlow into `gymmanagementsystem`, then **Sync from GitHub** so GitHub stays the source of truth.

### 1. Push into gymmanagementsystem (PAT)

| Token type | Create at | Access needed |
| --- | --- | --- |
| Classic | [github.com/settings/tokens](https://github.com/settings/tokens) | `repo` |
| Fine-grained | [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens) | Contents read/write and Metadata read on `gymmanagementsystem` |

A cloud agent can push with that token. Revoke the token after the sync. The token is never committed.

### 2. Connect GitHub inside Cursor

1. Open [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations)
2. Connect **GitHub** and grant the Cursor GitHub app `gymmanagementsystem`
3. You must be a GitHub admin on that repo

### 3. Mirror it

1. Open [cursor.com/codebase](https://cursor.com/codebase)
2. **Sync from GitHub** and choose `<you>/gymmanagementsystem`

```bash
origin repo create-mirrored <you>/gymmanagementsystem
```

After that, `git push` to the Origin clone URL lands on GitHub. Local work uses Git for Windows against `gymmanagementsystem` — WSL is not required.
