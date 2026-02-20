"""
Example data for API documentation (OpenAPI/Swagger).

These examples are used in schema definitions to provide meaningful
sample data in the API documentation. They use camelCase field names
matching the JSON wire format.

The gaze data is synthetic but structurally valid (passes schema
validation). It demonstrates the expected format for API consumers.
"""


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


def _generate_raw_gaze_points(
    start_x: int, start_y: int, start_ts: int, count: int
) -> list[dict]:
    """Generate a sequence of synthetic raw gaze points for documentation examples."""
    points = []
    for i in range(count):
        points.append(
            {
                "x": start_x + i * 15,
                "y": start_y + (i % 5) * 3,
                "timestamp": start_ts + i * 33,
            }
        )
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
}

PREDICTION_REQUEST_EXAMPLE = {
    "syllablesTask": {
        "gazePoints": _generate_gaze_points(0.1, 0.3, 1_000_000, 22),
    },
    "meaningfulTask": {
        "gazePoints": _generate_gaze_points(0.1, 0.35, 5_000_000, 22),
    },
    "pseudoTask": {
        "gazePoints": _generate_gaze_points(0.1, 0.4, 9_000_000, 22),
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
}

WEBCAM_PREDICTION_REQUEST_EXAMPLE = {
    "screenWidth": 1920,
    "screenHeight": 1080,
    "gazeData": _generate_raw_gaze_points(100, 500, 1_630_000_001, 22),
}
