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

## Source control

Direct connection means **GitHub is the source of truth** and Origin is a Cursor mirror of that repo. Pushes to the Origin clone URL then land on GitHub, and cloud agents open GitHub pull requests.

GymFlow was created on Origin first (`kontehebrima993/gym-flow`, `mirrorStatus: no-mirror`). Origin cannot attach a native repo to GitHub. The GitHub repo has to exist, then you **Sync from GitHub**. The Origin namespace `kontehebrima993` is not a GitHub username.

### 1. Put the code on GitHub (PAT)

Create a PAT, keep it on your machine, and never paste it into Cursor chat.

| Token type | Create at | Access needed |
| --- | --- | --- |
| Classic | [github.com/settings/tokens](https://github.com/settings/tokens) | `repo` |
| Fine-grained | [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens) | Account Administration read/write (create the repo). Repository Contents read/write and Metadata read (push). |

From the repo root (WSL is fine):

```bash
read -s GH_TOKEN
export GH_TOKEN
./scripts/connect-github.sh
```

The script uses the GitHub login on the token (override with `GITHUB_OWNER` / `GITHUB_REPO` if needed), creates private `github.com/<you>/gym-flow` if missing, adds a `github` remote without embedding the token, and pushes `main`.

### 2. Connect GitHub inside Cursor

1. Open [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations)
2. Connect **GitHub** and grant the Cursor GitHub app this repository (or all repos)
3. You must be a GitHub admin on that repo

### 3. Mirror it (this is the direct link)

1. Open [cursor.com/codebase](https://cursor.com/codebase)
2. **Sync from GitHub** and choose `<you>/gym-flow`

Or from a machine signed into Origin (not this hosted agent token):

```bash
origin repo create-mirrored <you>/gym-flow
```

Synced repos show GitHub as the source. Clone URL stays `https://origin.cursor.com/<you>/gym-flow.git`; `git push` on that remote goes to GitHub.

### Origin-only clone (until the mirror exists)

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
origin auth login
origin repo clone kontehebrima993/gym-flow
```

Non-interactive: `origin auth login --api-key "$CURSOR_API_KEY"` with a key from [cursor.com/dashboard](https://cursor.com/dashboard) → API Keys. Do not paste the key into chat.
