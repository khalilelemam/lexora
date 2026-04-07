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

Both endpoints return dyslexia probability (0.0-1.0), risk level (low/medium/high), and confidence score.

## Configuration

Copy `.env.example` to `.env` and configure as needed:

```bash
# Server
DEBUG=false
PORT=8001
HOST=0.0.0.0

# Eye Tracker Features  
EYE_TRACKER_SEQUENCE_LENGTH=20
EYE_TRACKER_SEQUENCE_STEP=5
EYE_TRACKER_MAX_SEQUENCES=100
EYE_TRACKER_MIN_FIXATION_MS=80
EYE_TRACKER_MAX_FIXATION_MS=1000

# Webcam I-DT + One Euro
WEBCAM_MIN_FIXATION_MS=50
WEBCAM_MAX_FIXATION_MS=1500
WEBCAM_IDT_DISPERSION_THRESHOLD=0.04
WEBCAM_IDT_MIN_WINDOW_MS=150
WEBCAM_LINE_TRANSITION_THRESHOLD=0.04
WEBCAM_ONE_EURO_MINCUTOFF=1.0
WEBCAM_ONE_EURO_BETA=0.007
WEBCAM_ONE_EURO_DCUTOFF=1.0
WEBCAM_MAX_SEQUENCES=82
WEBCAM_MIN_SEQUENCES=10
```

For paragraph-style tasks, sending normalized line centers from the client is strongly recommended for more stable line-aware regression and return-sweep detection.

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
docker pull ghcr.io/khalil-elemam/lexora-ml:1.0.0
docker run -p 8001:8001 ghcr.io/khalil-elemam/lexora-ml:1.0.0

# Pass environment variables
docker run -p 8001:8001 \
  -e DEBUG=true \
  -e WEBCAM_IDT_DISPERSION_THRESHOLD=0.045 \
  ghcr.io/khalil-elemam/lexora-ml:latest
```

### Docker Compose

```yaml
services:
  ml-service:
    image: ghcr.io/khalil-elemam/lexora-ml:1.0.0
    ports:
      - "8001:8001"
    environment:
      DEBUG: "false"
      WEBCAM_IDT_DISPERSION_THRESHOLD: "0.04"
      EYE_TRACKER_MIN_FIXATION_MS: "80"
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

The ML workflow includes an Azure Container Apps deploy job (best fit for your student credits).

Required repository secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `GHCR_USERNAME`
- `GHCR_PASSWORD`

Required repository variables:
- `AZURE_CONTAINERAPP_NAME`
- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_CONTAINERAPP_ENV`
- `AZURE_CONTAINERAPP_TARGET_PORT` (optional, default: `8001`)

Deploy behavior:
- On `lexora-ml-v*` tags, deploys the matching image tag.
- On manual run (`workflow_dispatch`), deploys `latest`.

Prerequisite:
- Create the Azure Container App and its environment once (initial provisioning). The workflow then updates the image on each deployment.

### First-Time Azure Bootstrap

Use `.github/workflows/ml-service-azure-bootstrap.yml` (manual dispatch) to provision first-time resources:
- Resource Group
- Log Analytics workspace
- Container Apps Environment
- Container App (or update if it already exists)

After this one-time bootstrap, the regular `deploy-azure` job in `ml-service.yml` is enough for image updates.

