"""
Example data for API documentation (OpenAPI/Swagger).

These examples are used in schema definitions to provide meaningful
sample data in the API documentation. They use camelCase field names
matching the JSON wire format.

The gaze data is synthetic but structurally valid (passes schema
validation). It demonstrates the expected format for API consumers.
"""

import math


def _generate_gaze_points(
    start_x: float, start_y: float, start_ts: int, count: int
) -> list[dict]:
    """Generate a sequence of synthetic gaze points for documentation examples."""
    points = []
    for i in range(count):
        points.append(
            {
                "fixationX": round(start_x + i * 0.02, 3),
                "fixationY": round(start_y + (i % 5) * 0.005, 3),
                "timestamp": start_ts + i * 150_000,
            }
        )
    return points


def _generate_raw_gaze_points(count: int = 800) -> list[dict]:
    """Generate a realistic webcam reading example with fixation-saccade patterns.

    Produces ~80+ fixations so the I-DT pipeline can build 10+ sequences.
    Simulates left-to-right reading across multiple lines at ~60 fps.
    """
    points: list[dict] = []
    ts = 1_000  # start at 1 000 ms
    screen_w, screen_h = 1920, 1080

    lines = [0.30, 0.40, 0.50, 0.60, 0.70]
    x_progress = 0.12
    line_idx = 0
    i = 0

    while i < count:
        # Current fixation centre (pixel coords)
        cx = x_progress * screen_w
        cy = lines[line_idx % len(lines)] * screen_h

        # 5-8 points per fixation ≈ 64-112 ms at 16 ms/frame
        n_fix = min(5 + (i % 4), count - i)
        for _ in range(n_fix):
            jx = math.sin(i * 0.7) * 2  # deterministic jitter
            jy = math.cos(i * 0.9) * 2
            points.append(
                {
                    "x": round(max(0, min(cx + jx, screen_w)), 1),
                    "y": round(max(0, min(cy + jy, screen_h)), 1),
                    "timestamp": ts,
                }
            )
            ts += 16
            i += 1

        # Saccade to next word (skip 1-2 frames worth of time)
        ts += 32
        x_progress += 0.08 + (i % 3) * 0.01

        if x_progress > 0.85:
            x_progress = 0.12 + (i % 5) * 0.005
            line_idx += 1

    return points


GAZE_POINT_EXAMPLE = {
    "fixationX": 0.523,
    "fixationY": 0.412,
    "timestamp": 1234567890,
}

RAW_GAZE_POINT_EXAMPLE = {
    "x": 960,
    "y": 540,
    "timestamp": 1630000001,
}

_EXAMPLE_GAZE_POINTS = _generate_gaze_points(0.1, 0.3, 1_000_000, 22)

GAZE_SEQUENCE_EXAMPLE = {
    "gazePoints": _EXAMPLE_GAZE_POINTS,
    "normalizedLineCenters": [0.25, 0.5, 0.75],
}

PREDICTION_REQUEST_EXAMPLE = {
    "syllablesTask": {
        "gazePoints": _generate_gaze_points(0.1, 0.3, 1_000_000, 22),
        "normalizedLineCenters": [0.25, 0.5, 0.75],
    },
    "meaningfulTask": {
        "gazePoints": _generate_gaze_points(0.1, 0.35, 5_000_000, 22),
        "normalizedLineCenters": [0.22, 0.44, 0.66],
    },
    "pseudoTask": {
        "gazePoints": _generate_gaze_points(0.1, 0.4, 9_000_000, 22),
        "normalizedLineCenters": [0.3, 0.6],
    },
    "screenWidth": 1920,
    "screenHeight": 1080,
}

PREDICTION_RESPONSE_EXAMPLE = {
    "dyslexiaProbability": 0.73,
    "riskLevel": "high",
    "confidence": 0.89,
    "metadata": {
        "sequencesAnalyzed": 300,
        "totalFixations": 250,
    },
    "features": {
        "syllables": [
            {
                "timestamp": 1000,
                "durationMs": 215.3,
                "fixationX": 0.12,
                "fixationY": 0.35,
                "saccadeAmplitude": 0.0,
                "saccadeVelocity": 0.0,
            },
            {
                "timestamp": 1250,
                "durationMs": 190.5,
                "fixationX": 0.25,
                "fixationY": 0.36,
                "saccadeAmplitude": 0.045,
                "saccadeVelocity": 0.237,
            },
        ],
        "meaningful": [
            {
                "timestamp": 5000,
                "durationMs": 200.7,
                "fixationX": 0.10,
                "fixationY": 0.45,
                "saccadeAmplitude": 0.0,
                "saccadeVelocity": 0.0,
            },
            {
                "timestamp": 5200,
                "durationMs": 245.2,
                "fixationX": 0.22,
                "fixationY": 0.46,
                "saccadeAmplitude": 0.042,
                "saccadeVelocity": 0.171,
            },
        ],
        "pseudo": [
            {
                "timestamp": 9000,
                "durationMs": 260.0,
                "fixationX": 0.15,
                "fixationY": 0.55,
                "saccadeAmplitude": 0.0,
                "saccadeVelocity": 0.0,
            },
            {
                "timestamp": 9300,
                "durationMs": 210.8,
                "fixationX": 0.30,
                "fixationY": 0.54,
                "saccadeAmplitude": 0.055,
                "saccadeVelocity": 0.261,
            },
        ],
    },
}

WEBCAM_PREDICTION_REQUEST_EXAMPLE = {
    "screenWidth": 1920,
    "screenHeight": 1080,
    "gazeData": _generate_raw_gaze_points(800),
    "normalizedLineCenters": [0.28, 0.46, 0.64],
}
