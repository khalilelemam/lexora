#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" || -z "${VERCEL_PROJECT_ID:-}" || -z "${VERCEL_ORG_ID:-}" ]]; then
  echo "Missing Vercel credentials (VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID)."
  exit 1
fi

if [[ -z "${VARS_JSON:-}" ]]; then
  echo "Missing VARS_JSON (GitHub environment variables payload)."
  exit 1
fi

VERSION_VALUE="${VERSION:-manual}"

upsert_vercel_env() {
  local key="$1"
  local value="$2"
  local existing_id

  existing_id=$(curl -sf -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" \
    | jq -r --arg k "$key" '.envs[] | select(.key == $k and (.target | index("production") != null)) | .id' \
    | head -n1)

  if [[ -n "$existing_id" ]]; then
    curl -sf -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env/$existing_id?teamId=$VERCEL_ORG_ID" >/dev/null
  fi

  curl -sf -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" \
    -d "$(jq -n --arg k "$key" --arg v "$value" '{key: $k, value: $v, type: "plain", target: ["production"]}')" \
    >/dev/null

  echo "Synced $key"
}

# Sync non-secret vars that are meant for the web runtime.
vars_to_sync=$(echo "$VARS_JSON" | jq -r '
  to_entries
  | map(
      select(
        (.key | test("^NEXT_PUBLIC_"))
        or (.key == "ML_SERVICE_URL")
        or (.key == "AZURE_BLOB_STORAGE_CONTAINER")
        or (.key == "BETTER_AUTH_URL")
        or (.key == "EMAIL_FROM")
        or (.key == "GOOGLE_CLIENT_ID")
      )
    )
  | .[]
  | "\(.key)=\(.value)"'
)

if [[ -z "$vars_to_sync" ]]; then
  echo "No web environment variables found to sync."
else
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    key="${line%%=*}"
    value="${line#*=}"

    upsert_vercel_env "$key" "$value"
  done <<< "$vars_to_sync"
fi

secret_keys=(
  "AZURE_BLOB_STORAGE_CONNECTION_STRING"
  "BETTER_AUTH_SECRET"
  "DATABASE_URL"
  "DATABASE_URL_UNPOOLED"
  "GOOGLE_CLIENT_SECRET"
  "LEXORA_RELEASES_TOKEN"
  "RESEND_API_KEY"
)

for key in "${secret_keys[@]}"; do
  value="${!key:-}"
  if [[ -n "$value" ]]; then
    upsert_vercel_env "$key" "$value"
  else
    echo "$key is not set in GitHub environment secrets; skipping Vercel sync for it."
  fi
done

# Always sync app version explicitly.
upsert_vercel_env "NEXT_PUBLIC_APP_VERSION" "$VERSION_VALUE"
echo "Synced NEXT_PUBLIC_APP_VERSION=$VERSION_VALUE"
