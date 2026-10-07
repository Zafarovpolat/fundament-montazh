#!/usr/bin/env bash
set -euo pipefail

# Push the current workspace to the repository's main branch.
# Supply GITHUB_TOKEN through the runner's secret environment; never put a PAT
# in this script or a committed .env file.
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

branch="${PUSH_BRANCH:-main}"
remote="${PUSH_REMOTE:-origin}"
remote_url="${PUSH_REPO_URL:-https://github.com/Zafarovpolat/fundament-montazh.git}"
commit_message="${1:-chore: update site}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is not set. Inject it via a secure environment/secret store." >&2
  exit 2
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$branch" ]]; then
  echo "Refusing to push: current branch is '$current_branch', expected '$branch'." >&2
  exit 2
fi

if git remote get-url "$remote" >/dev/null 2>&1; then
  if [[ "$(git remote get-url "$remote")" != "$remote_url" ]]; then
    git remote set-url "$remote" "$remote_url"
  fi
else
  git remote add "$remote" "$remote_url"
fi

git add -A
if ! git diff --cached --quiet; then
  git -c user.name="${GIT_AUTHOR_NAME:-Arena Agent}" \
    -c user.email="${GIT_AUTHOR_EMAIL:-agent@arena.local}" \
    commit -m "$commit_message"
fi

askpass="$(mktemp)"
trap 'rm -f "$askpass"' EXIT
cat >"$askpass" <<'ASKPASS_EOF'
#!/bin/sh
case "${1:-}" in
  *Username*) printf '%s\n' 'x-access-token' ;;
  *Password*) printf '%s\n' "${GITHUB_TOKEN:?}" ;;
  *) exit 1 ;;
esac
ASKPASS_EOF
chmod 700 "$askpass"

GIT_ASKPASS="$askpass" GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper= push --set-upstream "$remote" "HEAD:$branch"
