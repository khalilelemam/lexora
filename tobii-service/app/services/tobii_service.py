"""Tobii eye tracker service."""

import logging
from typing import List, Dict, Any, Optional
import tobii_research as tr

from app.models.gaze import GazePoint

logger = logging.getLogger(__name__)


class TobiiService:
    """Service for interacting with Tobii eye tracker."""

    def __init__(self):
        self.eyetracker: Optional[tr.EyeTracker] = None
        self.gaze_data: List[GazePoint] = []
        self.is_capturing: bool = False
        self._initialize_eyetracker()

    def _initialize_eyetracker(self) -> None:
        """Initialize connection to Tobii eye tracker."""
        try:
            eyetrackers = tr.find_all_eyetrackers()
            if eyetrackers:
                self.eyetracker = eyetrackers[0]
                logger.info(f"Connected to eye tracker: {self.eyetracker.device_name}")
        except Exception as e:
            logger.error(f"Failed to initialize eye tracker: {e}")

    def is_connected(self) -> bool:
        """Check if eye tracker is connected."""
        return self.eyetracker is not None

    def get_device_info(self) -> Optional[Dict[str, str]]:
        """Get information about connected device."""
        if not self.eyetracker:
            return None

        return {
            "device_name": self.eyetracker.device_name,
            "serial_number": self.eyetracker.serial_number,
            "model": self.eyetracker.model,
            "firmware_version": self.eyetracker.firmware_version,
        }

    def _gaze_data_callback(self, gaze_data: Dict[str, Any]) -> None:
        """Callback function to handle incoming gaze data."""
        try:
            left_gaze = gaze_data.get("left_gaze_point_on_display_area", (None, None))
            right_gaze = gaze_data.get("right_gaze_point_on_display_area", (None, None))

            x_coords = []
            y_coords = []

            if left_gaze[0] is not None:
                x_coords.append(left_gaze[0])
                y_coords.append(left_gaze[1])

            if right_gaze[0] is not None:
                x_coords.append(right_gaze[0])
                y_coords.append(right_gaze[1])

            if x_coords and y_coords:
                avg_x = sum(x_coords) / len(x_coords)
                avg_y = sum(y_coords) / len(y_coords)

                self.gaze_data.append(
                    GazePoint(
                        fixation_x=avg_x,
                        fixation_y=avg_y,
                        timestamp=gaze_data["system_time_stamp"],
                    )
                )
        except Exception as e:
            logger.error(f"Error processing gaze data: {e}")

    def start_capture(self) -> None:
        """Start capturing gaze data."""
        if not self.eyetracker:
            raise RuntimeError("No eye tracker connected")

        if self.is_capturing:
            logger.warning("Already capturing gaze data")
            return

        self.eyetracker.subscribe_to(
            tr.EYETRACKER_GAZE_DATA, self._gaze_data_callback, as_dictionary=True
        )
        self.is_capturing = True
        logger.info("Started gaze data capture")

    def stop_capture(self) -> None:
        """Stop capturing gaze data."""
        if not self.eyetracker:
            raise RuntimeError("No eye tracker connected")

        if not self.is_capturing:
            logger.warning("Not currently capturing gaze data")
            return

        self.eyetracker.unsubscribe_from(
            tr.EYETRACKER_GAZE_DATA, self._gaze_data_callback
        )
        self.is_capturing = False
        logger.info("Stopped gaze data capture")

    def get_gaze_data(self) -> List[Dict[str, Any]]:
        """Get collected gaze data."""
        return [point.dict() for point in self.gaze_data]

    def clear_data(self) -> None:
        """Clear the gaze data buffer."""
        self.gaze_data.clear()
        logger.info("Cleared gaze data buffer")
