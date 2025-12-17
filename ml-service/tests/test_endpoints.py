import numpy as np
import pytest
from unittest.mock import Mock

from app.schemas import PredictionRequest, GazeSequence
from app.schemas.webcam import WebcamPredictionRequest, RawGazePoint
from tests.conftest import create_gaze_points


class TestPredictEyeTrackerEndpoint:
    """
    Unit tests for the eye tracker prediction endpoint business logic.

    Tests the orchestration of feature processing and model inference
    using mocked services to verify correct data flow.
    """

    @pytest.fixture
    def mock_feature_processor(self):
        processor = Mock()
        processor.process_gaze_points.return_value = np.zeros(
            (100, 20, 5), dtype=np.float32
        )
        return processor

    @pytest.fixture
    def mock_prediction_service(self):
        service = Mock()
        service.predict.return_value = {
            "dyslexia_probability": 0.72,
            "confidence": 0.88,
            "risk_level": "high",
            "sequences_analyzed": 300,
        }
        return service

    @pytest.fixture
    def mock_app_state(self, mock_feature_processor, mock_prediction_service):
        """Mock FastAPI app.state with services."""
        state = Mock()
        state.eye_tracker_features = mock_feature_processor
        state.eye_tracker_prediction = mock_prediction_service
        return state

    @pytest.fixture
    def mock_request(self, mock_app_state):
        """Mock FastAPI Request with app state."""
        request = Mock()
        request.app.state = mock_app_state
        return request

    @pytest.fixture
    def prediction_request_data(self):
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

    @pytest.mark.asyncio
    async def test_response_contains_required_fields(
        self, prediction_request_data, mock_request
    ):
        from app.routers.predict import predict_eye_tracker

        response = await predict_eye_tracker(prediction_request_data, mock_request)

        assert response.dyslexia_probability == 0.72
        assert response.confidence == 0.88
        assert response.risk_level == "high"

    @pytest.mark.asyncio
    async def test_response_metadata(self, prediction_request_data, mock_request):
        from app.routers.predict import predict_eye_tracker

        response = await predict_eye_tracker(prediction_request_data, mock_request)

        assert response.metadata.sequences_analyzed == 300
        assert response.metadata.total_fixations == 150  # 50 * 3 tasks

    # --- Service Interaction Tests ---

    @pytest.mark.asyncio
    async def test_feature_processor_called_for_each_task(
        self, prediction_request_data, mock_request, mock_feature_processor
    ):
        from app.routers.predict import predict_eye_tracker

        await predict_eye_tracker(prediction_request_data, mock_request)

        assert mock_feature_processor.process_gaze_points.call_count == 3

    @pytest.mark.asyncio
    async def test_screen_dimensions_passed_to_feature_processor(
        self, prediction_request_data, mock_request, mock_feature_processor
    ):
        from app.routers.predict import predict_eye_tracker

        await predict_eye_tracker(prediction_request_data, mock_request)

        call_args = mock_feature_processor.process_gaze_points.call_args_list[0]
        assert call_args[0][1] == 1920  # screen_width
        assert call_args[0][2] == 1080  # screen_height

    @pytest.mark.asyncio
    async def test_prediction_service_receives_three_sequence_arrays(
        self, prediction_request_data, mock_request, mock_prediction_service
    ):
        from app.routers.predict import predict_eye_tracker

        await predict_eye_tracker(prediction_request_data, mock_request)

        mock_prediction_service.predict.assert_called_once()
        args = mock_prediction_service.predict.call_args[0]
        assert len(args) == 3

    # --- Error Handling Tests ---

    @pytest.mark.asyncio
    async def test_value_error_returns_400(
        self, prediction_request_data, mock_request, mock_feature_processor
    ):
        from app.routers.predict import predict_eye_tracker
        from fastapi import HTTPException

        mock_feature_processor.process_gaze_points.side_effect = ValueError(
            "Insufficient gaze points"
        )

        with pytest.raises(HTTPException) as exc_info:
            await predict_eye_tracker(prediction_request_data, mock_request)

        assert exc_info.value.status_code == 400
        assert "Insufficient gaze points" in str(exc_info.value.detail)


class TestPredictWebcamEndpoint:
    """
    Unit tests for the webcam prediction endpoint business logic.
    """

    @pytest.fixture
    def mock_feature_processor(self):
        processor = Mock()
        processor.process.return_value = np.zeros((1, 82, 20, 5), dtype=np.float32)
        return processor

    @pytest.fixture
    def mock_prediction_service(self):
        service = Mock()
        service.predict.return_value = {
            "dyslexia_probability": 0.65,
            "risk_level": "medium",
        }
        return service

    @pytest.fixture
    def mock_app_state(self, mock_feature_processor, mock_prediction_service):
        """Mock FastAPI app.state with webcam services."""
        state = Mock()
        state.webcam_features = mock_feature_processor
        state.webcam_prediction = mock_prediction_service
        return state

    @pytest.fixture
    def mock_request(self, mock_app_state):
        """Mock FastAPI Request with app state."""
        request = Mock()
        request.app.state = mock_app_state
        return request

    @pytest.fixture
    def webcam_request_data(self):
        """Create webcam prediction request with raw gaze data."""
        gaze_data = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000000 + i * 16000)
            for i in range(100)
        ]
        return WebcamPredictionRequest(
            gaze_data=gaze_data,
            screen_width=1920,
            screen_height=1080,
        )

    # --- Response Content Tests ---

    @pytest.mark.asyncio
    async def test_response_contains_required_fields(
        self, webcam_request_data, mock_request
    ):
        from app.routers.predict import predict_webcam

        response = await predict_webcam(webcam_request_data, mock_request)

        assert response.dyslexia_probability == 0.65
        assert response.risk_level == "medium"
        assert response.confidence == 1.0  # Webcam uses fixed confidence

    @pytest.mark.asyncio
    async def test_response_metadata(self, webcam_request_data, mock_request):
        from app.routers.predict import predict_webcam

        response = await predict_webcam(webcam_request_data, mock_request)

        assert response.metadata.sequences_analyzed == 82
        assert response.metadata.total_fixations == 100

    # --- Service Interaction Tests ---

    @pytest.mark.asyncio
    async def test_feature_processor_receives_gaze_data(
        self, webcam_request_data, mock_request, mock_feature_processor
    ):
        from app.routers.predict import predict_webcam

        await predict_webcam(webcam_request_data, mock_request)

        mock_feature_processor.process.assert_called_once()
        call_args = mock_feature_processor.process.call_args[0]
        assert len(call_args[0]) == 100  # 100 gaze points
        assert call_args[1] == 1920  # screen_width
        assert call_args[2] == 1080  # screen_height

    @pytest.mark.asyncio
    async def test_prediction_service_receives_sequences(
        self, webcam_request_data, mock_request, mock_prediction_service
    ):
        from app.routers.predict import predict_webcam

        await predict_webcam(webcam_request_data, mock_request)

        mock_prediction_service.predict.assert_called_once()

    # --- Error Handling Tests ---

    @pytest.mark.asyncio
    async def test_value_error_returns_400(
        self, webcam_request_data, mock_request, mock_feature_processor
    ):
        from app.routers.predict import predict_webcam
        from fastapi import HTTPException

        mock_feature_processor.process.side_effect = ValueError(
            "Insufficient fixations detected"
        )

        with pytest.raises(HTTPException) as exc_info:
            await predict_webcam(webcam_request_data, mock_request)

        assert exc_info.value.status_code == 400
        assert "Insufficient fixations detected" in str(exc_info.value.detail)
