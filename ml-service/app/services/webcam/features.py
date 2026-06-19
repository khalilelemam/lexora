from dataclasses import dataclass, field
from typing import List, Tuple

import numpy as np

from app.config import settings
from app.schemas.webcam import RawGazePoint
from .filters import OneEuroFilter


@dataclass
class WebcamProcessingResult:
    """Processed webcam payload ready for prediction and UI replay.

    Attributes:
        sequences: Model input tensor with shape (1, 82, 20, 5).
        features_data: Per-fixation features for API responses/replay.
        total_fixations: Count of valid fixations used.
        mean_fixation_duration_ms: Mean fixation duration over valid fixations.
    """

    sequences: np.ndarray
    sequences_analyzed: int = 0
    features_data: list[dict] = field(default_factory=list)
    total_fixations: int = 0
    mean_fixation_duration_ms: float = 0.0


class WebcamFeatureProcessor:
    """Convert raw webcam gaze points into model-ready sequence windows.

    Pipeline:
    1. Normalize pixel coordinates to [0, 1].
    2. Smooth x/y independently with One Euro filtering.
    3. Detect fixations with an I-DT style dispersion window.
    4. Extract per-fixation features.
    5. Build sliding windows of 20 fixations with step 5.
    6. Pad/truncate to 82 windows and reshape for model inference.
    """

    def __init__(self):
        self.min_fixation_duration_ms = settings.WEBCAM_MIN_FIXATION_MS
        self.max_fixation_duration_ms = settings.WEBCAM_MAX_FIXATION_MS
        self.dispersion_threshold = settings.WEBCAM_IDT_DISPERSION_THRESHOLD
        self.duration_threshold_ms = settings.WEBCAM_IDT_MIN_WINDOW_MS
        self.line_transition_threshold = settings.WEBCAM_LINE_TRANSITION_THRESHOLD
        self.one_euro_mincutoff = settings.WEBCAM_ONE_EURO_MINCUTOFF
        self.one_euro_beta = settings.WEBCAM_ONE_EURO_BETA
        self.one_euro_dcutoff = settings.WEBCAM_ONE_EURO_DCUTOFF

    def smooth_signal(
        self, points: List[Tuple[float, float, int]]
    ) -> List[Tuple[float, float, int]]:
        """Apply One Euro filtering independently to x and y coordinates."""
        if not points:
            return []

        x_filter = OneEuroFilter(
            mincutoff=self.one_euro_mincutoff,
            beta=self.one_euro_beta,
            dcutoff=self.one_euro_dcutoff,
        )
        y_filter = OneEuroFilter(
            mincutoff=self.one_euro_mincutoff,
            beta=self.one_euro_beta,
            dcutoff=self.one_euro_dcutoff,
        )

        smoothed = []
        for x, y, t in points:
            x_filtered = x_filter.filter(x, t)
            y_filtered = y_filter.filter(y, t)
            smoothed.append((x_filtered, y_filtered, t))

        return smoothed

    def detect_fixations(
        self, points: List[Tuple[float, float, int]]
    ) -> tuple[List[np.ndarray], int]:
        """Detect fixations using dispersion-threshold windows.

        Returns:
            A tuple of:
            - list of fixation arrays with columns [x, y, timestamp_ms]
            - count of points rejected during phase-1 saccade rejection or
              duration validation

        Notes:
            Each source point can contribute to at most one fixation. This avoids
            accidental double counting when window boundaries are noisy.
        """
        if len(points) < 2:
            return [], 0

        used_point_indices: set[int] = set()

        fixations: list[np.ndarray] = []
        invalid_fixation_points = 0
        i = 0

        indexed_points: list[tuple[int, float, float, int]] = [
            (idx, float(x), float(y), int(t)) for idx, (x, y, t) in enumerate(points)
        ]

        while i < len(indexed_points):
            window: list[tuple[int, float, float, int]] = [indexed_points[i]]
            i += 1
            phase1_saccade_detected = False

            while i < len(indexed_points):
                candidate_window = window + [indexed_points[i]]

                xs = [p[1] for p in candidate_window]
                ys = [p[2] for p in candidate_window]
                dispersion = (max(xs) - min(xs)) + (max(ys) - min(ys))

                if dispersion <= self.dispersion_threshold:
                    window.append(indexed_points[i])
                    i += 1

                    duration_ms = window[-1][3] - window[0][3]
                    if duration_ms >= self.duration_threshold_ms:
                        break
                else:
                    duration_ms = window[-1][3] - window[0][3]

                    if duration_ms < self.duration_threshold_ms:
                        invalid_fixation_points += len(window)
                        phase1_saccade_detected = True
                        break
                    else:
                        break

            if phase1_saccade_detected:
                continue

            while i < len(indexed_points):
                candidate_window = window + [indexed_points[i]]
                xs = [p[1] for p in candidate_window]
                ys = [p[2] for p in candidate_window]
                dispersion = (max(xs) - min(xs)) + (max(ys) - min(ys))

                if dispersion <= self.dispersion_threshold:
                    window.append(indexed_points[i])
                    i += 1
                else:
                    break
            duration_ms = window[-1][3] - window[0][3]
            window_len = len(window)

            if (
                window_len >= 2
                and self.min_fixation_duration_ms
                <= duration_ms
                <= self.max_fixation_duration_ms
            ):
                filtered = [p for p in window if p[0] not in used_point_indices]
                if len(filtered) >= 2:
                    used_point_indices.update(p[0] for p in filtered)
                    fixations.append(np.array([(p[1], p[2], p[3]) for p in filtered]))
                else:
                    invalid_fixation_points += window_len
            else:
                invalid_fixation_points += window_len

        return fixations, invalid_fixation_points

    def normalize_coordinates(
        self, points: List[RawGazePoint], screen_width: int, screen_height: int
    ) -> tuple[List[Tuple[float, float, int]], int]:
        """Normalize gaze coordinates to [0, 1] and count out-of-bounds points.

        Keeping the out-of-bounds count lets us inspect capture quality later
        without changing model features.
        """
        normalized = []
        out_of_bounds_count = 0

        for p in points:
            x_norm = p.x / screen_width
            y_norm = p.y / screen_height

            if 0 <= x_norm <= 1 and 0 <= y_norm <= 1:
                normalized.append((x_norm, y_norm, p.timestamp))
            else:
                out_of_bounds_count += 1

        return normalized, out_of_bounds_count

    def extract_features(
        self,
        fixations: List[np.ndarray],
    ) -> np.ndarray:
        """Extract six features per fixation.

        Feature order:
            [duration_ms, centroid_x, centroid_y, amplitude, regression, return_sweep]

        The model currently consumes the first five features only; return_sweep
        is included for richer analysis/replay and future model experiments.

        Line transitions and regressions are detected from raw vertical
        displacement between consecutive fixation centroids — no coordinate
        snapping is applied so that the feature distribution matches training.
        """
        if not fixations:
            return np.array([]).reshape(0, 6)

        features = []
        prev_centroid_x = None
        prev_centroid_y = None
        prev_line_id = 0
        for fixation in fixations:
            duration_ms = fixation[-1, 2] - fixation[0, 2]
            centroid_x = np.mean(fixation[:, 0])
            centroid_y = np.mean(fixation[:, 1])

            current_line_id = prev_line_id
            if prev_centroid_y is not None:
                diff_y = centroid_y - prev_centroid_y
                if diff_y > self.line_transition_threshold:
                    current_line_id = prev_line_id + 1
                elif diff_y < -self.line_transition_threshold:
                    current_line_id = max(0, prev_line_id - 1)

            if prev_centroid_x is not None:
                amplitude = np.sqrt(
                    (centroid_x - prev_centroid_x) ** 2
                    + (centroid_y - prev_centroid_y) ** 2
                )

                # Regression: leftward movement on the same reading line.
                regression_flag = int(
                    centroid_x < prev_centroid_x and current_line_id == prev_line_id
                )
                # Return sweep: transition from one line to the next.
                return_sweep_flag = 1 if current_line_id > prev_line_id else 0
            else:
                amplitude = 0.0
                regression_flag = 0
                return_sweep_flag = 0

            features.append(
                [
                    duration_ms,
                    centroid_x,
                    centroid_y,
                    amplitude,
                    regression_flag,
                    return_sweep_flag,
                ]
            )

            prev_centroid_x = centroid_x
            prev_centroid_y = centroid_y
            prev_line_id = current_line_id

        return np.array(features)

    def create_sequences(self, features: np.ndarray) -> np.ndarray:
        """Create overlapping windows from fixation features.

        Window size and step are aligned with training config. Only the first
        five features are included in model windows.
        """
        window_size = settings.EYE_TRACKER_SEQUENCE_LENGTH
        step = settings.EYE_TRACKER_SEQUENCE_STEP

        if len(features) < window_size:
            return np.array([]).reshape(0, window_size, 5)

        sequences = []
        for i in range(0, len(features) - window_size + 1, step):
            window = features[i : i + window_size, :5]
            sequences.append(window)

        return np.array(sequences)

    def pad_sequences(self, sequences: np.ndarray) -> np.ndarray:
        """Pad or truncate to the model's required sequence count."""
        target_length = settings.WEBCAM_MAX_SEQUENCES
        window_size = settings.EYE_TRACKER_SEQUENCE_LENGTH

        if len(sequences) >= target_length:
            return sequences[:target_length]

        padding = np.zeros((target_length - len(sequences), window_size, 5))
        return np.vstack([sequences, padding])

    def process(
        self,
        raw_points: List[RawGazePoint],
        screen_width: int,
        screen_height: int,
    ) -> WebcamProcessingResult:
        """Run the full webcam feature pipeline and return model-ready output."""
        normalized, _out_of_bounds_count = self.normalize_coordinates(
            raw_points, screen_width, screen_height
        )
        smoothed = self.smooth_signal(normalized)

        fixations, _invalid_fixation_points = self.detect_fixations(smoothed)
        features = self.extract_features(fixations)

        if len(features) == 0:
            raise ValueError("No valid fixations detected")

        sequences = self.create_sequences(features)

        if len(sequences) < settings.WEBCAM_MIN_SEQUENCES:
            raise ValueError(
                "Insufficient data. Please ensure good lighting and read for the full duration."
            )

        padded = self.pad_sequences(sequences)
        model_input = padded.reshape(
            1, settings.WEBCAM_MAX_SEQUENCES, settings.EYE_TRACKER_SEQUENCE_LENGTH, 5
        )

        features_data = [
            {
                "timestamp": int(fixation[0, 2]),
                "duration_ms": float(row[0]),
                "fixation_x": float(row[1]),
                "fixation_y": float(row[2]),
                "saccade_amplitude": float(row[3]),
                "is_regression": bool(row[4]),
                "is_return_sweep": bool(row[5]),
            }
            for fixation, row in zip(fixations, features)
        ]

        return WebcamProcessingResult(
            sequences=model_input,
            sequences_analyzed=int(len(sequences)),
            features_data=features_data,
            total_fixations=len(features),
            mean_fixation_duration_ms=float(features[:, 0].mean()),
        )
