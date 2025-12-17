import os
import sys
import numpy as np
import pytest
from unittest.mock import Mock


# Skip entire module when running with real TensorFlow (integration tests)
pytestmark = pytest.mark.skipif(
    os.environ.get("REAL_TF") == "1",
    reason="Unit tests require mocked TensorFlow; use integration tests for real model",
)


class TestEyeTrackerPredictionService:
    """
    Unit tests for EyeTrackerPredictionService.

    These tests mock the Keras model to test business logic (risk classification,
    confidence calculation) without requiring TensorFlow. Integration tests
    verify actual model loading and inference.
    """

    @pytest.fixture
    def mock_model(self):
        model = Mock()
        model.predict = Mock(return_value=np.array([[0.65]]))
        return model

    @pytest.fixture
    def prediction_service(self, mock_model):
        """EyeTrackerPredictionService with mocked Keras model."""
        # Configure the module-level keras mock to return our mock model
        sys.modules["keras"].models.load_model.return_value = mock_model

        from app.services.eye_tracker.prediction import EyeTrackerPredictionService

        # Manually create service bypassing __init__
        service = EyeTrackerPredictionService.__new__(EyeTrackerPredictionService)
        service.model = mock_model
        return service

    # --- Prediction Output Tests ---

    def test_predict_returns_dict_with_required_keys(self, prediction_service):
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert "dyslexia_probability" in result
        assert "confidence" in result
        assert "risk_level" in result
        assert "sequences_analyzed" in result

    def test_predict_returns_valid_probability(self, prediction_service):
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert isinstance(result["dyslexia_probability"], float)
        assert 0 <= result["dyslexia_probability"] <= 1

    def test_predict_returns_valid_confidence(self, prediction_service):
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert isinstance(result["confidence"], float)
        assert 0 <= result["confidence"] <= 1

    def test_sequences_analyzed_is_300(self, prediction_service):
        """300 = 100 sequences * 3 tasks"""
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert result["sequences_analyzed"] == 300

    def test_confidence_formula(self, prediction_service):
        """Confidence = |probability - 0.5| * 2"""
        prediction_service.model.predict.return_value = np.array([[0.8]])
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        expected_conf = abs(0.8 - 0.5) * 2  # 0.6
        assert np.isclose(result["dyslexia_probability"], 0.8)
        assert np.isclose(result["confidence"], expected_conf)

    def test_confidence_at_midpoint_is_zero(self, prediction_service):
        """Probability of 0.5 should give confidence of 0."""
        prediction_service.model.predict.return_value = np.array([[0.5]])
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert result["confidence"] == 0.0

    # --- Input Validation Tests ---

    def test_predict_rejects_wrong_shape(self, prediction_service):
        wrong = np.zeros((50, 20, 5), dtype=np.float32)  # Should be 100
        valid = np.zeros((100, 20, 5), dtype=np.float32)

        with pytest.raises(ValueError, match="wrong shape"):
            prediction_service.predict(wrong, valid, valid)

    # --- Risk Level Classification Tests ---

    def test_risk_level_low(self, prediction_service):
        prediction_service.model.predict.return_value = np.array([[0.2]])
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert result["risk_level"] == "low"

    def test_risk_level_medium(self, prediction_service):
        prediction_service.model.predict.return_value = np.array([[0.5]])
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert result["risk_level"] == "medium"

    def test_risk_level_high(self, prediction_service):
        prediction_service.model.predict.return_value = np.array([[0.8]])
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences, sequences, sequences)

        assert result["risk_level"] == "high"

    # --- Model State Tests ---

    def test_is_loaded_true_when_model_exists(self, prediction_service):
        assert prediction_service.is_loaded() is True

    def test_is_loaded_false_when_no_model(self):
        from app.services.eye_tracker.prediction import EyeTrackerPredictionService

        service = EyeTrackerPredictionService.__new__(EyeTrackerPredictionService)
        service.model = None

        assert service.is_loaded() is False
