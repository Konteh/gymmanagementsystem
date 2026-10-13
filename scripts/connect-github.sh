#!/usr/bin/env bash
# Create github.com/<owner>/gym-flow (if missing) and push main using a PAT.
# The token is never written into a git remote URL, the repo, or chat.
#
#   export GH_TOKEN="$(cat ~/gh-token.txt)"   # do not paste the token into Cursor
#   ./scripts/connect-github.sh
#
# Optional:
#   GITHUB_OWNER   default: login on the token (expected: kontehebrima993)
#   GITHUB_REPO    default: gym-flow
#   GITHUB_PRIVATE default: true
#   CONNECT_GITHUB_DRY_RUN=1  print actions without creating or pushing

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OWNER="${GITHUB_OWNER:-}"
REPO="${GITHUB_REPO:-gym-flow}"
PRIVATE="${GITHUB_PRIVATE:-true}"
DRY_RUN="${CONNECT_GITHUB_DRY_RUN:-0}"
API="https://api.github.com"
REMOTE_NAME="github"

die() { echo "error: $*" >&2; exit 1; }

export GH_TOKEN="${GH_TOKEN:-}"
if [[ -z "$GH_TOKEN" ]]; then
  cat >&2 <<'EOF'
Set GH_TOKEN to a GitHub personal access token, then re-run this script.
Do not paste the token into Cursor chat.

Classic PAT: https://github.com/settings/tokens
  Scope: repo  (needed to create and push a private repository)

Fine-grained PAT: https://github.com/settings/personal-access-tokens
  Account → Administration: Read and write  (create the repo)
  Repository → Contents: Read and write, Metadata: Read  (push)

WSL example:

  read -s GH_TOKEN
  export GH_TOKEN
  ./scripts/connect-github.sh
EOF
  exit 1
fi

secret_dir="$(mktemp -d)"
chmod 700 "$secret_dir"
cleanup() { rm -rf "$secret_dir"; }
trap cleanup EXIT

auth_header="$secret_dir/auth"
printf 'Authorization: Bearer %s\n' "$GH_TOKEN" > "$auth_header"
chmod 600 "$auth_header"

json_get() {
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get(sys.argv[1],"") or "")' "$1"
}

api() {
  local method="$1" path="$2" data="${3:-}"
  local args=(-sS -X "$method"
    -H "@${auth_header}"
    -H "Accept: application/vnd.github+json"
    -H "X-GitHub-Api-Version: 2022-11-28"
    -w "\n%{http_code}")
  if [[ -n "$data" ]]; then
    args+=(-H "Content-Type: application/json" --data-binary "$data")
  fi
  curl "${args[@]}" "${API}${path}"
}

split_body_code() {
  local raw="$1"
  HTTP_CODE="${raw##*$'\n'}"
  HTTP_BODY="${raw%$'\n'*}"
}

split_body_code "$(api GET /user)"
if [[ "$HTTP_CODE" == "401" ]]; then
  die "GitHub rejected GH_TOKEN (401). Create a new PAT with repo access."
fi
if [[ "$HTTP_CODE" != "200" ]]; then
  die "GitHub /user returned HTTP ${HTTP_CODE}: ${HTTP_BODY}"
fi

TOKEN_LOGIN="$(printf '%s' "$HTTP_BODY" | json_get login)"
[[ -n "$TOKEN_LOGIN" ]] || die "GitHub /user response had no login."
OWNER="${OWNER:-$TOKEN_LOGIN}"
CLONE_URL="https://github.com/${OWNER}/${REPO}.git"

echo "Authenticated to GitHub as ${TOKEN_LOGIN}"
echo "Target repository: ${OWNER}/${REPO} (private=${PRIVATE})"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run: would ensure ${CLONE_URL} exists and push main to remote '${REMOTE_NAME}'."
  exit 0
fi

split_body_code "$(api GET "/repos/${OWNER}/${REPO}")"
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "GitHub repository already exists."
elif [[ "$HTTP_CODE" == "404" ]]; then
  echo "Creating GitHub repository ${OWNER}/${REPO}..."
  payload="$(REPO="$REPO" PRIVATE="$PRIVATE" python3 -c 'import json,os; print(json.dumps({
    "name": os.environ["REPO"],
    "private": os.environ["PRIVATE"].lower() == "true",
    "description": "Multi-tenant gym management platform",
    "has_issues": True,
    "has_projects": False,
    "has_wiki": False,
  }))')"
  if [[ "$OWNER" == "$TOKEN_LOGIN" ]]; then
    split_body_code "$(api POST /user/repos "$payload")"
  else
    split_body_code "$(api POST "/orgs/${OWNER}/repos" "$payload")"
  fi
  if [[ "$HTTP_CODE" != "201" ]]; then
    die "Could not create ${OWNER}/${REPO} (HTTP ${HTTP_CODE}): ${HTTP_BODY}"
  fi
  echo "Created ${CLONE_URL}"
else
  die "GitHub /repos/${OWNER}/${REPO} returned HTTP ${HTTP_CODE}: ${HTTP_BODY}"
fi

if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote set-url "$REMOTE_NAME" "$CLONE_URL"
else
  git remote add "$REMOTE_NAME" "$CLONE_URL"
fi

askpass="$secret_dir/askpass"
cat > "$askpass" <<'EOF'
#!/bin/sh
case "$1" in
  *[Uu]sername*) printf '%s\n' "x-access-token" ;;
  *) printf '%s\n' "$GH_TOKEN" ;;
esac
EOF
chmod 700 "$askpass"

echo "Pushing main to ${REMOTE_NAME}..."
GIT_ASKPASS="$askpass" GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper= push -u "$REMOTE_NAME" main:main

echo
echo "GymFlow is on GitHub: ${CLONE_URL}"
echo "Origin copy is unchanged: https://origin.cursor.com/kontehebrima993/gym-flow.git"
echo
echo "Keep both remotes in sync:"
echo "  git push origin main"
echo "  git push github main"
echo
echo "To make GitHub the source of truth inside Cursor (optional):"
echo "  1. Install the Cursor GitHub app on this account"
echo "  2. Open https://cursor.com/codebase and choose Sync from GitHub"
echo "     or run: origin repo create-mirrored ${OWNER}/${REPO}"
echo "  Official mirroring is GitHub → Origin. This Origin-first repo stays native until you do that."
