import pytest


@pytest.fixture(scope="module")
def real_eye_tracker_prediction():
    """Real EyeTrackerPredictionService with actual Keras model loaded."""
    from app.services.eye_tracker.prediction import EyeTrackerPredictionService

    try:
        service = EyeTrackerPredictionService()
        yield service
    except Exception as e:
        pytest.skip(f"Could not load eye tracker model: {e}")


@pytest.fixture(scope="module")
def real_eye_tracker_features():
    """Real EyeTrackerFeatureProcessor with actual scaler loaded."""
    from app.services.eye_tracker.features import EyeTrackerFeatureProcessor

    try:
        processor = EyeTrackerFeatureProcessor()
        yield processor
    except Exception as e:
        pytest.skip(f"Could not load eye tracker feature processor: {e}")


@pytest.fixture(scope="module")
def real_webcam_prediction():
    """Real WebcamPredictionService with actual model loaded."""
    from app.services.webcam.prediction import WebcamPredictionService

    try:
        service = WebcamPredictionService()
        yield service
    except Exception as e:
        pytest.skip(f"Could not load webcam model: {e}")


@pytest.fixture(scope="module")
def real_webcam_features():
    """Real WebcamFeatureProcessor."""
    from app.services.webcam.features import WebcamFeatureProcessor

    try:
        processor = WebcamFeatureProcessor()
        yield processor
    except Exception as e:
        pytest.skip(f"Could not create webcam feature processor: {e}")
