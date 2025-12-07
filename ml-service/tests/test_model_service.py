import os
import sys
import numpy as np
import pytest
from unittest.mock import Mock, patch

from app.config import settings


# Skip entire module when running with real TensorFlow (integration tests)
pytestmark = pytest.mark.skipif(
    os.environ.get("REAL_TF") == "1",
    reason="Unit tests require mocked TensorFlow; use integration tests for real model",
)


class TestModelService:
    """
    Unit tests for ModelService.

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
    def model_service(self, mock_model):
        """ModelService with mocked Keras model."""
        # Configure the module-level keras mock to return our mock model
        sys.modules["keras"].models.load_model.return_value = mock_model

        with patch.object(settings, "SKIP_MODEL_LOADING", False):
            import app.services.model_service as ms

            ms._model_service_instance = None
            return ms.ModelService()

    # --- Prediction Output Tests ---

    def test_predict_returns_probability_confidence_count(self, model_service):
        sequences = np.zeros((100, 20, 5), dtype=np.float32)

        prob, conf, n = model_service.predict(sequences, sequences, sequences)

        assert isinstance(prob, float)
        assert isinstance(conf, float)
        assert isinstance(n, int)
        assert 0 <= prob <= 1
        assert 0 <= conf <= 1
        assert n == 300  # 100 * 3 tasks

    def test_confidence_formula(self):
        """Confidence = |probability - 0.5| * 2"""
        mock_model = Mock()
        mock_model.predict.return_value = np.array([[0.8]])
        sys.modules["keras"].models.load_model.return_value = mock_model

        with patch.object(settings, "SKIP_MODEL_LOADING", False):
            import app.services.model_service as ms

            ms._model_service_instance = None
            service = ms.ModelService()

        sequences = np.zeros((100, 20, 5), dtype=np.float32)
        prob, conf, _ = service.predict(sequences, sequences, sequences)

        expected_conf = abs(0.8 - 0.5) * 2  # 0.6
        assert np.isclose(prob, 0.8)
        assert np.isclose(conf, expected_conf)

    def test_confidence_at_midpoint_is_zero(self):
        """Probability of 0.5 should give confidence of 0."""
        mock_model = Mock()
        mock_model.predict.return_value = np.array([[0.5]])
        sys.modules["keras"].models.load_model.return_value = mock_model

        with patch.object(settings, "SKIP_MODEL_LOADING", False):
            import app.services.model_service as ms

            ms._model_service_instance = None
            service = ms.ModelService()

        sequences = np.zeros((100, 20, 5), dtype=np.float32)
        _, conf, _ = service.predict(sequences, sequences, sequences)

        assert conf == 0.0

    # --- Input Validation Tests ---

    def test_predict_rejects_wrong_shape(self, model_service):
        wrong = np.zeros((50, 20, 5), dtype=np.float32)  # Should be 100
        valid = np.zeros((100, 20, 5), dtype=np.float32)

        with pytest.raises(ValueError, match="wrong shape"):
            model_service.predict(wrong, valid, valid)

    # --- Risk Level Classification Tests ---

    def test_risk_level_low(self, model_service):
        assert model_service.get_risk_level(0.0) == "low"
        assert model_service.get_risk_level(0.2) == "low"
        assert model_service.get_risk_level(0.32) == "low"

    def test_risk_level_medium(self, model_service):
        assert model_service.get_risk_level(0.4) == "medium"
        assert model_service.get_risk_level(0.5) == "medium"
        assert model_service.get_risk_level(0.65) == "medium"

    def test_risk_level_high(self, model_service):
        assert model_service.get_risk_level(0.7) == "high"
        assert model_service.get_risk_level(0.9) == "high"
        assert model_service.get_risk_level(1.0) == "high"

    def test_risk_level_thresholds(self, model_service):
        # LOW_RISK_THRESHOLD = 0.33, HIGH_RISK_THRESHOLD = 0.66
        assert model_service.get_risk_level(0.33) == "medium"  # >= threshold
        assert model_service.get_risk_level(0.66) == "high"  # >= threshold

    # --- Model State Tests ---

    def test_is_loaded_true_when_model_exists(self, model_service):
        assert model_service.is_loaded() is True

    def test_is_loaded_false_when_no_model(self):
        from app.services.model_service import ModelService

        service = ModelService.__new__(ModelService)
        service.model = None

        assert service.is_loaded() is False
