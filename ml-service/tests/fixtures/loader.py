import csv
from pathlib import Path
from typing import List

from app.schemas import GazePoint

FIXTURES_DIR = Path(__file__).parent

SCREEN_WIDTH = 1680
SCREEN_HEIGHT = 1050


def load_gaze_points_from_csv(filepath: Path) -> List[GazePoint]:
    """
    Load gaze points from CSV file.

    Converts pixel coordinates to normalized (0-1) and calculates timestamps.
    """
    points = []
    current_time = 1000000

    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            x_px = float(row["fixation_x_px"])
            y_px = float(row["fixation_y_px"])
            duration_ms = float(row["fixation_duration_ms"])

            points.append(
                GazePoint(
                    fixation_x=x_px / SCREEN_WIDTH,
                    fixation_y=y_px / SCREEN_HEIGHT,
                    timestamp=current_time,
                )
            )

            current_time += int(duration_ms * 1000)

    return points


def load_case(case_id: str, task: str) -> List[GazePoint]:
    """
    Load gaze data for a specific case and task.

    case_id: 'tp-1174', 'tn-1209', or 'fp-1065'
    task: 'syllables', 'meaningful-text', or 'pseudo-text'
    """
    case_type = case_id.split("-")[0]
    case_number = case_id.split("-")[1]
    filename = f"{case_number}-{task}.csv"
    return load_gaze_points_from_csv(FIXTURES_DIR / case_type / filename)


def load_case_all_tasks(case_id: str) -> dict:
    """Load all three tasks for a case."""
    return {
        "syllables": load_case(case_id, "syllables"),
        "meaningful": load_case(case_id, "meaningful-text"),
        "pseudo": load_case(case_id, "pseudo-text"),
    }
