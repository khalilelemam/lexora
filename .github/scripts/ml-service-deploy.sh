#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ml-service-common.sh"

update_image="${UPDATE_IMAGE:-false}"
verify_health="${VERIFY_HEALTH:-true}"
image_tag="${IMAGE_TAG:-}"

validate_deploy_inputs "$update_image" "$image_tag"

if ! az containerapp show --name "$AZURE_CONTAINERAPP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container App '$AZURE_CONTAINERAPP_NAME' does not exist in resource group '$AZURE_RESOURCE_GROUP'."
  echo "Run the ML Service Azure Bootstrap workflow first."
  exit 1
fi

build_ml_env_vars

if [ "$update_image" = "true" ]; then
  configure_registry_auth

  az containerapp update \
    --name "$AZURE_CONTAINERAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --image "${REGISTRY}/${IMAGE_NAME}:${image_tag}" \
    --cpu "$CONTAINER_CPU" \
    --memory "$CONTAINER_MEMORY" \
    --min-replicas "$CONTAINER_MIN_REPLICAS" \
    --max-replicas "$CONTAINER_MAX_REPLICAS" \
    --set-env-vars "${ML_ENV_VARS[@]}"
else
  az containerapp update \
    --name "$AZURE_CONTAINERAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --cpu "$CONTAINER_CPU" \
    --memory "$CONTAINER_MEMORY" \
    --min-replicas "$CONTAINER_MIN_REPLICAS" \
    --max-replicas "$CONTAINER_MAX_REPLICAS" \
    --set-env-vars "${ML_ENV_VARS[@]}"
fi

show_containerapp_url

if [ "$verify_health" = "true" ]; then
  health_check_containerapp
fi
