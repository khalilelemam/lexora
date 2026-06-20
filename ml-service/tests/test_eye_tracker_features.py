import numpy as np
import pytest
from unittest.mock import Mock, patch, mock_open

from app.schemas import GazePoint
from tests.conftest import create_gaze_points


class TestEyeTrackerFeatureProcessor:
    """
    Unit tests for EyeTrackerFeatureProcessor.

    These tests mock the scaler to isolate the feature engineering logic.
    Integration tests in tests/integration/ use the real scaler.
    """

    @pytest.fixture
    def mock_scaler(self):
        """Mock scaler that returns input unchanged."""
        scaler = Mock()
        scaler.transform = Mock(side_effect=lambda x: x)
        return scaler

    @pytest.fixture
    def feature_processor(self, mock_scaler):
        with patch("app.services.eye_tracker.features.open", mock_open()):
            with patch("pickle.load", return_value=mock_scaler):
                from app.services.eye_tracker.features import EyeTrackerFeatureProcessor

                return EyeTrackerFeatureProcessor()

    # --- Output Shape Tests ---

    def test_output_shape(self, feature_processor):
        np.random.seed(42)
        gaze_points = create_gaze_points(100, reading_pattern=False)

        result = feature_processor.process_gaze_points(gaze_points, 1920, 1080)

        assert result.sequences.shape == (100, 20, 5)
        assert result.sequences.dtype == np.float32
        assert result.total_gaze_points == 100
        assert result.valid_fixations > 0
        assert len(result.features_data) == result.valid_fixations

    def test_output_padded_when_few_sequences(self, feature_processor):
        np.random.seed(42)
        gaze_points = create_gaze_points(30, reading_pattern=False)

        result = feature_processor.process_gaze_points(gaze_points, 1920, 1080)

        # Even with few input points, output is padded to (100, 20, 5)
        assert result.sequences.shape == (100, 20, 5)

    # --- Input Validation Tests ---

    def test_raises_on_insufficient_points(self, feature_processor):
        gaze_points = create_gaze_points(15, reading_pattern=False)

        with pytest.raises(ValueError, match="Insufficient gaze points"):
            feature_processor.process_gaze_points(gaze_points, 1920, 1080)

    def test_raises_when_all_fixations_filtered(self, feature_processor):
        # Very short intervals (10ms) get filtered out (min is 80ms)
        points = [
            GazePoint(fixation_x=0.5, fixation_y=0.5, timestamp=1000000 + i * 10000)
            for i in range(50)
        ]

        with pytest.raises(ValueError, match="valid fixations remain"):
            feature_processor.process_gaze_points(points, 1920, 1080)

    # --- Saccade Amplitude Calculation ---

    def test_saccade_amplitudes_horizontal(self, feature_processor):
        x = np.array([0.0, 0.1, 0.2])
        y = np.array([0.0, 0.0, 0.0])

        amplitudes = feature_processor._calculate_saccade_amplitudes(x, y, 1000, 1000)

        assert amplitudes[0] == 0  # First has no previous
        assert np.isclose(amplitudes[1], 100.0)  # 0.1 * 1000px
        assert np.isclose(amplitudes[2], 100.0)

    def test_saccade_amplitudes_diagonal(self, feature_processor):
        x = np.array([0.0, 0.1])
        y = np.array([0.0, 0.1])

        amplitudes = feature_processor._calculate_saccade_amplitudes(x, y, 1000, 1000)

        expected = np.sqrt(100**2 + 100**2)  # ~141.4
        assert np.isclose(amplitudes[1], expected)

    # --- Saccade Velocity Calculation ---

    def test_saccade_velocities(self, feature_processor):
        amplitudes = np.array([0.0, 100.0, 200.0])
        durations = np.array([150.0, 150.0, 100.0])

        velocities = feature_processor._calculate_saccade_velocities(
            amplitudes, durations
        )

        assert velocities[0] == 0.0
        assert np.isclose(velocities[1], 100.0 / 150.0)
        assert np.isclose(velocities[2], 200.0 / 100.0)

    def test_saccade_velocities_zero_duration(self, feature_processor):
        amplitudes = np.array([0.0, 100.0])
        durations = np.array([0.0, 0.0])

        velocities = feature_processor._calculate_saccade_velocities(
            amplitudes, durations
        )

        assert np.all(velocities == 0)  # No division by zero

    # --- Sequence Creation ---

    def test_create_sequences_sliding_window(self, feature_processor):
        features = np.random.randn(30, 5)

        sequences = feature_processor._create_sequences(features)

        # (30-20)/5 + 1 = 3 sequences
        assert sequences.shape == (3, 20, 5)

    def test_create_sequences_preserves_data(self, feature_processor):
        features = np.arange(100).reshape(20, 5).astype(float)

        sequences = feature_processor._create_sequences(features)

        np.testing.assert_array_equal(sequences[0], features[:20])

    # --- Padding ---

    def test_pad_sequences_pads_short_input(self, feature_processor):
        sequences = np.ones((10, 20, 5), dtype=np.float32)

        padded = feature_processor._pad_sequences(sequences)

        assert padded.shape == (100, 20, 5)
        np.testing.assert_array_equal(padded[:10], sequences)
        np.testing.assert_array_equal(padded[10:], 0)

    def test_pad_sequences_truncates_long_input(self, feature_processor):
        sequences = np.random.randn(150, 20, 5).astype(np.float32)

        padded = feature_processor._pad_sequences(sequences)

        assert padded.shape == (100, 20, 5)
        np.testing.assert_array_equal(padded, sequences[:100])

    # --- Screen Size ---

    def test_screen_size_affects_amplitudes(self, feature_processor):
        np.random.seed(42)
        gaze_points = create_gaze_points(100, reading_pattern=False)

        result_small = feature_processor.process_gaze_points(gaze_points, 800, 600)
        result_large = feature_processor.process_gaze_points(gaze_points, 2560, 1440)

        assert not np.array_equal(result_small.sequences, result_large.sequences)
