# ML Service

FastAPI service for dyslexia screening using eye-tracking and webcam-based gaze data.

## Overview

This service analyzes eye movement patterns during reading tasks to predict dyslexia risk. It supports two input methods:

- **Eye Tracker** - High-precision eye tracker data from three reading tasks (syllables, meaningful text, pseudo-words)
- **Webcam** - Lower-cost webcam gaze tracking using I-VT fixation detection algorithm

## Quick Start

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate    # Linux/Mac

# Install dependencies
pip install -r requirements.txt

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

# Webcam I-VT Algorithm
WEBCAM_VELOCITY_THRESHOLD=0.5
WEBCAM_MIN_FIXATION_MS=50
WEBCAM_EMA_ALPHA=0.5
WEBCAM_MAX_SEQUENCES=82
WEBCAM_MIN_SEQUENCES=10
```

See `.env.example` for complete documentation of all options.

## Model Files

Place trained models in `models/`:

```
models/
├── eye-tracker/
│   ├── dyslexia-profile-model.h5
│   └── scaler.pkl
└── webcam/
    ├── dyslexia-uda-classifier.h5
    └── target-domain-scaler.pkl
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
  -e WEBCAM_VELOCITY_THRESHOLD=0.6 \
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
      WEBCAM_VELOCITY_THRESHOLD: "0.5"
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
- See `requirements.txt` for all dependencies

