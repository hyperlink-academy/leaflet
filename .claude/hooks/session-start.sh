#!/bin/bash
# Prepares a Claude Code on the web session: npm deps, Docker, a migrated local
# Supabase stack, and a .env.local pointing the dev server at it.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# The supabase package's postinstall downloads its binary from GitHub and the
# stream occasionally gets truncated (Z_DATA_ERROR), so retry.
for attempt in 1 2 3; do
  if npm install --no-audit --no-fund; then
    break
  fi
  if [ "$attempt" = 3 ]; then
    echo "npm install failed after 3 attempts" >&2
    exit 1
  fi
  sleep $((attempt * 5))
done

# Supabase is best-effort: unit tests, tsc and prettier don't need it, so a
# failure here shouldn't block the session.
start_supabase() {
  if ! docker info >/dev/null 2>&1; then
    nohup dockerd >/tmp/dockerd.log 2>&1 &
    for _ in $(seq 1 30); do
      docker info >/dev/null 2>&1 && break
      sleep 1
    done
    docker info >/dev/null 2>&1 || { echo "dockerd failed to start, see /tmp/dockerd.log" >&2; return 1; }
  fi

  # The CLI pinned in package.json (1.x) runs a Realtime container during db
  # init that crashes without IPv6, which this sandbox's kernel lacks; 2.x
  # doesn't, and matches what CI's supabase/setup-cli installs. Realtime itself
  # is excluded for the same reason, plus the logging containers nothing uses.
  local supabase="npx -y supabase@latest"
  if ! $supabase status >/dev/null 2>&1; then
    $supabase start -x realtime,vector,logflare || return 1
  fi

  if [ ! -f .env.local ]; then
    local status
    status=$($supabase status -o env)
    local api_url anon_key service_key db_url
    api_url=$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<<"$status")
    anon_key=$(sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' <<<"$status")
    service_key=$(sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p' <<<"$status")
    db_url=$(sed -n 's/^DB_URL="\(.*\)"$/\1/p' <<<"$status")
    cat >.env.local <<EOF
NEXT_PUBLIC_SUPABASE_API_URL=$api_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key
SUPABASE_SERVICE_ROLE_KEY=$service_key
DB_URL=$db_url
LEAFLET_APP_PASSWORD=local-dev-password
EOF
  fi
}

if ! start_supabase; then
  echo "WARNING: local Supabase stack did not start; dev server and integration tests won't work" >&2
fi
