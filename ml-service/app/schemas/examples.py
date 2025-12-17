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

RAW_GAZE_POINT_EXAMPLE = {
    "x": 960,
    "y": 540,
    "timestamp": 1630000001,
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
        "sequencesAnalyzed": 300,
        "totalFixations": 250,
    },
}

WEBCAM_PREDICTION_REQUEST_EXAMPLE = {
    "screenWidth": 1920,
    "screenHeight": 1080,
    "gazeData": [
        {"x": 100, "y": 500, "timestamp": 1630000001},
        {"x": 102, "y": 505, "timestamp": 1630000034},
        {"x": 105, "y": 508, "timestamp": 1630000067},
    ],
}
