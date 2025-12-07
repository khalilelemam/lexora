import numpy as np
import pytest
from unittest.mock import Mock

from app.config import settings
from app.routers.predict import predict_dyslexia_risk
from app.schemas import PredictionRequest, GazeSequence
from tests.conftest import create_gaze_points


class TestPredictDyslexiaRisk:
    """
    Unit tests for the prediction endpoint business logic.

    Tests the orchestration of feature engineering and model inference
    using mocked services to verify correct data flow.
    """

    @pytest.fixture
    def mock_feature_engineer(self):
        engineer = Mock()
        engineer.process_gaze_points.return_value = np.zeros(
            (100, 20, 5), dtype=np.float32
        )
        return engineer

    @pytest.fixture
    def mock_model_service(self):
        service = Mock()
        service.predict.return_value = (0.72, 0.88, 300)
        service.get_risk_level.return_value = "high"
        return service

    @pytest.fixture
    def request_data(self):
        np.random.seed(42)
        gaze_points = create_gaze_points(50, reading_pattern=True)
        sequence = GazeSequence(gaze_points=gaze_points)
        return PredictionRequest(
            syllables_task=sequence,
            meaningful_task=sequence,
            pseudo_task=sequence,
            screen_width=1920,
            screen_height=1080,
        )

    # --- Response Content Tests ---

    def test_response_contains_probability_and_risk(
        self, request_data, mock_feature_engineer, mock_model_service
    ):
        response = predict_dyslexia_risk(
            request=request_data,
            feature_engineer=mock_feature_engineer,
            model_service=mock_model_service,
        )

        assert response.dyslexia_probability == 0.72
        assert response.confidence == 0.88
        assert response.risk_level == "high"

    def test_response_metadata(
        self, request_data, mock_feature_engineer, mock_model_service
    ):
        response = predict_dyslexia_risk(
            request=request_data,
            feature_engineer=mock_feature_engineer,
            model_service=mock_model_service,
        )

        assert response.metadata.model_version == settings.APP_VERSION
        assert response.metadata.sequences_analyzed == 300
        assert response.metadata.total_fixations == 150  # 50 * 3 tasks

    # --- Service Interaction Tests ---

    def test_feature_engineer_called_for_each_task(
        self, request_data, mock_feature_engineer, mock_model_service
    ):
        predict_dyslexia_risk(
            request=request_data,
            feature_engineer=mock_feature_engineer,
            model_service=mock_model_service,
        )

        assert mock_feature_engineer.process_gaze_points.call_count == 3

    def test_screen_dimensions_passed_to_feature_engineer(
        self, request_data, mock_feature_engineer, mock_model_service
    ):
        predict_dyslexia_risk(
            request=request_data,
            feature_engineer=mock_feature_engineer,
            model_service=mock_model_service,
        )

        call_args = mock_feature_engineer.process_gaze_points.call_args_list[0]
        assert call_args[0][1] == 1920
        assert call_args[0][2] == 1080

    def test_model_receives_three_sequence_arrays(
        self, request_data, mock_feature_engineer, mock_model_service
    ):
        predict_dyslexia_risk(
            request=request_data,
            feature_engineer=mock_feature_engineer,
            model_service=mock_model_service,
        )

        mock_model_service.predict.assert_called_once()
        args = mock_model_service.predict.call_args[0]
        assert len(args) == 3

    def test_risk_level_from_model_service(
        self, request_data, mock_feature_engineer, mock_model_service
    ):
        mock_model_service.predict.return_value = (0.45, 0.80, 300)
        mock_model_service.get_risk_level.return_value = "medium"

        response = predict_dyslexia_risk(
            request=request_data,
            feature_engineer=mock_feature_engineer,
            model_service=mock_model_service,
        )

        mock_model_service.get_risk_level.assert_called_once_with(0.45)
        assert response.risk_level == "medium"

    # --- Error Propagation Tests ---

    def test_feature_engineer_error_propagates(
        self, request_data, mock_feature_engineer, mock_model_service
    ):
        mock_feature_engineer.process_gaze_points.side_effect = ValueError(
            "Insufficient gaze points"
        )

        with pytest.raises(ValueError, match="Insufficient gaze points"):
            predict_dyslexia_risk(
                request=request_data,
                feature_engineer=mock_feature_engineer,
                model_service=mock_model_service,
            )
