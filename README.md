# GymFlow

Multi-tenant gym management for independent clubs. One platform, many gyms, hard walls between them.

GymFlow follows the product spec for three mutually exclusive roles:

- **Super Admin** onboards gym owners, reviews tenants, and sees platform-level commercial activity — not individual member records.
- **Gym Owner** (and delegated staff) runs one gym: members, dues, plans, check-ins, and analytics.
- **Gym Member** sees only their membership, payments, and attendance history.

Classes and scheduling are intentionally out of scope.

## Get it on your machine

The working copy lives on Origin, not yet on GitHub. Origin CLI runs in **WSL** (Ubuntu), not in PowerShell.

### 1. Prerequisites in WSL

- [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) with Ubuntu
- Node.js 20 or newer (`node -v`)
- Git and curl (`sudo apt update && sudo apt install -y git curl`)

If Node is missing or too old:

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
```

### 2. Clone from Origin

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
origin auth login
cd ~
origin repo clone kontehebrima993/gym-flow
cd gym-flow
```

Sign in with the Cursor account `kontehebrima993@gmail.com`. If `origin` is not found after install, the `PATH` line above is what fixes it.

Do not clone `gymmanagementsystem` until GymFlow has been pushed there; that GitHub repo does not have this code yet.

### 3. Run the app

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127) in your Windows browser. The WSL server is bound to `0.0.0.0:43127`, so `localhost:43127` from Windows works.

`npm run dev` also generates Prisma, applies the SQLite schema, and seeds demo data. To rebuild the database later: `npm run db:setup`.

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

GitHub repo: **`gymmanagementsystem`** on the GitHub account that owns it (this cloud agent has no GitHub credentials, so a private repo is not visible here). Origin copy: [kontehebrima993/gym-flow](https://cursor.com/codebase/kontehebrima993/gym-flow) (`no-mirror`). The Origin slug `kontehebrima993` is not a GitHub username.

Direct connection: push GymFlow into `gymmanagementsystem`, then **Sync from GitHub** so GitHub stays the source of truth.

### 1. Push into gymmanagementsystem (PAT)

Do not paste the token into Cursor chat.

| Token type | Create at | Access needed |
| --- | --- | --- |
| Classic | [github.com/settings/tokens](https://github.com/settings/tokens) | `repo` |
| Fine-grained | [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens) | Contents read/write and Metadata read on `gymmanagementsystem` |

```bash
read -s GH_TOKEN
export GH_TOKEN
./scripts/connect-github.sh
```

The script authenticates as the token’s GitHub user, requires `gymmanagementsystem` to already exist, adds a `github` remote without embedding the token, and pushes `main` (force-with-lease if GitHub already has an initial README). Override owner with `GITHUB_OWNER` if needed.

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

After that, `git push` to the Origin clone URL lands on GitHub.

### Origin-only clone (until the mirror exists)

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
origin auth login
origin repo clone kontehebrima993/gym-flow
```

Non-interactive: `origin auth login --api-key "$CURSOR_API_KEY"` with a key from [cursor.com/dashboard](https://cursor.com/dashboard) → API Keys. Do not paste the key into chat.
