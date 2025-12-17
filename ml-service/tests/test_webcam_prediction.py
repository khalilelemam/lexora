import os
import numpy as np
import pytest
from unittest.mock import Mock

from app.config import settings


# Skip entire module when running with real TensorFlow (integration tests)
pytestmark = pytest.mark.skipif(
    os.environ.get("REAL_TF") == "1",
    reason="Unit tests require mocked TensorFlow; use integration tests for real model",
)


class TestWebcamPredictionService:
    """
    Unit tests for WebcamPredictionService.

    These tests mock the TensorFlow model and scaler to test prediction logic
    without requiring TensorFlow. Integration tests verify actual model inference.
    """

    @pytest.fixture
    def mock_model(self):
        model = Mock()
        model.predict = Mock(return_value=np.array([[0.72]]))
        return model

    @pytest.fixture
    def mock_scaler(self):
        scaler = Mock()
        scaler.transform = Mock(side_effect=lambda x: x)  # Identity transform
        return scaler

    @pytest.fixture
    def prediction_service(self, mock_model, mock_scaler):
        """WebcamPredictionService with mocked model and scaler."""
        from app.services.webcam.prediction import WebcamPredictionService

        # Manually create service bypassing __init__
        service = WebcamPredictionService.__new__(WebcamPredictionService)
        service.model = mock_model
        service.scaler = mock_scaler
        return service

    # --- Prediction Output Tests ---

    def test_predict_returns_dict_with_required_keys(self, prediction_service):
        sequences = np.zeros((1, 82, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences)

        assert "dyslexia_probability" in result
        assert "risk_level" in result

    def test_predict_returns_valid_probability(self, prediction_service):
        sequences = np.zeros((1, 82, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences)

        assert isinstance(result["dyslexia_probability"], float)
        assert 0 <= result["dyslexia_probability"] <= 1

    def test_predict_calls_model_with_scaled_data(
        self, prediction_service, mock_model, mock_scaler
    ):
        sequences = np.random.randn(1, 82, 20, 5).astype(np.float32)

        prediction_service.predict(sequences)

        # Scaler should be called
        mock_scaler.transform.assert_called_once()
        # Model should be called with batch
        mock_model.predict.assert_called_once()

    # --- Risk Level Classification Tests ---

    def test_risk_level_low(self, prediction_service):
        prediction_service.model.predict.return_value = np.array([[0.2]])
        sequences = np.zeros((1, 82, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences)

        assert result["risk_level"] == "low"

    def test_risk_level_medium(self, prediction_service):
        prediction_service.model.predict.return_value = np.array([[0.5]])
        sequences = np.zeros((1, 82, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences)

        assert result["risk_level"] == "medium"

    def test_risk_level_high(self, prediction_service):
        prediction_service.model.predict.return_value = np.array([[0.8]])
        sequences = np.zeros((1, 82, 20, 5), dtype=np.float32)

        result = prediction_service.predict(sequences)

        assert result["risk_level"] == "high"

    def test_risk_level_thresholds(self, prediction_service):
        """Test exact threshold boundaries."""
        sequences = np.zeros((1, 82, 20, 5), dtype=np.float32)

        # At LOW_RISK_THRESHOLD (0.33) -> medium
        prediction_service.model.predict.return_value = np.array(
            [[settings.LOW_RISK_THRESHOLD]]
        )
        result = prediction_service.predict(sequences)
        assert result["risk_level"] == "medium"

        # At HIGH_RISK_THRESHOLD (0.66) -> high
        prediction_service.model.predict.return_value = np.array(
            [[settings.HIGH_RISK_THRESHOLD]]
        )
        result = prediction_service.predict(sequences)
        assert result["risk_level"] == "high"

    # --- Model State Tests ---

    def test_is_loaded_true_when_model_and_scaler_exist(self, prediction_service):
        assert prediction_service.is_loaded() is True

    def test_is_loaded_false_when_no_model(self, mock_scaler):
        from app.services.webcam.prediction import WebcamPredictionService

        service = WebcamPredictionService.__new__(WebcamPredictionService)
        service.model = None
        service.scaler = mock_scaler

        assert service.is_loaded() is False

    def test_is_loaded_false_when_no_scaler(self, mock_model):
        from app.services.webcam.prediction import WebcamPredictionService

        service = WebcamPredictionService.__new__(WebcamPredictionService)
        service.model = mock_model
        service.scaler = None

        assert service.is_loaded() is False
