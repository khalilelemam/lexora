"""Preview the Lexora GUI design without needing Tobii hardware.

Run with:
    python test_gui_design.py
"""

import multiprocessing
import sys
from pathlib import Path
from unittest.mock import MagicMock

# ── Mock the tobii_research module before anything imports it ────────
sys.modules["tobii_research"] = MagicMock()

import customtkinter as ctk

from app.config import settings
from gui.styles import Styles
from gui.widgets import (
    ControlButtons,
    ExitButton,
    HeaderWidget,
    StatusCard,
)

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("green")


class MockServiceManager:
    """Pretends the service is stopped so we can preview the UI."""

    def __init__(self):
        self.current_port = settings.PORT
        self._running = False

    def is_running(self):
        return self._running

    def get_port(self):
        return self.current_port if self._running else None

    def start(self):
        self._running = True
        return True

    def stop(self):
        self._running = False
        return True

    def restart(self):
        self.stop()
        return self.start()


class MockTobiiService:
    def is_connected(self):
        return False


class DesignPreviewGUI:
    """Preview-only version of the Lexora GUI."""

    def __init__(self):
        self.service_manager = MockServiceManager()
        self.tobii_service = MockTobiiService()

        self.root = ctk.CTk()
        self.root.title(f"{settings.APP_NAME} — Design Preview")
        self.root.geometry("600x540")
        self.root.resizable(False, False)
        self.root.configure(fg_color=Styles.BG_COLOR)

        icon_path = str(Path(__file__).parent / "assets" / "lexora_eye.ico")
        try:
            self.root.iconbitmap(icon_path)
        except Exception:
            pass

        self.create_widgets()
        self.update_status()

    def create_widgets(self):
        HeaderWidget.create(self.root)

        content_frame = ctk.CTkFrame(self.root, fg_color=Styles.BG_COLOR)
        content_frame.pack(fill="both", expand=True, padx=28, pady=(24, 12))

        self.status_card = StatusCard(content_frame)
        self.control_buttons = ControlButtons(
            content_frame,
            on_start=self.start_service,
            on_stop=self.stop_service,
            on_restart=self.restart_service,
        )
        ExitButton.create(content_frame, on_exit=self.on_exit)

        # ── Version footer ──────────────────────────────────────
        footer = ctk.CTkLabel(
            self.root,
            text=f"v{settings.VERSION}  ·  {settings.HOST}:{settings.PORT}",
            font=(Styles.FONT_FAMILY, 10),
            text_color=Styles.TEXT_MUTED,
        )
        footer.pack(pady=(0, 10))

    def update_status(self):
        is_running = self.service_manager.is_running()
        port = self.service_manager.get_port()
        tracker_connected = self.tobii_service.is_connected()

        self.status_card.update_service_status(is_running)
        self.status_card.update_port(port)
        self.status_card.update_tracker_status(tracker_connected)
        self.control_buttons.update_button_states(is_running)

        self.root.after(2000, self.update_status)

    def start_service(self):
        self.service_manager.start()
        self.update_status()

    def stop_service(self):
        self.service_manager.stop()
        self.update_status()

    def restart_service(self):
        self.service_manager.restart()
        self.update_status()

    def on_exit(self):
        self.root.quit()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    app = DesignPreviewGUI()
    app.run()
