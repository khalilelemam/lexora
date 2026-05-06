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

# Sync vars that are meant for the web runtime.
vars_to_sync=$(echo "$VARS_JSON" | jq -r 'to_entries | map(select((.key | test("^NEXT_PUBLIC_")) or (.key == "ML_SERVICE_URL"))) | .[] | "\(.key)=\(.value)"')

if [[ -z "$vars_to_sync" ]]; then
  echo "No web environment variables found to sync."
else
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    key="${line%%=*}"
    value="${line#*=}"

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
  done <<< "$vars_to_sync"
fi

# Always sync app version explicitly.
version_existing_id=$(curl -sf -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" \
  | jq -r '.envs[] | select(.key == "NEXT_PUBLIC_APP_VERSION" and (.target | index("production") != null)) | .id' \
  | head -n1)

if [[ -n "$version_existing_id" ]]; then
  curl -sf -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env/$version_existing_id?teamId=$VERCEL_ORG_ID" >/dev/null
fi

curl -sf -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" \
  -d "$(jq -n --arg v "$VERSION_VALUE" '{key: "NEXT_PUBLIC_APP_VERSION", value: $v, type: "plain", target: ["production"]}')" \
  >/dev/null

echo "Synced NEXT_PUBLIC_APP_VERSION=$VERSION_VALUE"
