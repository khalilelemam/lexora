import numpy as np
from typing import List, Tuple
from app.config import settings
from app.schemas.webcam import RawGazePoint


class WebcamFeatureProcessor:
    """
    Converts raw webcam gaze points into model-ready sequences.

    Algorithm: I-VT (Identification by Velocity Threshold)
    - Points with velocity below threshold are grouped into fixations
    - Fixations shorter than minimum duration are filtered as noise

    Output shape: (1, 82, 20, 5) = (batch, sequences, timesteps, features)
    Features: [duration_ms, centroid_x, centroid_y, amplitude, regression_flag]
    """

    def __init__(self):
        self.velocity_threshold = settings.WEBCAM_VELOCITY_THRESHOLD
        self.min_fixation_duration_ms = settings.WEBCAM_MIN_FIXATION_MS
        self.ema_alpha = settings.WEBCAM_EMA_ALPHA

    def normalize_coordinates(
        self, points: List[RawGazePoint], screen_width: int, screen_height: int
    ) -> List[Tuple[float, float, int]]:
        normalized = []
        for p in points:
            x_norm = p.x / screen_width
            y_norm = p.y / screen_height

            if 0 <= x_norm <= 1 and 0 <= y_norm <= 1:
                normalized.append((x_norm, y_norm, p.timestamp))

        return normalized

    def smooth_signal(
        self, points: List[Tuple[float, float, int]]
    ) -> List[Tuple[float, float, int]]:
        if not points:
            return []

        smoothed = [points[0]]
        for i in range(1, len(points)):
            prev_x, prev_y, _ = smoothed[-1]
            curr_x, curr_y, curr_t = points[i]

            smooth_x = self.ema_alpha * curr_x + (1 - self.ema_alpha) * prev_x
            smooth_y = self.ema_alpha * curr_y + (1 - self.ema_alpha) * prev_y

            smoothed.append((smooth_x, smooth_y, curr_t))

        return smoothed

    def detect_fixations(
        self, points: List[Tuple[float, float, int]]
    ) -> List[np.ndarray]:
        """
        I-VT fixation detection: groups points with velocity < threshold into fixations.
        Filters out fixations shorter than minimum duration (noise).

        Velocity is in normalized units per second.
        """
        if len(points) < 2:
            return []

        fixations = []
        current_fixation = [points[0]]

        for i in range(1, len(points)):
            x1, y1, t1 = points[i - 1]
            x2, y2, t2 = points[i]

            # Convert microseconds to seconds for velocity calculation
            dt_seconds = (t2 - t1) / 1_000_000.0
            if dt_seconds == 0:
                current_fixation.append(points[i])
                continue

            dx = x2 - x1
            dy = y2 - y1
            velocity = np.sqrt(dx**2 + dy**2) / dt_seconds

            if velocity < self.velocity_threshold:
                current_fixation.append(points[i])
            else:
                if len(current_fixation) >= 2:
                    fixation_array = np.array(current_fixation)
                    # Timestamps are in microseconds, convert to ms for comparison
                    duration_ms = (
                        fixation_array[-1, 2] - fixation_array[0, 2]
                    ) / 1000.0

                    if duration_ms >= self.min_fixation_duration_ms:
                        fixations.append(fixation_array)

                current_fixation = [points[i]]

        if len(current_fixation) >= 2:
            fixation_array = np.array(current_fixation)
            duration_ms = (fixation_array[-1, 2] - fixation_array[0, 2]) / 1000.0
            if duration_ms >= self.min_fixation_duration_ms:
                fixations.append(fixation_array)

        return fixations

    def extract_features(self, fixations: List[np.ndarray]) -> np.ndarray:
        """
        Extract 5 features per fixation (model expects this exact order):
        1. Duration (ms)
        2. Centroid X (normalized 0-1)
        3. Centroid Y (normalized 0-1)
        4. Amplitude (distance from previous fixation)
        5. Regression flag (1 if moved left, 0 otherwise)
        """
        if not fixations:
            return np.array([]).reshape(0, 5)

        features = []
        prev_centroid_x = None
        prev_centroid_y = None

        for fixation in fixations:
            # Convert microseconds to milliseconds
            duration_ms = (fixation[-1, 2] - fixation[0, 2]) / 1000.0
            centroid_x = np.mean(fixation[:, 0])
            centroid_y = np.mean(fixation[:, 1])

            if prev_centroid_x is not None:
                amplitude = np.sqrt(
                    (centroid_x - prev_centroid_x) ** 2
                    + (centroid_y - prev_centroid_y) ** 2
                )
                # Regression = eyes moved backward (right-to-left in LTR text)
                regression_flag = 1 if centroid_x < prev_centroid_x else 0
            else:
                amplitude = 0.0
                regression_flag = 0

            features.append(
                [duration_ms, centroid_x, centroid_y, amplitude, regression_flag]
            )

            prev_centroid_x = centroid_x
            prev_centroid_y = centroid_y

        return np.array(features)

    def create_sequences(self, features: np.ndarray) -> np.ndarray:
        """Sliding window: creates overlapping sequences using config parameters."""
        window_size = settings.EYE_TRACKER_SEQUENCE_LENGTH
        step = settings.EYE_TRACKER_SEQUENCE_STEP

        if len(features) < window_size:
            return np.array([]).reshape(0, window_size, 5)

        sequences = []
        for i in range(0, len(features) - window_size + 1, step):
            window = features[i : i + window_size]
            sequences.append(window)

        return np.array(sequences)

    def pad_sequences(self, sequences: np.ndarray) -> np.ndarray:
        """Pad/truncate to target sequence count for webcam model."""
        target_length = settings.WEBCAM_MAX_SEQUENCES
        window_size = settings.EYE_TRACKER_SEQUENCE_LENGTH

        if len(sequences) >= target_length:
            return sequences[:target_length]

        padding = np.zeros((target_length - len(sequences), window_size, 5))
        return np.vstack([sequences, padding])

    def process(
        self, raw_points: List[RawGazePoint], screen_width: int, screen_height: int
    ) -> np.ndarray:
        normalized = self.normalize_coordinates(raw_points, screen_width, screen_height)
        smoothed = self.smooth_signal(normalized)
        fixations = self.detect_fixations(smoothed)
        features = self.extract_features(fixations)

        if len(features) == 0:
            raise ValueError("No valid fixations detected")

        sequences = self.create_sequences(features)

        if len(sequences) < settings.WEBCAM_MIN_SEQUENCES:
            raise ValueError(
                "Insufficient data. Please ensure good lighting and read for the full duration."
            )

        padded = self.pad_sequences(sequences)
        return padded.reshape(
            1, settings.WEBCAM_MAX_SEQUENCES, settings.EYE_TRACKER_SEQUENCE_LENGTH, 5
        )
