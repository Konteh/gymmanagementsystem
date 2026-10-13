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

GymFlow is a private Origin repository: [kontehebrima993/gym-flow](https://cursor.com/codebase/kontehebrima993/gym-flow). This checkout’s `origin` remote stays on Origin. GitHub is added as a second remote named `github`, authenticated with a personal access token.

### Connect GitHub with a token

Create a PAT on GitHub, keep it on your machine, and never paste it into Cursor chat.

| Token type | Create at | Access needed |
| --- | --- | --- |
| Classic | [github.com/settings/tokens](https://github.com/settings/tokens) | `repo` |
| Fine-grained | [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens) | Account Administration read/write (create the repo). Repository Contents read/write and Metadata read (push). |

In WSL or any bash shell, from the repo root:

```bash
read -s GH_TOKEN
export GH_TOKEN
chmod +x scripts/connect-github.sh
./scripts/connect-github.sh
```

Or load the token from a local file that is not in git:

```bash
export GH_TOKEN="$(cat ~/gh-token.txt)"
./scripts/connect-github.sh
```

The script:

1. Authenticates as the token’s GitHub user (`kontehebrima993` unless you set `GITHUB_OWNER`)
2. Creates private `https://github.com/<owner>/gym-flow` if it does not exist
3. Adds a `github` remote **without** embedding the token in the URL
4. Pushes `main`

Later pushes:

```bash
git push origin main    # Origin
git push github main    # GitHub (uses your local credential helper / GH_TOKEN)
```

`GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_PRIVATE` override the defaults. `CONNECT_GITHUB_DRY_RUN=1` prints the target without creating or pushing.

### Origin clone (Cursor token)

Origin uses your Cursor login, not a GitHub PAT. In WSL:

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
origin auth login
origin repo clone kontehebrima993/gym-flow
```

Non-interactive login with a Cursor API key from [cursor.com/dashboard](https://cursor.com/dashboard) → API Keys (do not paste the key into chat):

```bash
export CURSOR_API_KEY="$(cat ~/cursor-api-key.txt)"
origin auth login --api-key "$CURSOR_API_KEY"
```

HTTPS clone URL: `https://origin.cursor.com/kontehebrima993/gym-flow.git`

### Official GitHub → Origin mirror (optional)

Cursor’s built-in mirror keeps GitHub as the source of truth. Use it after the GitHub repo exists and the Cursor GitHub app is installed on that account:

1. Open [cursor.com/codebase](https://cursor.com/codebase) → **Sync from GitHub**, or
2. `origin repo create-mirrored kontehebrima993/gym-flow`

Pushes to the Origin clone URL then go to GitHub. GymFlow is Origin-native today (`mirrorStatus: no-mirror`); mirroring is a separate step from the PAT push above.
