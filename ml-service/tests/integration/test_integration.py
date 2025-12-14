"""
Integration tests - use real TensorFlow/Keras model.

Run with: REAL_TF=1 pytest tests/integration/ -v

These tests verify the full pipeline with actual model inference,
unlike unit tests which mock the ML components.
"""

import numpy as np
import pytest
from starlette.testclient import TestClient

from app.api import create_app
from app.config import settings
from tests.fixtures.loader import load_case, load_case_all_tasks


class TestModelLoading:

    def test_model_loads_successfully(self, real_model_service):
        assert real_model_service.model is not None
        assert real_model_service.is_loaded()

    def test_model_architecture_has_three_inputs(self, real_model_service):
        """Model expects syllables, meaningful, and pseudo task inputs."""
        model = real_model_service.model
        assert len(model.inputs) == 3


class TestFeatureEngineering:

    def test_scaler_loads(self, real_feature_engineer):
        assert real_feature_engineer.scaler is not None

    def test_output_shape(self, real_feature_engineer):
        points = load_case("tn-1209", "meaningful-text")
        result = real_feature_engineer.process_gaze_points(
            points, screen_width=1680, screen_height=1050
        )
        assert result.shape == (100, 20, 5)

    def test_output_contains_no_nan_or_inf(self, real_feature_engineer):
        points = load_case("tn-1209", "meaningful-text")
        result = real_feature_engineer.process_gaze_points(
            points, screen_width=1680, screen_height=1050
        )
        assert not np.isnan(result).any()
        assert not np.isinf(result).any()


class TestPrediction:

    def test_prediction_output_range(self, real_model_service):
        np.random.seed(42)
        dummy = np.random.randn(
            settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5
        ).astype(np.float32)

        prob, conf, n = real_model_service.predict(dummy, dummy, dummy)

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= conf <= 1.0
        assert n == settings.MAX_SEQUENCES * 3

    def test_prediction_is_deterministic(self, real_model_service):
        """Same input should always produce same output."""
        np.random.seed(42)
        dummy = np.random.randn(
            settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5
        ).astype(np.float32)

        result1 = real_model_service.predict(dummy, dummy, dummy)
        result2 = real_model_service.predict(dummy, dummy, dummy)

        assert result1[0] == result2[0]


class TestFullPipeline:
    """End-to-end tests with real ETDD70 dataset cases."""

    def test_true_positive_dyslexic_classification(
        self, real_model_service, real_feature_engineer
    ):
        """TP-1174: Dyslexic participant should be classified as high risk."""
        tasks = load_case_all_tasks("tp-1174")

        syl = real_feature_engineer.process_gaze_points(tasks["syllables"], 1680, 1050)
        mean = real_feature_engineer.process_gaze_points(
            tasks["meaningful"], 1680, 1050
        )
        pseudo = real_feature_engineer.process_gaze_points(tasks["pseudo"], 1680, 1050)

        prob, conf, n = real_model_service.predict(syl, mean, pseudo)
        risk = real_model_service.get_risk_level(prob)

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= conf <= 1.0
        assert (
            risk == "high"
        ), f"Expected high risk for dyslexic case, got {risk} (prob={prob})"
        assert prob > 0.66, f"Dyslexic probability should be >0.66, got {prob}"

    def test_true_negative_non_dyslexic_classification(
        self, real_model_service, real_feature_engineer
    ):
        """TN-1209: Non-dyslexic participant should be classified as low risk."""
        tasks = load_case_all_tasks("tn-1209")

        syl = real_feature_engineer.process_gaze_points(tasks["syllables"], 1680, 1050)
        mean = real_feature_engineer.process_gaze_points(
            tasks["meaningful"], 1680, 1050
        )
        pseudo = real_feature_engineer.process_gaze_points(tasks["pseudo"], 1680, 1050)

        prob, conf, n = real_model_service.predict(syl, mean, pseudo)
        risk = real_model_service.get_risk_level(prob)

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= conf <= 1.0
        assert (
            risk == "low"
        ), f"Expected low risk for non-dyslexic case, got {risk} (prob={prob})"
        assert prob < 0.33, f"Non-dyslexic probability should be <0.33, got {prob}"

    def test_false_positive_edge_case(self, real_model_service, real_feature_engineer):
        """FP-1065: Non-dyslexic misclassified as high risk (edge case)."""
        tasks = load_case_all_tasks("fp-1065")

        syl = real_feature_engineer.process_gaze_points(tasks["syllables"], 1680, 1050)
        mean = real_feature_engineer.process_gaze_points(
            tasks["meaningful"], 1680, 1050
        )
        pseudo = real_feature_engineer.process_gaze_points(tasks["pseudo"], 1680, 1050)

        prob, conf, n = real_model_service.predict(syl, mean, pseudo)

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= conf <= 1.0
        assert prob > 0.66, f"FP case should have high probability, got {prob}"


class TestAPIEndpoint:

    @pytest.fixture
    def client(self):
        app = create_app()
        with TestClient(app) as client:
            yield client

    def test_health_endpoint(self, client):
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["modelsLoaded"] is True

    def test_predict_endpoint_with_dyslexic_case(self, client):
        """API should classify TP-1174 as high risk."""
        tasks = load_case_all_tasks("tp-1174")
        request_data = {
            "syllablesTask": {"gaze_points": _points_to_dict(tasks["syllables"])},
            "meaningfulTask": {"gaze_points": _points_to_dict(tasks["meaningful"])},
            "pseudoTask": {"gaze_points": _points_to_dict(tasks["pseudo"])},
            "screenWidth": 1680,
            "screenHeight": 1050,
        }

        response = client.post("/predict", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["riskLevel"] == "high"
        assert data["dyslexiaProbability"] > 0.66
        assert "confidence" in data
        assert "metadata" in data

    def test_predict_endpoint_with_non_dyslexic_case(self, client):
        """API should classify TN-1209 as low risk."""
        tasks = load_case_all_tasks("tn-1209")
        request_data = {
            "syllablesTask": {"gaze_points": _points_to_dict(tasks["syllables"])},
            "meaningfulTask": {"gaze_points": _points_to_dict(tasks["meaningful"])},
            "pseudoTask": {"gaze_points": _points_to_dict(tasks["pseudo"])},
            "screenWidth": 1680,
            "screenHeight": 1050,
        }

        response = client.post("/predict", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["riskLevel"] == "low"
        assert data["dyslexiaProbability"] < 0.33


def _points_to_dict(points):
    return [
        {
            "fixation_x": p.fixation_x,
            "fixation_y": p.fixation_y,
            "timestamp": p.timestamp,
        }
        for p in points
    ]
