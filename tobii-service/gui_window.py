import customtkinter as ctk
import multiprocessing
import threading
import pystray
from pystray import MenuItem as item
from PIL import Image
from pathlib import Path

from gui.service_manager import ServiceManager
from app.services.tobii_service import TobiiService
from gui.widgets import (
    HeaderWidget,
    StatusCard,
    ControlButtons,
    ExitButton,
    ConfirmDialog,
)

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")


class TobiiServiceGUI:
    """Main application window with system tray integration."""

    def __init__(self):
        self.service_manager = ServiceManager()
        self.tobii_service = TobiiService()

        self.root = ctk.CTk()
        self.root.title("Tobii Eye Tracker Service")
        self.root.geometry("600x520")
        self.root.resizable(False, False)

        icon_path = str(Path(__file__).parent / "assets" / "eye.ico")
        self.root.iconbitmap(icon_path)

        self.tray_icon = None
        self.is_minimized_to_tray = False

        self.root.protocol("WM_DELETE_WINDOW", self.on_close_window)
        self.root.bind("<Unmap>", self.on_minimize_event)

        self.create_widgets()
        self.update_status()
        self.setup_tray()

    def create_widgets(self):
        HeaderWidget.create(self.root)

        content_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        content_frame.pack(fill="both", expand=True, padx=25, pady=20)

        self.status_card = StatusCard(content_frame)
        self.control_buttons = ControlButtons(
            content_frame,
            on_start=self.start_service,
            on_stop=self.stop_service,
            on_restart=self.restart_service,
        )
        ExitButton.create(content_frame, on_exit=self.on_exit)

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
        is_available, pid = self.service_manager.check_port_available()

        if not is_available:
            proc_info = self.service_manager.get_process_using_port()
            if proc_info:
                process_name = proc_info["name"]
                process_exe = proc_info["exe"]

                dialog = ConfirmDialog(
                    self.root,
                    "Port Already in Use",
                    f"Port {self.service_manager.current_port} is already being used by:\n\n"
                    f"Process: {process_name}\n"
                    f"PID: {proc_info['pid']}\n"
                    f"Path: {process_exe}\n\n"
                    f"Do you want to kill this process and start the service?",
                    "warning",
                )

                result = dialog.get_result()

                if result:
                    if self.service_manager.kill_process_on_port(proc_info["pid"]):
                        if self.service_manager.start():
                            self.update_status()
                return

        if self.service_manager.start():
            self.update_status()

    def stop_service(self):
        if self.service_manager.stop():
            self.update_status()

    def restart_service(self):
        if self.service_manager.restart():
            self.update_status()

    def on_exit(self):
        """Exit button: Stop service and minimize to tray (tray stays running)."""
        if self.service_manager.is_running():
            self.service_manager.stop()
        self.minimize_to_tray()

    def on_close_window(self):
        """Window X button: Stop service and minimize to tray."""
        if self.service_manager.is_running():
            self.service_manager.stop()
        self.minimize_to_tray()

    def show_window(self):
        """Show the main window from tray."""
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
        self.is_minimized_to_tray = False

    def minimize_to_tray(self):
        """Minimize window to system tray."""
        self.root.withdraw()
        self.is_minimized_to_tray = True

    def on_minimize_event(self, event):
        """Handle minimize button click (- button)."""
        if self.root.state() == "iconic":
            self.minimize_to_tray()
            self.root.after(10, self.root.withdraw)

    def on_tray_exit(self, icon, item):
        """Exit from tray menu: Stop service and quit application completely."""
        if self.service_manager.is_running():
            self.service_manager.stop()
        icon.stop()
        self.root.after(0, self.root.quit)

    def setup_tray(self):
        def run_tray():
            def on_clicked(icon, item):
                self.root.after(0, self.show_window)

            menu = pystray.Menu(
                item("Open", on_clicked, default=True),
                item("Exit", self.on_tray_exit),
            )

            icon_path = Path(__file__).parent / "assets" / "eye.ico"
            icon_image = Image.open(icon_path)
            self.tray_icon = pystray.Icon(
                "tobii_service", icon_image, "Tobii Eye Tracker Service", menu
            )

            self.tray_icon.run()

        tray_thread = threading.Thread(target=run_tray, daemon=True)
        tray_thread.start()

    def run(self, start_minimized=False):
        """Run the application.

        Args:
            start_minimized: If True, start with window hidden (tray only).
        """
        if start_minimized:
            self.root.withdraw()
            self.is_minimized_to_tray = True
        self.root.mainloop()


if __name__ == "__main__":
    import sys

    multiprocessing.freeze_support()

    start_minimized = "--minimized" in sys.argv

    app = TobiiServiceGUI()
    app.run(start_minimized=start_minimized)
