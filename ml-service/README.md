# ML Service

FastAPI service for dyslexia screening using eye-tracking gaze data.

## Overview

This service analyzes eye movement patterns during reading tasks to predict dyslexia risk. It uses a deep learning model trained on the ETDD70 dataset that processes gaze sequences from three reading tasks (syllables, meaningful text, and pseudo-words).

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

The API will be available at `http://localhost:8001`. Visit `/docs` for interactive documentation.

## API Endpoints

### Health Check

```http
GET /health
```

Returns service status and model loading state.

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "modelsLoaded": true
}
```

### Predict Dyslexia Risk

```http
POST /predict
```

Analyzes gaze data from three reading tasks and returns a dyslexia probability score.

**Request Body:**

```json
{
  "syllablesTask": {
    "gazePoints": [
      {"fixationX": 0.25, "fixationY": 0.40, "timestamp": 1000000},
      {"fixationX": 0.30, "fixationY": 0.41, "timestamp": 1200000}
    ]
  },
  "meaningfulTask": {
    "gazePoints": [...]
  },
  "pseudoTask": {
    "gazePoints": [...]
  },
  "screenWidth": 1680,
  "screenHeight": 1050
}
```

| Field | Type | Description |
|-------|------|-------------|
| `fixationX` | float | Normalized x position (0.0 - 1.0) |
| `fixationY` | float | Normalized y position (0.0 - 1.0) |
| `timestamp` | int | Timestamp in microseconds |
| `screenWidth` | int | Screen width in pixels (default: 1680) |
| `screenHeight` | int | Screen height in pixels (default: 1050) |

**Response:**

```json
{
  "dyslexiaProbability": 0.73,
  "riskLevel": "high",
  "confidence": 0.46,
  "metadata": {
    "modelVersion": "1.0.0",
    "sequencesAnalyzed": 300,
    "totalFixations": 450,
    "processedAt": "2025-12-07T10:30:00Z"
  }
}
```

| Field | Description |
|-------|-------------|
| `dyslexiaProbability` | Probability of dyslexia (0.0 - 1.0) |
| `riskLevel` | Classification: `low` (<0.33), `medium` (0.33-0.66), `high` (>0.66) |
| `confidence` | Model confidence in prediction (0.0 - 1.0) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        /predict endpoint                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │ Gaze Points  │───▶│ Feature Engineer │───▶│ Model Service│  │
│  │ (3 tasks)    │    │                  │    │              │  │
│  └──────────────┘    │ • Filter 80-1000ms│   │ • Encoder    │  │
│                      │ • Calc amplitudes │   │ • Classifier │  │
│                      │ • Calc velocities │   │ • Risk level │  │
│                      │ • Normalize       │   │              │  │
│                      │ • Create sequences│   └──────────────┘  │
│                      │ • Pad to (100,20,5)                      │
│                      └──────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Feature Engineering Pipeline

1. **Filter fixations**: Keep only fixations with duration 80-1000ms
2. **Calculate saccade metrics**: Amplitude and velocity between fixations
3. **Normalize**: Scale positions to screen dimensions
4. **Create sequences**: Sliding window of 20 fixations with step 5
5. **Pad/truncate**: Output shape (100, 20, 5) for each task

### Model Architecture

- **Input**: Three branches for syllables, meaningful, and pseudo tasks
- **Encoder**: Shared LSTM encoder pretrained on gaze patterns
- **Classifier**: Dense layers with dropout for binary classification

## Project Structure

```
ml-service/
├── app/
│   ├── api.py              # FastAPI app factory
│   ├── config.py           # Settings and environment config
│   ├── core/
│   │   ├── exceptions.py   # Custom exception handlers
│   │   ├── lifespan.py     # Startup/shutdown logic
│   │   └── middleware.py   # CORS and request logging
│   ├── routers/
│   │   ├── health.py       # Health check endpoint
│   │   └── predict.py      # Prediction endpoint
│   ├── schemas/
│   │   ├── gaze.py         # GazePoint, GazeSequence models
│   │   ├── health.py       # HealthResponse model
│   │   └── prediction.py   # Request/Response models
│   └── services/
│       ├── feature_engineer.py  # Gaze data preprocessing
│       └── model_service.py     # TensorFlow model inference
├── models/
│   └── dyslexia-profile-model.h5
├── tests/
│   ├── conftest.py         # Shared fixtures
│   ├── test_*.py           # Unit tests
│   └── integration/        # Integration tests (real model)
├── server.py               # Entry point
└── requirements.txt
```

## Configuration

Environment variables (or `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `false` | Enable debug mode |
| `PORT` | `8001` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `ALLOWED_ORIGINS` | `["*"]` | CORS allowed origins |
| `SKIP_MODEL_LOADING` | `false` | Skip loading ML models (for testing) |

## Testing

```bash
# Run unit tests (fast, mocked TensorFlow)
pytest tests/ --ignore=tests/integration/

# Run integration tests (requires real model)
$env:REAL_TF="1"; pytest tests/integration/ -v

# Run all tests
$env:REAL_TF="1"; pytest tests/ -v
```

### Test Structure

- **Unit tests** (~2s): Mock TensorFlow for fast execution, test business logic
- **Integration tests** (~100s): Use real model, verify full pipeline

## Requirements

- Python 3.10+
- TensorFlow 2.x
- See `requirements.txt` for full dependencies

## Model Files

Place trained model files in `models/`:

- `dyslexia-profile-model.h5` - Main classifier model
- `scaler.pkl` - Feature scaler (StandardScaler from training)
