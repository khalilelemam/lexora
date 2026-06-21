# ML Service

FastAPI service for dyslexia screening using eye-tracking and webcam-based gaze data.

## Overview

This service analyzes eye movement patterns during reading tasks to predict dyslexia risk. It supports two input methods:

- **Eye Tracker** - High-precision eye tracker data from three reading tasks (syllables, meaningful text, pseudo-words)
- **Webcam** - Lower-cost webcam gaze tracking using One Euro smoothing + I-DT fixation detection

## Quick Start

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate    # Linux/Mac

# Install dependencies
pip install -e ".[dev]"

# Run the service
python server.py
```

The API will be available at `http://localhost:8001`. Visit `/docs` for interactive API documentation.

## API Endpoints

See [API.md](API.md) for detailed documentation with examples.

### Health Check
- `GET /health` - Returns service status and version

### Predictions
- `POST /v1/eye-tracker/predict` - Analyze eye tracker data from 3 reading tasks
- `POST /v1/webcam/predict` - Analyze raw webcam gaze data

Both endpoints return dyslexia probability (0.0-1.0), risk level (low/medium/high),
confidence score, and `modelVersion` sourced from the service version in `pyproject.toml`.

## Configuration

Copy `.env.example` to `.env` and configure as needed:

```bash
# Server
DEBUG=false
PORT=8001
HOST=0.0.0.0

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Risk classification thresholds
LOW_RISK_THRESHOLD=0.33
HIGH_RISK_THRESHOLD=0.66

# QA Configurations
WEBCAM_MIN_SEQUENCES=10
```

> [!NOTE]
> Deep learning model contracts, input shapes (such as `WEBCAM_MAX_SEQUENCES=40`, `WEBCAM_N_FEATURES=6`), math normalization caps, and relative file paths are locked down as static constants (`ClassVar`) in `app/config.py` to prevent accidental environmental drift and ensure prediction reproducibility.

See `.env.example` for complete documentation of all options.

Application metadata (`name`, `version`, `description`) is sourced from `pyproject.toml`.

Dependency management is now fully pyproject-based:
- `pyproject.toml`: project metadata, runtime dependencies, dev extras, and tool configuration
- Install runtime deps: `pip install .`
- Install dev/test deps: `pip install -e .[dev]`

## Model Files

Place trained models in `models/`:

```
models/
├── eye-tracker/
│   ├── dyslexia_profile_model.keras
│   └── scaler.pkl
└── webcam/
    ├── dyslexia_uda_classifier.keras
    └── target_domain_scaler.pkl
```

## Testing

```bash
# Run unit tests (fast, mocked models)
pytest tests/ --ignore=tests/integration/

# Run integration tests (requires real models)
$env:REAL_TF="1"; pytest tests/integration/ -v  # Windows
REAL_TF=1 pytest tests/integration/ -v          # Linux/Mac
```

## Docker

Pre-built images are available on GitHub Container Registry.

The Docker image installs dependencies from `pyproject.toml` via `pip install .`.

```bash
# Pull the latest image
docker pull ghcr.io/khalil-elemam/lexora-ml:latest

# Run container
docker run -p 8001:8001 ghcr.io/khalil-elemam/lexora-ml:latest

# Pin to a specific version
docker pull ghcr.io/khalil-elemam/lexora-ml:1.2.1
docker run -p 8001:8001 ghcr.io/khalil-elemam/lexora-ml:1.2.1

# Pass environment variables
docker run -p 8001:8001 \
  -e DEBUG=true \
  -e WEBCAM_MIN_SEQUENCES=1 \
  ghcr.io/khalil-elemam/lexora-ml:latest
```

### Docker Compose

```yaml
services:
  ml-service:
    image: ghcr.io/khalil-elemam/lexora-ml:1.2.1
    ports:
      - "8001:8001"
    environment:
      DEBUG: "false"
      WEBCAM_MIN_SEQUENCES: "10"
```

### Build Locally

```bash
cd ml-service
docker build -t lexora-ml .
docker run -p 8001:8001 lexora-ml
```

## Requirements

- Python 3.12+
- TensorFlow 2.20+

## Azure Deployment (Container Apps)

The ML workflow includes an Azure Container Apps deploy path (best fit for your student credits).

Required GitHub environment secrets in `ml-production`:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Required repository secrets:
- `GHCR_USERNAME`
- `GHCR_PASSWORD`

Required GitHub environment variables in `ml-production`:
- `AZURE_CONTAINERAPP_NAME`
- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_CONTAINERAPP_ENV`
- `AZURE_CONTAINERAPP_TARGET_PORT` (optional, default: `8001`)
- `AZURE_CONTAINERAPP_CPU` (optional, default: `1.0`)
- `AZURE_CONTAINERAPP_MEMORY` (optional, default: `2.0Gi`)
- `AZURE_CONTAINERAPP_MIN_REPLICAS` (optional, default: `1`)
- `AZURE_CONTAINERAPP_MAX_REPLICAS` (optional, default: `1`)

Deploy behavior:
- On pull requests and pushes to `main` / `develop`, runs ML validation only (lint, unit tests, integration tests).
- On manual run (`workflow_dispatch`) of `.github/workflows/ml-service.yml`, runs validation plus a Docker build check only.
- On `lexora-ml-v*` tags, builds the matching image tag and deploys it to Azure Container Apps.
- Runtime configuration is read from the GitHub `ml-production` environment and applied to the Container App during deploy or sync.

Prerequisite:
- Create the Azure Container App and its environment once (initial provisioning). After bootstrap, the release and sync workflows handle updates.

### First-Time Azure Bootstrap

Use `.github/workflows/ml-service-azure-bootstrap.yml` (manual dispatch from `main`) to provision first-time resources:
- Resource Group
- Log Analytics workspace
- Container Apps Environment
- Initial Container App creation

After this one-time bootstrap:
- Use `.github/workflows/ml-service.yml` release tags (`lexora-ml-v*`) for production image deployments.
- Use `.github/workflows/ml-service-sync-env.yml` to sync GitHub `ml-production` environment values to the running Container App, optionally with a specific image tag.

