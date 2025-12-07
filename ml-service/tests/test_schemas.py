import pytest
from pydantic import ValidationError

from app.schemas import GazePoint, GazeSequence, PredictionRequest
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
        # PredictionRequest accepts camelCase for its direct fields
        # But nested GazeSequence still uses snake_case (gaze_points)
        data = {
            "syllablesTask": {
                "gaze_points": [p.model_dump() for p in create_gaze_points(25)]
            },
            "meaningfulTask": {
                "gaze_points": [p.model_dump() for p in create_gaze_points(25)]
            },
            "pseudoTask": {
                "gaze_points": [p.model_dump() for p in create_gaze_points(25)]
            },
            "screenWidth": 1920,
            "screenHeight": 1080,
        }

        request = PredictionRequest.model_validate(data)

        assert request.screen_width == 1920
        assert len(request.syllables_task.gaze_points) == 25
