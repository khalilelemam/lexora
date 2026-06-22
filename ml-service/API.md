# ML Service API Documentation

## Base URL

```
http://localhost:8001
```

## Endpoints

### Health Check

Check service health and model status.

```http
GET /health
```

#### Response

| Status Code | Description |
|-------------|-------------|
| 200 | Service is healthy |

```json
{
  "status": "ok",
  "version": "1.2.1"
}
```

---

### Eye Tracker Prediction

Predict dyslexia risk from professional eye-tracking data collected during three reading tasks.

```http
POST /v1/eye-tracker/predict
```

#### Request Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |

#### Request Body

```json
{
  "syllablesTask": {
    "gazePoints": [
      {"fixationX": 0.15, "fixationY": 0.35, "timestamp": 1000000},
      {"fixationX": 0.22, "fixationY": 0.36, "timestamp": 1250000},
      {"fixationX": 0.28, "fixationY": 0.35, "timestamp": 1480000}
    ]
  },
  "meaningfulTask": {
    "gazePoints": [
      {"fixationX": 0.12, "fixationY": 0.40, "timestamp": 1000000},
      {"fixationX": 0.20, "fixationY": 0.41, "timestamp": 1200000}
    ]
  },
  "pseudoTask": {
    "gazePoints": [
      {"fixationX": 0.10, "fixationY": 0.45, "timestamp": 1000000},
      {"fixationX": 0.18, "fixationY": 0.46, "timestamp": 1300000}
    ]
  },
  "screenWidth": 1680,
  "screenHeight": 1050
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `syllablesTask` | GazeSequence | Yes | Gaze data from syllables reading task |
| `meaningfulTask` | GazeSequence | Yes | Gaze data from meaningful text task |
| `pseudoTask` | GazeSequence | Yes | Gaze data from pseudo-words task |
| `screenWidth` | integer | No | Screen width in pixels (default: 1680) |
| `screenHeight` | integer | No | Screen height in pixels (default: 1050) |

**GazeSequence Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gazePoints` | GazePoint[] | Yes | Array of gaze points (minimum 20) |

**GazePoint Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `fixationX` | float | Yes | 0.0 - 1.0 | Normalized X position |
| `fixationY` | float | Yes | 0.0 - 1.0 | Normalized Y position |
| `timestamp` | integer | Yes | > 0 | Timestamp in microseconds |

#### Response

**Success (200 OK)**

```json
{
  "dyslexiaProbability": 0.73,
  "riskLevel": "high",
  "confidence": 0.46,
  "modelVersion": "1.2.1",
  "metadata": {
    "sequencesAnalyzed": 300,
    "totalFixations": 450
  },
  "features": {
    "syllables": [
      {
        "timestamp": 1000,
        "durationMs": 215.3, 
        "fixationX": 0.12, 
        "fixationY": 0.35, 
        "saccadeAmplitude": 0.0, 
        "saccadeVelocity": 0.0
      },
      {
        "timestamp": 1250,
        "durationMs": 190.5, 
        "fixationX": 0.25, 
        "fixationY": 0.36, 
        "saccadeAmplitude": 0.045, 
        "saccadeVelocity": 0.237
      }
    ],
    "meaningful": [
      {
        "timestamp": 5000,
        "durationMs": 200.7, 
        "fixationX": 0.10, 
        "fixationY": 0.45, 
        "saccadeAmplitude": 0.0, 
        "saccadeVelocity": 0.0
      }
    ],
    "pseudo": [
      {
        "timestamp": 9000,
        "durationMs": 260.0, 
        "fixationX": 0.15, 
        "fixationY": 0.55, 
        "saccadeAmplitude": 0.0, 
        "saccadeVelocity": 0.0
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dyslexiaProbability` | float | Probability of dyslexia (0.0 - 1.0) |
| `riskLevel` | string | Risk classification: "low", "medium", or "high" |
| `confidence` | float | Model confidence (0.0 - 1.0) |
| `modelVersion` | string | Service version that produced the prediction |
| `metadata.sequencesAnalyzed` | integer | Number of gaze sequences processed |
| `metadata.totalFixations` | integer | Total fixation count across all tasks |
| `features` | object | Raw per-fixation feature vectors (model input) per task |

**EyeTrackerFeatureRow Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | integer | Fixation start time in milliseconds |
| `durationMs` | float | Fixation duration in milliseconds |
| `fixationX` | float | Normalized X position (0-1) |
| `fixationY` | float | Normalized Y position (0-1) |
| `saccadeAmplitude` | float | Saccade distance normalized by screen diagonal |
| `saccadeVelocity` | float | Saccade amplitude per millisecond |

**Error (400 Bad Request)**

```json
{
  "code": "BAD_REQUEST",
  "message": "Insufficient valid fixations after filtering. Please ensure good lighting and track for the full duration."
}
```

**Error (422 Unprocessable Entity)**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "One or more fields failed validation.",
  "details": [
    {"field": "syllablesTask.gazePoints", "message": "List should have at least 20 items"}
  ]
}
```

---

### Webcam Prediction

Predict dyslexia risk from webcam-based gaze tracking data.

```http
POST /v1/webcam/predict
```

#### Request Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |

#### Request Body

```json
{
  "gazeData": [
    {"x": 288.5, "y": 270.0, "timestamp": 1000},
    {"x": 290.2, "y": 271.5, "timestamp": 1016},
    {"x": 289.8, "y": 270.8, "timestamp": 1032},
    {"x": 291.1, "y": 272.0, "timestamp": 1048},
    {"x": 450.3, "y": 275.2, "timestamp": 1064}
  ],
  "screenWidth": 1920,
  "screenHeight": 1080
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gazeData` | RawGazePoint[] | Yes | Array of raw gaze points (minimum 20) |
| `screenWidth` | integer | Yes | Screen width in pixels |
| `screenHeight` | integer | Yes | Screen height in pixels |

**RawGazePoint Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `x` | float | Yes | Any | X position in pixels |
| `y` | float | Yes | Any | Y position in pixels |
| `timestamp` | integer | Yes | > 0 | Timestamp in milliseconds |

> **Note:** Raw gaze points can have any X/Y values. Out-of-bounds points (outside 0-screenWidth/Height) are filtered during processing.

#### Response

**Success (200 OK)**

```json
{
  "dyslexiaProbability": 0.58,
  "riskLevel": "medium",
  "confidence": 1.0,
  "modelVersion": "1.2.1",
  "metadata": {
    "sequencesAnalyzed": 27,
    "totalFixations": 156
  },
  "features": [
    {
      "timestamp": 1000,
      "durationMs": 180.5, 
      "fixationX": 0.25, 
      "fixationY": 0.35,
      "saccadeAmplitude": 0.0, 
      "efficiencyRatio": 0.0,
      "isRegression": false,
      "isReturnSweep": false
    },
    {
      "timestamp": 1200,
      "durationMs": 200.0, 
      "fixationX": 0.38, 
      "fixationY": 0.36, 
      "saccadeAmplitude": 0.13, 
      "efficiencyRatio": 7.26,
      "isRegression": false,
      "isReturnSweep": false
    },
    {
      "timestamp": 1450,
      "durationMs": 150.2, 
      "fixationX": 0.22, 
      "fixationY": 0.35, 
      "saccadeAmplitude": 0.16, 
      "efficiencyRatio": 6.84,
      "isRegression": true,
      "isReturnSweep": false
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dyslexiaProbability` | float | Probability of dyslexia (0.0 - 1.0) |
| `riskLevel` | string | Risk classification: "low", "medium", or "high" |
| `confidence` | float | Confidence score (currently fixed at `1.0` for webcam predictions) |
| `modelVersion` | string | Service version that produced the prediction |
| `metadata.sequencesAnalyzed` | integer | Number of gaze sequences processed |
| `metadata.totalFixations` | integer | Total valid fixations after processing |
| `features` | WebcamFeatureRow[] | Raw per-fixation feature vectors used for UI replay and debugging |

**WebcamFeatureRow Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | integer | Fixation start time in milliseconds |
| `durationMs` | float | Fixation duration in milliseconds |
| `fixationX` | float | Normalized fixation X (0-1) |
| `fixationY` | float | Normalized fixation Y (0-1) |
| `saccadeAmplitude` | float | Saccade distance from previous fixation |
| `efficiencyRatio` | float | Per-fixation duration-to-saccade efficiency feature used by the webcam model |
| `isRegression` | boolean | True if eye moved backward (right-to-left) |
| `isReturnSweep` | boolean | True if fixation moved to a later text line |

**Error (400 Bad Request)**

```json
{
  "code": "BAD_REQUEST",
  "message": "Insufficient data. Please ensure good lighting and read for the full duration."
}
```

**Error (422 Unprocessable Entity)**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "One or more fields failed validation.",
  "details": [
    {"field": "gazeData", "message": "List should have at least 20 items"}
  ]
}
```

---

## Data Requirements

### Eye Tracker Data

- **Minimum points per task:** 20 gaze points
- **Timestamp format:** Microseconds (1 second = 1,000,000 μs)
- **Coordinate format:** Normalized (0.0 - 1.0)
- **Timestamp order:** Must be strictly ascending
- **Fixation filtering:** Only fixations 80-1000ms duration are used

### Webcam Data

- **Minimum points:** 20 raw gaze points
- **Recommended points:** 2000+ for best results
- **Timestamp format:** Milliseconds (1 second = 1,000 ms)
- **Coordinate format:** Pixels (will be normalized internally)
- **Sample rate:** ~60fps recommended (16ms intervals)
- **Fixation filtering:** Only fixations 50-1500ms duration are used

### Timestamp Conversion

```javascript
// Eye tracker (microseconds):
const timestampMicroseconds = Date.now() * 1000;

// Webcam (milliseconds):
const timestampMilliseconds = Date.now();
```

```python
# Eye tracker (microseconds):
import time
timestamp_us = int(time.time() * 1_000_000)

# Webcam (milliseconds):
timestamp_ms = int(time.time() * 1000)
```

---

## Risk Level Classification

| Risk Level | Probability Range | Description |
|------------|-------------------|-------------|
| `low` | < 0.33 | Low risk of dyslexia |
| `medium` | 0.33 - 0.66 | Moderate risk, further assessment recommended |
| `high` | > 0.66 | High risk, professional evaluation recommended |

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid data or insufficient fixations |
| 422 | Validation Error - Schema validation failed |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Models not loaded |

---

## Examples

### HTTPie

```bash
# Eye Tracker
http POST http://localhost:8001/v1/eye-tracker/predict \
  syllablesTask:='{"gazePoints": [{"fixationX": 0.15, "fixationY": 0.35, "timestamp": 1000000}]}' \
  meaningfulTask:='{"gazePoints": [{"fixationX": 0.12, "fixationY": 0.40, "timestamp": 1000000}]}' \
  pseudoTask:='{"gazePoints": [{"fixationX": 0.10, "fixationY": 0.45, "timestamp": 1000000}]}' \
  screenWidth:=1680 \
  screenHeight:=1050

# Webcam
http POST http://localhost:8001/v1/webcam/predict \
  gazeData:='[{"x": 288.5, "y": 270.0, "timestamp": 1000}]' \
  screenWidth:=1920 \
  screenHeight:=1080
```

---

## OpenAPI Specification

Interactive API documentation is available at:

- **Swagger UI:** `http://localhost:8001/docs`
- **ReDoc:** `http://localhost:8001/redoc`
- **OpenAPI JSON:** `http://localhost:8001/openapi.json`
