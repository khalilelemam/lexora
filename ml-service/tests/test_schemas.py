import pytest
from pydantic import ValidationError

from app.schemas import GazePoint, GazeSequence, PredictionRequest, RiskLevel
from app.schemas.webcam import RawGazePoint, WebcamPredictionRequest
from tests.conftest import create_gaze_points


class TestGazePoint:
    def test_valid_gaze_point(self):
        point = GazePoint(fixation_x=0.5, fixation_y=0.5, timestamp=1000000)

        assert point.fixation_x == 0.5
        assert point.fixation_y == 0.5
        assert point.timestamp == 1000000

    def test_boundary_values(self):
        point_min = GazePoint(fixation_x=0.0, fixation_y=0.0, timestamp=1)
        assert point_min.fixation_x == 0.0

        point_max = GazePoint(fixation_x=1.0, fixation_y=1.0, timestamp=1)
        assert point_max.fixation_y == 1.0

    def test_invalid_x_below_zero(self):
        with pytest.raises(ValidationError) as exc_info:
            GazePoint(fixation_x=-0.1, fixation_y=0.5, timestamp=1000)

        assert "fixation_x" in str(exc_info.value)

    def test_invalid_x_above_one(self):
        with pytest.raises(ValidationError) as exc_info:
            GazePoint(fixation_x=1.1, fixation_y=0.5, timestamp=1000)

        assert "fixation_x" in str(exc_info.value)

    def test_invalid_y_below_zero(self):
        with pytest.raises(ValidationError) as exc_info:
            GazePoint(fixation_x=0.5, fixation_y=-0.1, timestamp=1000)

        assert "fixation_y" in str(exc_info.value)

    def test_invalid_timestamp_zero(self):
        with pytest.raises(ValidationError) as exc_info:
            GazePoint(fixation_x=0.5, fixation_y=0.5, timestamp=0)

        assert "timestamp" in str(exc_info.value)

    def test_invalid_timestamp_negative(self):
        with pytest.raises(ValidationError) as exc_info:
            GazePoint(fixation_x=0.5, fixation_y=0.5, timestamp=-1000)

        assert "timestamp" in str(exc_info.value)


class TestGazeSequence:
    def test_valid_sequence(self, valid_gaze_points):
        sequence = GazeSequence(gaze_points=valid_gaze_points)

        assert len(sequence.gaze_points) == 50

    def test_minimum_points_exactly_20(self):
        points = create_gaze_points(20)
        sequence = GazeSequence(gaze_points=points)

        assert len(sequence.gaze_points) == 20

    def test_insufficient_points(self):
        points = create_gaze_points(19)

        with pytest.raises(ValidationError) as exc_info:
            GazeSequence(gaze_points=points)

        assert "gaze_points" in str(exc_info.value)

    def test_timestamps_must_be_ascending(self):
        points = [
            GazePoint(fixation_x=0.5, fixation_y=0.5, timestamp=1000),
            GazePoint(fixation_x=0.5, fixation_y=0.5, timestamp=900),
        ] + create_gaze_points(18, start_timestamp=1100)

        with pytest.raises(ValidationError) as exc_info:
            GazeSequence(gaze_points=points)

        assert "ascending order" in str(exc_info.value)

    def test_timestamps_cannot_be_equal(self):
        points = [
            GazePoint(fixation_x=0.5, fixation_y=0.5, timestamp=1000),
            GazePoint(fixation_x=0.6, fixation_y=0.5, timestamp=1000),
        ] + create_gaze_points(18, start_timestamp=1100)

        with pytest.raises(ValidationError) as exc_info:
            GazeSequence(gaze_points=points)

        assert "ascending order" in str(exc_info.value)

    def test_normalized_line_centers_must_be_in_range(self, valid_gaze_points):
        with pytest.raises(ValidationError) as exc_info:
            GazeSequence(
                gaze_points=valid_gaze_points,
                normalized_line_centers=[0.2, 1.2],
            )

        assert "normalized_line_centers" in str(exc_info.value)

    def test_normalized_line_centers_must_be_strictly_increasing(
        self, valid_gaze_points
    ):
        with pytest.raises(ValidationError) as exc_info:
            GazeSequence(
                gaze_points=valid_gaze_points,
                normalized_line_centers=[0.3, 0.25, 0.6],
            )

        assert "strictly increasing" in str(exc_info.value)


class TestPredictionRequest:
    def test_valid_request(self, valid_gaze_sequence):
        request = PredictionRequest(
            syllables_task=valid_gaze_sequence,
            meaningful_task=valid_gaze_sequence,
            pseudo_task=valid_gaze_sequence,
        )

        assert request.screen_width == 1680
        assert request.screen_height == 1050

    def test_custom_screen_dimensions(self, valid_gaze_sequence):
        request = PredictionRequest(
            syllables_task=valid_gaze_sequence,
            meaningful_task=valid_gaze_sequence,
            pseudo_task=valid_gaze_sequence,
            screen_width=2560,
            screen_height=1440,
        )

        assert request.screen_width == 2560
        assert request.screen_height == 1440

    def test_invalid_screen_width_zero(self, valid_gaze_sequence):
        with pytest.raises(ValidationError) as exc_info:
            PredictionRequest(
                syllables_task=valid_gaze_sequence,
                meaningful_task=valid_gaze_sequence,
                pseudo_task=valid_gaze_sequence,
                screen_width=0,
            )

        assert "screen_width" in str(exc_info.value)

    def test_invalid_screen_height_negative(self, valid_gaze_sequence):
        with pytest.raises(ValidationError) as exc_info:
            PredictionRequest(
                syllables_task=valid_gaze_sequence,
                meaningful_task=valid_gaze_sequence,
                pseudo_task=valid_gaze_sequence,
                screen_height=-100,
            )

        assert "screen_height" in str(exc_info.value)

    def test_camel_case_alias(self, valid_gaze_sequence):
        # PredictionRequest and nested models accept both camelCase and snake_case
        # thanks to alias_generator=to_camel + populate_by_name=True
        data = {
            "syllablesTask": {
                "gazePoints": [p.model_dump() for p in create_gaze_points(25)]
            },
            "meaningfulTask": {
                "gazePoints": [p.model_dump() for p in create_gaze_points(25)]
            },
            "pseudoTask": {
                "gazePoints": [p.model_dump() for p in create_gaze_points(25)]
            },
            "screenWidth": 1920,
            "screenHeight": 1080,
        }

        request = PredictionRequest.model_validate(data)

        assert request.screen_width == 1920
        assert len(request.syllables_task.gaze_points) == 25


class TestRiskLevel:
    """Tests for RiskLevel enum and from_probability classmethod."""

    def test_risk_level_values(self):
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.HIGH.value == "high"

    def test_from_probability_low(self):
        result = RiskLevel.from_probability(
            0.2, low_threshold=0.33, high_threshold=0.66
        )
        assert result == RiskLevel.LOW

    def test_from_probability_medium(self):
        result = RiskLevel.from_probability(
            0.5, low_threshold=0.33, high_threshold=0.66
        )
        assert result == RiskLevel.MEDIUM

    def test_from_probability_high(self):
        result = RiskLevel.from_probability(
            0.8, low_threshold=0.33, high_threshold=0.66
        )
        assert result == RiskLevel.HIGH

    def test_from_probability_at_low_threshold(self):
        """At low threshold boundary, should be MEDIUM."""
        result = RiskLevel.from_probability(
            0.33, low_threshold=0.33, high_threshold=0.66
        )
        assert result == RiskLevel.MEDIUM

    def test_from_probability_at_high_threshold(self):
        """At high threshold boundary, should be HIGH."""
        result = RiskLevel.from_probability(
            0.66, low_threshold=0.33, high_threshold=0.66
        )
        assert result == RiskLevel.HIGH

    def test_from_probability_zero(self):
        result = RiskLevel.from_probability(
            0.0, low_threshold=0.33, high_threshold=0.66
        )
        assert result == RiskLevel.LOW

    def test_from_probability_one(self):
        result = RiskLevel.from_probability(
            1.0, low_threshold=0.33, high_threshold=0.66
        )
        assert result == RiskLevel.HIGH


class TestRawGazePoint:
    """Tests for webcam RawGazePoint schema."""

    def test_valid_raw_gaze_point(self):
        point = RawGazePoint(x=960.0, y=540.0, timestamp=1000000)

        assert point.x == 960.0
        assert point.y == 540.0
        assert point.timestamp == 1000000

    def test_raw_gaze_point_no_bounds_validation(self):
        """Raw points can have any positive coordinates (pixel values)."""
        point = RawGazePoint(x=3840.0, y=2160.0, timestamp=1000)
        assert point.x == 3840.0

    def test_raw_gaze_point_invalid_negative_timestamp(self):
        with pytest.raises(ValidationError):
            RawGazePoint(x=100.0, y=100.0, timestamp=-1)


class TestWebcamPredictionRequest:
    """Tests for webcam prediction request schema."""

    def test_valid_webcam_request(self):
        gaze_data = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000000 + i * 16000)
            for i in range(50)
        ]
        request = WebcamPredictionRequest(
            gaze_data=gaze_data,
            screen_width=1920,
            screen_height=1080,
        )

        assert len(request.gaze_data) == 50
        assert request.screen_width == 1920

    def test_webcam_request_minimum_points(self):
        """Webcam requires at least 20 gaze points."""
        gaze_data = [
            RawGazePoint(x=100.0, y=100.0, timestamp=1000000 + i * 1000)
            for i in range(19)
        ]

        with pytest.raises(ValidationError) as exc_info:
            WebcamPredictionRequest(
                gaze_data=gaze_data,
                screen_width=1920,
                screen_height=1080,
            )

        assert "gaze_data" in str(exc_info.value)

    def test_webcam_line_centers_must_be_in_range(self):
        gaze_data = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000000 + i * 16000)
            for i in range(25)
        ]

        with pytest.raises(ValidationError) as exc_info:
            WebcamPredictionRequest(
                gaze_data=gaze_data,
                screen_width=1920,
                screen_height=1080,
                normalized_line_centers=[0.3, -0.1],
            )

        assert "normalized_line_centers" in str(exc_info.value)

    def test_webcam_line_centers_must_be_strictly_increasing(self):
        gaze_data = [
            RawGazePoint(x=960.0, y=540.0, timestamp=1000000 + i * 16000)
            for i in range(25)
        ]

        with pytest.raises(ValidationError) as exc_info:
            WebcamPredictionRequest(
                gaze_data=gaze_data,
                screen_width=1920,
                screen_height=1080,
                normalized_line_centers=[0.3, 0.3, 0.6],
            )

        assert "strictly increasing" in str(exc_info.value)
