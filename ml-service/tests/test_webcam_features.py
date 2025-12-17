import numpy as np
import pytest

from app.schemas.webcam import RawGazePoint
from app.services.webcam.features import WebcamFeatureProcessor
from tests.conftest import create_raw_gaze_points


class TestWebcamFeatureProcessor:
    """
    Unit tests for WebcamFeatureProcessor.

    Tests the I-VT (Identification by Velocity Threshold) fixation detection
    algorithm and feature extraction for webcam-based gaze data.
    """

    @pytest.fixture
    def processor(self):
        return WebcamFeatureProcessor()

    # --- Output Shape Tests ---

    def test_process_returns_correct_shape(self, processor):
        np.random.seed(42)
        # Need ~2000 points to generate ~500 fixations for 82 sequences
        # (window_size=20, step=5, so need 20 + 81*5 = 425 fixations)
        raw_points = create_raw_gaze_points(2000)

        result = processor.process(raw_points, 1920, 1080)

        assert result.shape == (1, 82, 20, 5)
        assert result.dtype == np.float64 or result.dtype == np.float32

    def test_output_is_padded_to_82_sequences(self, processor):
        np.random.seed(42)
        # Use same count as test_process_returns_correct_shape
        # Output should be padded/truncated to exactly 82 sequences
        raw_points = create_raw_gaze_points(2000)

        result = processor.process(raw_points, 1920, 1080)

        # Should always output exactly 82 sequences
        assert result.shape[1] == 82

    # --- Coordinate Normalization ---

    def test_normalize_coordinates(self, processor):
        points = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000),
            RawGazePoint(x=1920.0, y=1080.0, timestamp=2000),
            RawGazePoint(x=0.0, y=0.0, timestamp=3000),
        ]

        normalized = processor.normalize_coordinates(points, 1920, 1080)

        assert len(normalized) == 3
        assert normalized[0][:2] == (0.5, 0.5)  # Center
        assert normalized[1][:2] == (1.0, 1.0)  # Max
        assert normalized[2][:2] == (0.0, 0.0)  # Min

    def test_normalize_filters_out_of_bounds(self, processor):
        points = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000),
            RawGazePoint(x=2000.0, y=540.0, timestamp=2000),  # Out of bounds
            RawGazePoint(x=-100.0, y=540.0, timestamp=3000),  # Out of bounds
        ]

        normalized = processor.normalize_coordinates(points, 1920, 1080)

        # Out-of-bounds points are filtered
        assert len(normalized) == 1

    # --- Signal Smoothing ---

    def test_smooth_signal_applies_ema(self, processor):
        points = [
            (0.5, 0.5, 1000),
            (0.6, 0.5, 2000),
            (0.7, 0.5, 3000),
        ]

        smoothed = processor.smooth_signal(points)

        # First point unchanged
        assert smoothed[0] == points[0]
        # Subsequent points are smoothed (not equal to original)
        assert smoothed[1][0] != points[1][0]
        assert smoothed[2][0] != points[2][0]

    def test_smooth_signal_empty_input(self, processor):
        result = processor.smooth_signal([])
        assert result == []

    # --- Fixation Detection ---

    def test_detect_fixations_groups_slow_points(self, processor):
        # Create stationary points (should form one fixation)
        # Using microsecond timestamps, 100ms = 100000 microseconds
        points = [
            (0.5, 0.5, i * 100_000) for i in range(10)  # 100ms intervals, same location
        ]

        fixations = processor.detect_fixations(points)

        # All points should form one fixation
        assert len(fixations) >= 1

    def test_detect_fixations_filters_short_fixations(self, processor):
        # Create very short fixations (< 50ms = 50000 microseconds)
        points = [
            (0.5, 0.5, 0),
            (0.5, 0.5, 10_000),  # Only 10ms
            (0.9, 0.9, 20_000),  # Jump (saccade)
        ]

        fixations = processor.detect_fixations(points)

        # Short fixation should be filtered
        assert len(fixations) == 0

    def test_detect_fixations_empty_input(self, processor):
        result = processor.detect_fixations([])
        assert result == []

    def test_detect_fixations_single_point(self, processor):
        result = processor.detect_fixations([(0.5, 0.5, 1000000)])
        assert result == []

    # --- Feature Extraction ---

    def test_extract_features_returns_5_features(self, processor):
        # Timestamps in microseconds
        fixations = [
            np.array([[0.3, 0.4, 100_000], [0.3, 0.4, 200_000], [0.3, 0.4, 300_000]]),
            np.array([[0.5, 0.5, 400_000], [0.5, 0.5, 500_000], [0.5, 0.5, 600_000]]),
        ]

        features = processor.extract_features(fixations)

        assert features.shape == (2, 5)

    def test_extract_features_duration(self, processor):
        # 250ms = 250000 microseconds
        fixations = [
            np.array([[0.5, 0.5, 0], [0.5, 0.5, 100_000], [0.5, 0.5, 250_000]]),
        ]

        features = processor.extract_features(fixations)

        assert features[0, 0] == 250  # Duration in ms

    def test_extract_features_centroid(self, processor):
        fixations = [
            np.array([[0.4, 0.3, 0], [0.5, 0.4, 100_000], [0.6, 0.5, 200_000]]),
        ]

        features = processor.extract_features(fixations)

        # Centroid should be mean of coordinates
        assert np.isclose(features[0, 1], 0.5)  # centroid_x = mean(0.4, 0.5, 0.6)
        assert np.isclose(features[0, 2], 0.4)  # centroid_y = mean(0.3, 0.4, 0.5)

    def test_extract_features_regression_flag(self, processor):
        fixations = [
            np.array([[0.5, 0.5, 0], [0.5, 0.5, 100_000]]),
            np.array(
                [[0.3, 0.5, 200_000], [0.3, 0.5, 300_000]]
            ),  # Moved left = regression
        ]

        features = processor.extract_features(fixations)

        assert features[0, 4] == 0  # First has no previous
        assert features[1, 4] == 1  # Moved left = regression

    def test_extract_features_empty_input(self, processor):
        features = processor.extract_features([])
        assert features.shape == (0, 5)

    # --- Sequence Creation ---

    def test_create_sequences_sliding_window(self, processor):
        features = np.random.randn(30, 5)

        sequences = processor.create_sequences(features)

        # (30-20)/5 + 1 = 3 sequences (using config: window_size=20, step=5)
        assert sequences.shape == (3, 20, 5)

    def test_create_sequences_insufficient_data(self, processor):
        features = np.random.randn(15, 5)  # Less than window_size

        sequences = processor.create_sequences(features)

        assert sequences.shape == (0, 20, 5)

    # --- Padding ---

    def test_pad_sequences_pads_short_input(self, processor):
        sequences = np.ones((10, 20, 5))

        padded = processor.pad_sequences(sequences)

        assert padded.shape == (82, 20, 5)
        np.testing.assert_array_equal(padded[:10], sequences)
        np.testing.assert_array_equal(padded[10:], 0)

    def test_pad_sequences_truncates_long_input(self, processor):
        sequences = np.random.randn(100, 20, 5)

        padded = processor.pad_sequences(sequences)

        assert padded.shape == (82, 20, 5)
        np.testing.assert_array_equal(padded, sequences[:82])

    # --- Error Handling ---

    def test_raises_on_no_valid_fixations(self, processor):
        # Single point at same location - no saccades but forms fixation
        # Use points that are all saccades (moving too fast)
        points = [
            RawGazePoint(
                x=float(i * 200), y=float(i * 200), timestamp=1000000 + i * 5000
            )
            for i in range(50)  # Very fast movement between distant points
        ]

        with pytest.raises(ValueError, match="(No valid fixations|Insufficient data)"):
            processor.process(points, 1920, 1080)

    def test_raises_on_insufficient_sequences(self, processor):
        # Too few points to generate enough sequences
        points = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000000 + i * 100000)
            for i in range(30)
        ]

        with pytest.raises(ValueError, match="Insufficient data"):
            processor.process(points, 1920, 1080)
