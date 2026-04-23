#!/usr/bin/env bash

validate_required_values() {
  local missing=0

  for key in "$@"; do
    if [ -z "${!key:-}" ]; then
      echo "Missing required value: $key"
      missing=1
    fi
  done

  if [ "$missing" -ne 0 ]; then
    echo "Required secrets/variables are not configured."
    return 1
  fi
}

validate_deploy_inputs() {
  local update_image="${1:-false}"
  local image_tag="${2:-}"

  validate_required_values \
    AZURE_CLIENT_ID \
    AZURE_TENANT_ID \
    AZURE_SUBSCRIPTION_ID \
    AZURE_CONTAINERAPP_NAME \
    AZURE_RESOURCE_GROUP

  if [ "$update_image" = "true" ]; then
    validate_required_values GHCR_USERNAME GHCR_PASSWORD

    if [ -z "$image_tag" ]; then
      echo "IMAGE_TAG is required when UPDATE_IMAGE is true."
      return 1
    fi
  fi
}

validate_bootstrap_inputs() {
  validate_required_values \
    AZURE_CLIENT_ID \
    AZURE_TENANT_ID \
    AZURE_SUBSCRIPTION_ID \
    GHCR_USERNAME \
    GHCR_PASSWORD \
    AZURE_RESOURCE_GROUP \
    AZURE_LOCATION \
    AZURE_CONTAINERAPP_ENV \
    AZURE_CONTAINERAPP_NAME
}

build_ml_env_vars() {
  local ml_debug="${ML_DEBUG:-false}"
  local ml_host="${ML_HOST:-0.0.0.0}"
  local ml_port="${ML_PORT:-8001}"
  local ml_allowed_origins="${ML_ALLOWED_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000}"
  local ml_low_risk_threshold="${ML_LOW_RISK_THRESHOLD:-0.33}"
  local ml_high_risk_threshold="${ML_HIGH_RISK_THRESHOLD:-0.66}"
  local ml_eye_tracker_sequence_length="${ML_EYE_TRACKER_SEQUENCE_LENGTH:-20}"
  local ml_eye_tracker_sequence_step="${ML_EYE_TRACKER_SEQUENCE_STEP:-5}"
  local ml_eye_tracker_max_sequences="${ML_EYE_TRACKER_MAX_SEQUENCES:-100}"
  local ml_eye_tracker_min_fixation_ms="${ML_EYE_TRACKER_MIN_FIXATION_MS:-80}"
  local ml_eye_tracker_max_fixation_ms="${ML_EYE_TRACKER_MAX_FIXATION_MS:-1000}"
  local ml_webcam_min_fixation_ms="${ML_WEBCAM_MIN_FIXATION_MS:-50}"
  local ml_webcam_max_fixation_ms="${ML_WEBCAM_MAX_FIXATION_MS:-1500}"
  local ml_webcam_idt_dispersion_threshold="${ML_WEBCAM_IDT_DISPERSION_THRESHOLD:-0.04}"
  local ml_webcam_idt_min_window_ms="${ML_WEBCAM_IDT_MIN_WINDOW_MS:-150}"
  local ml_webcam_line_transition_threshold="${ML_WEBCAM_LINE_TRANSITION_THRESHOLD:-0.04}"
  local ml_webcam_one_euro_mincutoff="${ML_WEBCAM_ONE_EURO_MINCUTOFF:-1.0}"
  local ml_webcam_one_euro_beta="${ML_WEBCAM_ONE_EURO_BETA:-0.007}"
  local ml_webcam_one_euro_dcutoff="${ML_WEBCAM_ONE_EURO_DCUTOFF:-1.0}"
  local ml_webcam_max_sequences="${ML_WEBCAM_MAX_SEQUENCES:-82}"
  local ml_webcam_min_sequences="${ML_WEBCAM_MIN_SEQUENCES:-10}"

  CONTAINER_CPU="${AZURE_CONTAINERAPP_CPU:-1.0}"
  CONTAINER_MEMORY="${AZURE_CONTAINERAPP_MEMORY:-2.0Gi}"
  CONTAINER_MIN_REPLICAS="${AZURE_CONTAINERAPP_MIN_REPLICAS:-1}"
  CONTAINER_MAX_REPLICAS="${AZURE_CONTAINERAPP_MAX_REPLICAS:-1}"
  CONTAINER_TARGET_PORT="${AZURE_CONTAINERAPP_TARGET_PORT:-8001}"

  ML_ENV_VARS=(
    "DEBUG=$ml_debug"
    "HOST=$ml_host"
    "PORT=$ml_port"
    "ALLOWED_ORIGINS=$ml_allowed_origins"
    "LOW_RISK_THRESHOLD=$ml_low_risk_threshold"
    "HIGH_RISK_THRESHOLD=$ml_high_risk_threshold"
    "EYE_TRACKER_SEQUENCE_LENGTH=$ml_eye_tracker_sequence_length"
    "EYE_TRACKER_SEQUENCE_STEP=$ml_eye_tracker_sequence_step"
    "EYE_TRACKER_MAX_SEQUENCES=$ml_eye_tracker_max_sequences"
    "EYE_TRACKER_MIN_FIXATION_MS=$ml_eye_tracker_min_fixation_ms"
    "EYE_TRACKER_MAX_FIXATION_MS=$ml_eye_tracker_max_fixation_ms"
    "WEBCAM_MIN_FIXATION_MS=$ml_webcam_min_fixation_ms"
    "WEBCAM_MAX_FIXATION_MS=$ml_webcam_max_fixation_ms"
    "WEBCAM_IDT_DISPERSION_THRESHOLD=$ml_webcam_idt_dispersion_threshold"
    "WEBCAM_IDT_MIN_WINDOW_MS=$ml_webcam_idt_min_window_ms"
    "WEBCAM_LINE_TRANSITION_THRESHOLD=$ml_webcam_line_transition_threshold"
    "WEBCAM_ONE_EURO_MINCUTOFF=$ml_webcam_one_euro_mincutoff"
    "WEBCAM_ONE_EURO_BETA=$ml_webcam_one_euro_beta"
    "WEBCAM_ONE_EURO_DCUTOFF=$ml_webcam_one_euro_dcutoff"
    "WEBCAM_MAX_SEQUENCES=$ml_webcam_max_sequences"
    "WEBCAM_MIN_SEQUENCES=$ml_webcam_min_sequences"
  )
}

configure_registry_auth() {
  az containerapp registry set \
    --name "$AZURE_CONTAINERAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --server ghcr.io \
    --username "$GHCR_USERNAME" \
    --password "$GHCR_PASSWORD"
}

get_containerapp_fqdn() {
  az containerapp show \
    --name "$AZURE_CONTAINERAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query properties.configuration.ingress.fqdn \
    -o tsv
}

show_containerapp_url() {
  local fqdn
  fqdn="$(get_containerapp_fqdn)"
  echo "Container App URL: https://$fqdn"
}

health_check_containerapp() {
  local attempts="${HEALTH_ATTEMPTS:-24}"
  local sleep_seconds="${HEALTH_SLEEP_SECONDS:-5}"
  local fqdn

  fqdn="$(get_containerapp_fqdn)"
  echo "Deployed URL: https://$fqdn"

  for i in $(seq 1 "$attempts"); do
    if python3 -c "import urllib.request; urllib.request.urlopen('https://$fqdn/health', timeout=5).read()" >/dev/null 2>&1; then
      echo "Health check passed."
      return 0
    fi

    echo "Waiting for service health ($i/$attempts)..."
    sleep "$sleep_seconds"
  done

  echo "Health check did not pass in time."
  return 1
}
