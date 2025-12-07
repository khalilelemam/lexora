"""
Example data for API documentation (OpenAPI/Swagger).

These examples are used in schema definitions to provide meaningful
sample data in the API documentation.
"""

GAZE_POINT_EXAMPLE = {
    "fixation_x": 0.523,
    "fixation_y": 0.412,
    "timestamp": 1234567890,
}

GAZE_SEQUENCE_EXAMPLE = {
    "gaze_points": [
        {"fixation_x": 0.5, "fixation_y": 0.3, "timestamp": 1000},
        {"fixation_x": 0.52, "fixation_y": 0.31, "timestamp": 1150},
    ]
}

PREDICTION_REQUEST_EXAMPLE = {
    "syllablesTask": {
        "gazePoints": [
            {"fixationX": 0.5, "fixationY": 0.3, "timestamp": 1000000},
            {"fixationX": 0.52, "fixationY": 0.31, "timestamp": 1150000},
        ]
    },
    "meaningfulTask": {
        "gazePoints": [
            {"fixationX": 0.5, "fixationY": 0.3, "timestamp": 1000000},
            {"fixationX": 0.52, "fixationY": 0.31, "timestamp": 1150000},
        ]
    },
    "pseudoTask": {
        "gazePoints": [
            {"fixationX": 0.5, "fixationY": 0.3, "timestamp": 1000000},
            {"fixationX": 0.52, "fixationY": 0.31, "timestamp": 1150000},
        ]
    },
    "screenWidth": 1920,
    "screenHeight": 1080,
}

PREDICTION_RESPONSE_EXAMPLE = {
    "dyslexiaProbability": 0.73,
    "riskLevel": "high",
    "confidence": 0.89,
    "metadata": {
        "modelVersion": "1.0.0",
        "sequencesAnalyzed": 300,
        "totalFixations": 250,
        "processedAt": "2025-12-04T10:30:00Z",
    },
}
