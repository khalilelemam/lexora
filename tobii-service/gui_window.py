import customtkinter as ctk
import multiprocessing

from gui.service_manager import ServiceManager
from app.services.tobii_service import TobiiService
from gui.styles import Styles
from gui.widgets import HeaderWidget, StatusCard, ControlButtons, ExitButton

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")


class TobiiServiceGUI:
    def __init__(self):
        self.service_manager = ServiceManager()
        self.tobii_service = TobiiService()

        self.root = ctk.CTk()
        self.root.title("Tobii Eye Tracker Service")
        self.root.geometry("600x520")
        self.root.resizable(False, False)

        self.create_widgets()
        self.update_status()

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
        if self.service_manager.start():
            self.update_status()

    def stop_service(self):
        if self.service_manager.stop():
            self.update_status()

    def restart_service(self):
        if self.service_manager.restart():
            self.update_status()

    def on_exit(self):
        if self.service_manager.is_running():
            self.service_manager.stop()
        self.root.quit()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    app = TobiiServiceGUI()
    app.run()
