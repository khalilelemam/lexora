import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple
from app.config import settings
from app.schemas.webcam import RawGazePoint


@dataclass
class WebcamProcessingResult:
    sequences: np.ndarray
    features_data: list[dict] = field(default_factory=list)
    total_fixations: int = 0
    mean_fixation_duration_ms: float = 0.0
    pipeline_metrics: dict = field(default_factory=dict)


class OneEuroFilter:
    """
    1D One Euro Filter for smoothing gaze coordinates.
    Based on "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems"
    """

    def __init__(self, mincutoff: float = 1.0, beta: float = 0.007, dcutoff: float = 1.0):
        self.mincutoff = mincutoff
        self.beta = beta
        self.dcutoff = dcutoff
        self.x_prev = None
        self.dx_prev = None
        self.t_prev = None

    def _smoothing_factor(self, t_e: float, cutoff: float) -> float:
        """Calculate smoothing factor for the current sample."""
        r = 2 * np.pi * cutoff * t_e
        return r / (r + 1) if r > 0 else 0

    def filter(self, x: float, t: int) -> float:
        """
        Apply One Euro Filter to a single value.
        
        Args:
            x: Current coordinate value (normalized 0-1)
            t: Timestamp in milliseconds
        
        Returns:
            Filtered coordinate value
        """
        if self.x_prev is None:
            self.x_prev = x
            self.dx_prev = 0.0
            self.t_prev = t
            return x

        # Calculate time delta in seconds
        t_e = (t - self.t_prev) / 1000.0
        if t_e <= 0:
            return self.x_prev

        # Estimate velocity (derivative)
        dx = (x - self.x_prev) / t_e if t_e > 0 else 0
        
        # Smooth velocity
        alpha_d = self._smoothing_factor(t_e, self.dcutoff)
        dx_filtered = alpha_d * dx + (1 - alpha_d) * self.dx_prev

        # Smooth position using dynamic cutoff based on velocity
        cutoff = self.mincutoff + self.beta * abs(dx_filtered)
        alpha = self._smoothing_factor(t_e, cutoff)
        x_filtered = alpha * x + (1 - alpha) * self.x_prev

        # Update state
        self.x_prev = x_filtered
        self.dx_prev = dx_filtered
        self.t_prev = t

        return x_filtered

    def reset(self):
        """Reset filter state."""
        self.x_prev = None
        self.dx_prev = None
        self.t_prev = None


class WebcamFeatureProcessor:
    """
    Converts raw webcam gaze points into model-ready sequences.

    Algorithm: One Euro Filter + I-DT (Identification by Dispersion Threshold)
    - One Euro Filter smooths raw coordinates
    - I-DT groups points into fixations based on spatial dispersion
    - Fixations shorter than minimum duration are filtered as noise

    Output shape: (1, 82, 20, 5) = (batch, sequences, timesteps, features)
    Features: [duration_ms, centroid_x, centroid_y, amplitude, regression_flag]
    """

    def __init__(self):
        self.min_fixation_duration_ms = settings.WEBCAM_MIN_FIXATION_MS
        self.max_fixation_duration_ms = settings.WEBCAM_MAX_FIXATION_MS
        # I-DT parameters
        self.dispersion_threshold = 0.04
        self.duration_threshold_ms = 150
        # One Euro Filter parameters
        self.one_euro_mincutoff = 1.0
        self.one_euro_beta = 0.007
        self.one_euro_dcutoff = 1.0

    def smooth_signal(
        self, points: List[Tuple[float, float, int]]
    ) -> List[Tuple[float, float, int]]:
        """
        Apply One Euro Filter to smooth gaze coordinates independently.
        Handles variable frame rates gracefully.
        """
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
        """
        I-DT (Identification by Dispersion Threshold) fixation detection.
        
        CRITICAL TUNING: Enforces saccadic exclusion during Phase 1.
        - Dispersion threshold set to 0.04 to balance retention and noise rejection
        - Phase 1: Accumulate points until 150ms BUT check dispersion continuously
        - If dispersion breaks BEFORE 150ms: those are saccadic points, mark invalid, skip
        - Phase 2: Expand further while dispersion remains OK
        
        Implements STRICT non-overlapping window semantics:
        - Each raw point belongs to at most ONE fixation
        - No point can be re-evaluated in multiple fixations
        
        Returns: (fixations, invalid_fixation_points)
        - fixations: List of valid fixation windows as numpy arrays
        - invalid_fixation_points: Total points discarded (saccadic + duration filtering)
        """
        if len(points) < 2:
            return [], 0

        # Track which source points have already been assigned to a valid fixation.
        # This is a hard guard against any accidental point reuse that would make
        # retention exceed 100%.
        used_point_indices: set[int] = set()

        fixations: list[np.ndarray] = []
        invalid_fixation_points = 0
        i = 0

        # Represent each point as (source_index, x, y, t)
        indexed_points: list[tuple[int, float, float, int]] = [
            (idx, float(x), float(y), int(t)) for idx, (x, y, t) in enumerate(points)
        ]

        while i < len(indexed_points):
            # Start a new candidate window
            window: list[tuple[int, float, float, int]] = [indexed_points[i]]
            i += 1

            # ═══════════════════════════════════════════════════════════════════════
            # PHASE 1: Accumulate until 150ms, enforcing dispersion at every step
            # ═══════════════════════════════════════════════════════════════════════
            phase1_saccade_detected = False

            while i < len(indexed_points):
                candidate_window = window + [indexed_points[i]]

                # Calculate dispersion with candidate point
                xs = [p[1] for p in candidate_window]
                ys = [p[2] for p in candidate_window]
                dispersion = (max(xs) - min(xs)) + (max(ys) - min(ys))

                if dispersion <= self.dispersion_threshold:
                    # ✅ Dispersion OK: add point and check if we've hit 150ms
                    window.append(indexed_points[i])
                    i += 1

                    duration_ms = window[-1][3] - window[0][3]
                    if duration_ms >= self.duration_threshold_ms:
                        # ✅ Reached 150ms with good dispersion - exit Phase 1
                        break
                else:
                    # ❌ Dispersion EXCEEDED
                    duration_ms = window[-1][3] - window[0][3]

                    if duration_ms < self.duration_threshold_ms:
                        # Dispersion broke BEFORE 150ms - these are saccadic points
                        invalid_fixation_points += len(window)
                        phase1_saccade_detected = True
                        # i remains at the boundary point to be re-evaluated
                        break
                    else:
                        # We hit 150ms, then dispersion broke in Phase 1
                        # Treat as a normal boundary.
                        break

            if phase1_saccade_detected:
                continue

            # ═══════════════════════════════════════════════════════════════════════
            # PHASE 2: Continue expanding while dispersion stays within threshold
            # ═══════════════════════════════════════════════════════════════════════
            while i < len(indexed_points):
                candidate_window = window + [indexed_points[i]]
                xs = [p[1] for p in candidate_window]
                ys = [p[2] for p in candidate_window]
                dispersion = (max(xs) - min(xs)) + (max(ys) - min(ys))

                if dispersion <= self.dispersion_threshold:
                    window.append(indexed_points[i])
                    i += 1
                else:
                    # Boundary found; do not consume indexed_points[i]
                    break

            # ═══════════════════════════════════════════════════════════════════════
            # PHASE 3: Validate fixation duration
            # ═══════════════════════════════════════════════════════════════════════
            duration_ms = window[-1][3] - window[0][3]
            window_len = len(window)

            if (
                window_len >= 2
                and self.min_fixation_duration_ms <= duration_ms <= self.max_fixation_duration_ms
            ):
                # Hard non-overlap guard: if any point was already used, drop it.
                filtered = [p for p in window if p[0] not in used_point_indices]
                if len(filtered) >= 2:
                    used_point_indices.update(p[0] for p in filtered)
                    fixations.append(np.array([(p[1], p[2], p[3]) for p in filtered]))
                else:
                    # After filtering, not enough points to form a fixation.
                    invalid_fixation_points += window_len
            else:
                invalid_fixation_points += window_len

        return fixations, invalid_fixation_points

    def normalize_coordinates(
        self, points: List[RawGazePoint], screen_width: int, screen_height: int
    ) -> tuple[List[Tuple[float, float, int]], int]:
        """
        Normalize gaze coordinates to [0, 1] range.
        Returns (normalized_points, out_of_bounds_count).
        
        Tracks points that fall outside valid bounds for metrics.
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
        self, fixations: List[np.ndarray], normalized_line_centers: List[float] | None = None
    ) -> np.ndarray:
        """
        Extract 6 features per fixation for downstream tools.
        The first 5 are used for modeling (model expects this exact order):
        1. Duration (ms)
        2. Centroid X (normalized 0-1)
        3. Centroid Y (normalized 0-1)
        4. Amplitude (distance from previous fixation)
        5. Regression flag (1 if moved left on SAME line, 0 otherwise)
        6. Return Sweep flag (1 if jumped to a new line, 0 otherwise)
        
        If normalized_line_centers provided:
        - Snaps centroid_y to nearest line center
        - Assigns line_id based on which line fixation snapped to
        - Uses line_id for regression/return sweep detection
        """
        if not fixations:
            return np.array([]).reshape(0, 6)

        features = []
        prev_centroid_x = None
        prev_centroid_y = None
        prev_line_id = 0
        line_centers_arr = np.array(normalized_line_centers or [], dtype=np.float32)

        for i, fixation in enumerate(fixations):
            # Timestamps are in milliseconds
            duration_ms = fixation[-1, 2] - fixation[0, 2]
            centroid_x = np.mean(fixation[:, 0])
            centroid_y = np.mean(fixation[:, 1])
            
            # ─── Y-Axis Line Snapping ──────────────────────────────────────
            if len(line_centers_arr) > 0:
                # Find nearest line center (1D nearest neighbor search)
                distances = np.abs(line_centers_arr - centroid_y)
                current_line_id = int(np.argmin(distances))
                # Snap to exact line center
                centroid_y = line_centers_arr[current_line_id]
            else:
                # No line centers provided; estimate line_id from Y-delta
                current_line_id = 0
                if prev_centroid_y is not None and centroid_y - prev_centroid_y > 0.04:
                    current_line_id = prev_line_id + 1

            if prev_centroid_x is not None:
                amplitude = np.sqrt(
                    (centroid_x - prev_centroid_x) ** 2
                    + (centroid_y - prev_centroid_y) ** 2
                )
                
                # ─── Fixed Regression/Return Sweep Logic ───────────────────
                # Forward reading: current_x > previous_x AND same line
                # Regression: current_x < previous_x AND same line
                # Return sweep: current_line_id > previous_line_id
                regression_flag = 1 if (centroid_x < prev_centroid_x and current_line_id == prev_line_id) else 0
                return_sweep_flag = 1 if current_line_id > prev_line_id else 0
            else:
                amplitude = 0.0
                regression_flag = 0
                return_sweep_flag = 0

            features.append(
                [duration_ms, centroid_x, centroid_y, amplitude, regression_flag, return_sweep_flag]
            )

            prev_centroid_x = centroid_x
            prev_centroid_y = centroid_y
            prev_line_id = current_line_id

        return np.array(features)

    def create_sequences(self, features: np.ndarray) -> np.ndarray:
        """Sliding window: creates overlapping sequences using config parameters."""
        window_size = settings.EYE_TRACKER_SEQUENCE_LENGTH
        step = settings.EYE_TRACKER_SEQUENCE_STEP

        if len(features) < window_size:
            return np.array([]).reshape(0, window_size, 5)

        sequences = []
        for i in range(0, len(features) - window_size + 1, step):
            window = features[i : i + window_size, :5]  # Only standard 5 features for the model
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
        self,
        raw_points: List[RawGazePoint],
        screen_width: int,
        screen_height: int,
        normalized_line_centers: List[float] | None = None,
    ) -> WebcamProcessingResult:
        # PHASE 1: Normalize coordinates, tracking out-of-bounds points
        normalized, out_of_bounds_count = self.normalize_coordinates(raw_points, screen_width, screen_height)
        
        # PHASE 2: Smooth signal
        smoothed = self.smooth_signal(normalized)
        
        # PHASE 3: Detect fixations, tracking invalid fixations
        fixations, invalid_fixation_points = self.detect_fixations(smoothed)
        
        # Extract features (with Y-axis line snapping if line centers provided)
        features = self.extract_features(fixations, normalized_line_centers)

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

        # ═══════════════════════════════════════════════════════════════════════
        # DATA FUNNEL: Track point progression through pipeline stages
        # ═══════════════════════════════════════════════════════════════════════
        
        raw_count = len(raw_points)
        normalized_count = len(normalized)
        total_in_fixations = sum(len(f) for f in fixations)
        
        # Stage 1: Raw → Normalized (filter out-of-bounds)
        normalized_retention_pct = (normalized_count / raw_count * 100) if raw_count > 0 else 0.0
        
        # Stage 2: Normalized → Valid Fixations (duration filtering, dispersion grouping)
        fixation_retention_pct = (total_in_fixations / normalized_count * 100) if normalized_count > 0 else 0.0
        
        # Stage 3: Raw → Final Valid Fixations (end-to-end)
        total_pipeline_retention_pct = (total_in_fixations / raw_count * 100) if raw_count > 0 else 0.0
        
        # ═══════════════════════════════════════════════════════════════════════
        # SANITY CHECK: cap percentages at 100 to avoid invalid telemetry values
        # ═══════════════════════════════════════════════════════════════════════
        def safe_cap_percent(pct: float) -> float:
            return min(pct, 100.0)
        
        normalized_retention_pct = safe_cap_percent(normalized_retention_pct)
        fixation_retention_pct = safe_cap_percent(fixation_retention_pct)
        total_pipeline_retention_pct = safe_cap_percent(total_pipeline_retention_pct)
        
        # Calculate additional pipeline metrics
        durations = features[:, 0]
        amps = features[:, 3]
        
        jitter_sum = sum(np.std(f[:, 0]) + np.std(f[:, 1]) for f in fixations)
        mean_jitter = (jitter_sum / len(fixations)) / 2 if fixations else 0.0
        
        pipeline_metrics = {
            "total_fixations": len(features),
            "mean_fixation_duration_ms": float(durations.mean()) if len(durations) > 0 else 0.0,
            "fixation_duration_sd": float(durations.std()) if len(durations) > 0 else 0.0,
            # NEW: Detailed Data Funnel
            "normalized_retention_pct": float(normalized_retention_pct),
            "fixation_retention_pct": float(fixation_retention_pct),
            "total_pipeline_retention_pct": float(total_pipeline_retention_pct),
            # NEW: Invalid Data Tracking
            "out_of_bounds_points": int(out_of_bounds_count),
            "invalid_fixation_points": int(invalid_fixation_points),
            # Existing metrics
            "mean_saccade_amplitude": float(amps.mean()) if len(amps) > 0 else 0.0,
            "total_regressions": int(np.sum(features[:, 4])),
            "intra_fixation_jitter": float(mean_jitter),
            # Legacy: kept for backwards compatibility
            "data_retention_pct": float(total_pipeline_retention_pct),
        }
        
        return WebcamProcessingResult(
            sequences=model_input,
            features_data=features_data,
            total_fixations=len(features),
            mean_fixation_duration_ms=float(features[:, 0].mean()),
            pipeline_metrics=pipeline_metrics
        )
