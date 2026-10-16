# GymFlow

Multi-tenant gym management for independent clubs. One platform, many gyms, hard walls between them.

GymFlow is kept simple on purpose. More modules can be added later without changing the tenant walls.

- **Super Admin** onboards gym owners, reviews tenants, and sees platform-level commercial activity — not individual member records.
- **Gym Owner** creates an account, adds members, prints one door QR, checks people in, and activates payments.
- **Gym Member** does not get a login. The owner adds them. They scan the printed QR with the phone camera, enter their phone number, check in, see days left, and can send a renewal payment to the desk.

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

`npm run dev` only starts the web server. Run `npm run db:setup` when you first clone, and again after a pull that changes Prisma or seed data. Do not leave an old `npm run dev` running in another window — Windows will then report `EADDRINUSE` or lock `prisma/gymflow.db`.

If the page is a blank 500 or the terminal says `Cannot find module '@tailwindcss/postcss'`, the install did not finish. Stop the server with Ctrl+C, then:

```powershell
Remove-Item -Recurse -Force node_modules, .next -ErrorAction SilentlyContinue
npm install
npm run db:setup
npm run dev
```

If the app is already running when you pull, stop it with Ctrl+C first. After every pull:

```powershell
git pull origin main
npm install
npm run db:setup
npm run dev
```

`npm run db:setup` writes a **local SQLite** file (`prisma/gymflow.db`) on your machine and seeds Gambian demo gyms. Amounts are in **GMD**, shown as **D** (for example D1,500). After pulling this change, run `npm run db:setup` once so the old USD seed is replaced.

If Prisma says it cannot add required `checkInToken`, or the Super Admin owners page errors with `checkInToken` null, stop the server, pull this update, then run `db:setup` again. Existing gyms get a door token without wiping the file. Do not use `prisma db push --force-reset` unless you want to throw away local data. If the database file is locked or still blocked:

```powershell
Remove-Item prisma\gymflow.db, prisma\gymflow.db-journal -ErrorAction SilentlyContinue
npm run db:setup
```

Seeded demo password for every account below: `gymflow-demo`.

| Role | Email |
| --- | --- |
| Super Admin | `iris.p@example.org` |
| Gym owner (Bakau Powerhouse, active) | `maria.s@example.com` |
| Front desk staff | `tom.h@example.org` |
| Pending owner (Brikama Motion Studio) | `uma.s@example.org` |

Demo member (no login): **Lamin Jallow**, phone `301 1191`. Door page: [http://127.0.0.1:43127/g/demo-bakau-powerhouse](http://127.0.0.1:43127/g/demo-bakau-powerhouse).

Owner signup is public. The desk adds members by name, phone, and plan. Print **Door QR** and put it at the entrance.

## Payments

There is no live card processor. A member can tap **Pay to renew** on the QR page; that sends a pending demo payment to the desk. The owner **Activate**s it on the member list (or **Accept**s it under Dues), which marks it paid and extends membership. Platform invoices still use `/pay/[id]`.

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
