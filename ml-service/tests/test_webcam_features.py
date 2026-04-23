import numpy as np
import pytest

from app.schemas.webcam import RawGazePoint
from app.services.webcam.features import WebcamFeatureProcessor


class TestWebcamFeatureProcessor:
    """
    Unit tests for WebcamFeatureProcessor.

    Tests the I-DT (Identification by Dispersion Threshold) fixation detection
    algorithm and feature extraction for webcam-based gaze data.
    """

    @pytest.fixture
    def processor(self):
        return WebcamFeatureProcessor()

    # --- Output Shape Tests ---

    def test_process_returns_correct_shape(self, processor):
        np.random.seed(42)

        # The One Euro filter requires enough stable points for the signal to
        # settle after saccades; otherwise I-DT will discard transient segments.
        # This generator creates longer fixations + explicit saccade trajectories,
        # and enough total points to produce >= WEBCAM_MIN_SEQUENCES sequences.
        def make_points(count: int = 5000):
            points = []
            t = 1000
            x_progress = 0.15
            line_y_positions = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75]
            current_line = 0
            i = 0

            while i < count:
                fixation_x = x_progress * 1920
                fixation_y = (
                    line_y_positions[current_line % len(line_y_positions)] * 1080
                )

                fixation_points = int(np.random.randint(25, 36))
                for _ in range(min(fixation_points, count - i)):
                    points.append(
                        RawGazePoint(
                            x=float(fixation_x + np.random.uniform(-2, 2)),
                            y=float(fixation_y + np.random.uniform(-2, 2)),
                            timestamp=t,
                        )
                    )
                    t += 16
                    i += 1

                prev_x, prev_y = fixation_x, fixation_y

                x_progress += float(np.random.uniform(0.10, 0.20))
                if x_progress > 0.85:
                    x_progress = 0.15
                    current_line += 1

                next_x = x_progress * 1920
                next_y = line_y_positions[current_line % len(line_y_positions)] * 1080

                saccade_points = int(np.random.randint(5, 10))
                for j in range(1, saccade_points + 1):
                    if i >= count:
                        break
                    frac = j / (saccade_points + 1)
                    sx = (1 - frac) * prev_x + frac * next_x
                    sy = (1 - frac) * prev_y + frac * next_y
                    points.append(RawGazePoint(x=float(sx), y=float(sy), timestamp=t))
                    t += 16
                    i += 1

            return points

        raw_points = make_points()

        result = processor.process(raw_points, 1920, 1080)

        assert result.sequences.shape == (1, 82, 20, 5)
        assert (
            result.sequences.dtype == np.float64 or result.sequences.dtype == np.float32
        )
        assert result.total_fixations > 0
        assert result.mean_fixation_duration_ms > 0
        assert len(result.features_data) == result.total_fixations

    def test_output_is_padded_to_82_sequences(self, processor):
        np.random.seed(42)

        def make_points(count: int = 5000):
            points = []
            t = 1000
            x_progress = 0.15
            line_y_positions = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75]
            current_line = 0
            i = 0

            while i < count:
                fixation_x = x_progress * 1920
                fixation_y = (
                    line_y_positions[current_line % len(line_y_positions)] * 1080
                )

                fixation_points = int(np.random.randint(25, 36))
                for _ in range(min(fixation_points, count - i)):
                    points.append(
                        RawGazePoint(
                            x=float(fixation_x + np.random.uniform(-2, 2)),
                            y=float(fixation_y + np.random.uniform(-2, 2)),
                            timestamp=t,
                        )
                    )
                    t += 16
                    i += 1

                prev_x, prev_y = fixation_x, fixation_y

                x_progress += float(np.random.uniform(0.10, 0.20))
                if x_progress > 0.85:
                    x_progress = 0.15
                    current_line += 1

                next_x = x_progress * 1920
                next_y = line_y_positions[current_line % len(line_y_positions)] * 1080

                saccade_points = int(np.random.randint(5, 10))
                for j in range(1, saccade_points + 1):
                    if i >= count:
                        break
                    frac = j / (saccade_points + 1)
                    sx = (1 - frac) * prev_x + frac * next_x
                    sy = (1 - frac) * prev_y + frac * next_y
                    points.append(RawGazePoint(x=float(sx), y=float(sy), timestamp=t))
                    t += 16
                    i += 1

            return points

        raw_points = make_points()

        result = processor.process(raw_points, 1920, 1080)

        # Should always output exactly 82 sequences
        assert result.sequences.shape[1] == 82

    # --- Coordinate Normalization ---

    def test_normalize_coordinates(self, processor):
        points = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000),
            RawGazePoint(x=1920.0, y=1080.0, timestamp=2000),
            RawGazePoint(x=0.0, y=0.0, timestamp=3000),
        ]

        normalized, out_of_bounds = processor.normalize_coordinates(points, 1920, 1080)

        assert len(normalized) == 3
        assert out_of_bounds == 0
        assert normalized[0][:2] == (0.5, 0.5)  # Center
        assert normalized[1][:2] == (1.0, 1.0)  # Max
        assert normalized[2][:2] == (0.0, 0.0)  # Min

    def test_normalize_filters_out_of_bounds(self, processor):
        points = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000),
            RawGazePoint(x=2000.0, y=540.0, timestamp=2000),  # Out of bounds
            RawGazePoint(x=-100.0, y=540.0, timestamp=3000),  # Out of bounds
        ]

        normalized, out_of_bounds = processor.normalize_coordinates(points, 1920, 1080)

        # Out-of-bounds points are filtered
        assert len(normalized) == 1
        assert out_of_bounds == 2

    # --- Signal Smoothing ---

    def test_smooth_signal_smooths_coordinates(self, processor):
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
        # Using millisecond timestamps, 100ms intervals
        points = [
            (0.5, 0.5, i * 100)
            for i in range(10)  # 100ms intervals, same location
        ]

        fixations, invalid = processor.detect_fixations(points)

        # All points should form one fixation
        assert len(fixations) >= 1
        assert sum(len(f) for f in fixations) <= len(points)
        assert invalid >= 0

    def test_detect_fixations_filters_short_fixations(self, processor):
        # Create very short fixations (< 50ms)
        points = [
            (0.5, 0.5, 0),
            (0.5, 0.5, 10),  # Only 10ms
            (0.9, 0.9, 20),  # Jump (saccade)
        ]

        fixations, invalid = processor.detect_fixations(points)

        # Short fixation should be filtered
        assert len(fixations) == 0
        assert invalid >= 0

    def test_detect_fixations_empty_input(self, processor):
        fixations, invalid = processor.detect_fixations([])
        assert fixations == []
        assert invalid == 0

    def test_detect_fixations_single_point(self, processor):
        fixations, invalid = processor.detect_fixations([(0.5, 0.5, 1000000)])
        assert fixations == []
        assert invalid == 0

    # --- Feature Extraction ---

    def test_extract_features_returns_6_features(self, processor):
        # Timestamps in milliseconds
        fixations = [
            np.array([[0.3, 0.4, 100], [0.3, 0.4, 200], [0.3, 0.4, 300]]),
            np.array([[0.5, 0.5, 400], [0.5, 0.5, 500], [0.5, 0.5, 600]]),
        ]

        features = processor.extract_features(fixations)

        assert features.shape == (2, 6)

    def test_extract_features_duration(self, processor):
        # 250ms fixation
        fixations = [
            np.array([[0.5, 0.5, 0], [0.5, 0.5, 100], [0.5, 0.5, 250]]),
        ]

        features = processor.extract_features(fixations)

        assert features[0, 0] == 250  # Duration in ms

    def test_extract_features_centroid(self, processor):
        fixations = [
            np.array([[0.4, 0.3, 0], [0.5, 0.4, 100], [0.6, 0.5, 200]]),
        ]

        features = processor.extract_features(fixations)

        # Centroid should be mean of coordinates
        assert np.isclose(features[0, 1], 0.5)  # centroid_x = mean(0.4, 0.5, 0.6)
        assert np.isclose(features[0, 2], 0.4)  # centroid_y = mean(0.3, 0.4, 0.5)

    def test_extract_features_regression_flag(self, processor):
        fixations = [
            np.array([[0.5, 0.5, 0], [0.5, 0.5, 100]]),
            np.array([[0.3, 0.5, 200], [0.3, 0.5, 300]]),  # Moved left = regression
        ]

        features = processor.extract_features(fixations)

        assert features[0, 4] == 0  # First has no previous
        assert features[1, 4] == 1  # Moved left = regression

    def test_extract_features_line_aware_regression_same_line(self, processor):
        fixations = [
            np.array([[0.80, 0.29, 0], [0.80, 0.31, 100]]),
            np.array([[0.60, 0.30, 200], [0.60, 0.32, 300]]),
        ]

        features = processor.extract_features(
            fixations, normalized_line_centers=[0.3, 0.6]
        )

        assert features.shape == (2, 6)
        assert features[1, 4] == 1  # Moved left on same snapped line
        assert features[1, 5] == 0  # Not a line transition

    def test_extract_features_line_aware_return_sweep(self, processor):
        fixations = [
            np.array([[0.85, 0.29, 0], [0.85, 0.31, 100]]),
            np.array([[0.15, 0.59, 200], [0.15, 0.61, 300]]),
        ]

        features = processor.extract_features(
            fixations, normalized_line_centers=[0.3, 0.6]
        )

        assert features.shape == (2, 6)
        assert features[1, 4] == 0  # Cross-line movement is not same-line regression
        assert features[1, 5] == 1  # Moved from line 0 to line 1

    def test_extract_features_empty_input(self, processor):
        features = processor.extract_features([])
        assert features.shape == (0, 6)

    # --- Sequence Creation ---

    def test_create_sequences_sliding_window(self, processor):
        features = np.random.randn(30, 6)

        sequences = processor.create_sequences(features)

        # (30-20)/5 + 1 = 3 sequences (using config: window_size=20, step=5)
        # Sequence creator filters to 5 variables for the model
        assert sequences.shape == (3, 20, 5)

    def test_create_sequences_insufficient_data(self, processor):
        features = np.random.randn(15, 6)  # Less than window_size

        sequences = processor.create_sequences(features)

        assert sequences.shape == (0, 20, 5)

    def test_create_sequences_uses_first_five_features(self, processor):
        features = np.zeros((20, 6), dtype=np.float32)
        features[:, 0] = np.arange(20)  # duration
        features[:, 5] = 1.0  # return_sweep channel should be excluded

        sequences = processor.create_sequences(features)

        assert sequences.shape == (1, 20, 5)
        np.testing.assert_array_equal(sequences[0, :, 0], np.arange(20))

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
            RawGazePoint(x=float(i * 200), y=float(i * 200), timestamp=1000 + i * 5)
            for i in range(50)  # Very fast movement between distant points
        ]

        with pytest.raises(ValueError, match="(No valid fixations|Insufficient data)"):
            processor.process(points, 1920, 1080)

    def test_raises_on_insufficient_sequences(self, processor):
        # Too few points to generate enough sequences
        points = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000 + i * 100) for i in range(30)
        ]

        with pytest.raises(ValueError, match="(No valid fixations|Insufficient data)"):
            processor.process(points, 1920, 1080)
