import threading
import time
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as item

from gui.service_manager import ServiceManager
from app.services.tobii_service import TobiiService


class TobiiTrayApp:
    def __init__(self):
        self.service_manager = ServiceManager()
        self.tobii_service = TobiiService()
        self.icon = None

    def create_icon_image(self, color: str = "green") -> Image.Image:
        width, height = 64, 64
        image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        dc = ImageDraw.Draw(image)

        colors = {
            "green": (40, 167, 69),
            "red": (220, 53, 69),
            "gray": (108, 117, 125),
        }

        fill = colors.get(color, colors["gray"])

        dc.ellipse([12, 24, 52, 40], fill=fill, outline=fill)
        dc.ellipse([26, 28, 38, 36], fill=(255, 255, 255), outline=(255, 255, 255))
        dc.ellipse([30, 30, 34, 34], fill=fill, outline=fill)

        return image

    def get_status_text(self, item=None) -> str:
        if not self.service_manager.is_running():
            return "Service: Stopped"

        port = self.service_manager.get_port()
        tracker = "Connected" if self.tobii_service.is_connected() else "Not Connected"
        return f"Port: {port}\nEye Tracker: {tracker}"

    def on_start(self, icon, item):
        if self.service_manager.start():
            port = self.service_manager.get_port()
            icon.notify("Tobii Service Started", f"Running on port {port}")
            self.update_icon()

    def on_stop(self, icon, item):
        if self.service_manager.stop():
            icon.notify("Tobii Service Stopped")
            self.update_icon()

    def on_restart(self, icon, item):
        if self.service_manager.restart():
            port = self.service_manager.get_port()
            icon.notify("Tobii Service Restarted", f"Running on port {port}")
            self.update_icon()

    def on_quit(self, icon, item):
        if self.service_manager.is_running():
            self.service_manager.stop()
        icon.stop()

    def update_icon(self):
        if self.icon:
            color = "green" if self.service_manager.is_running() else "red"
            self.icon.icon = self.create_icon_image(color)

    def create_menu(self):
        return pystray.Menu(
            item(self.get_status_text, lambda: None, enabled=False),
            pystray.Menu.SEPARATOR,
            item(
                "▶ Start Service",
                self.on_start,
                enabled=lambda item: not self.service_manager.is_running(),
            ),
            item(
                "⏹ Stop Service",
                self.on_stop,
                enabled=lambda item: self.service_manager.is_running(),
            ),
            item(
                "🔄 Restart Service",
                self.on_restart,
                enabled=lambda item: self.service_manager.is_running(),
            ),
            pystray.Menu.SEPARATOR,
            item("❌ Exit", self.on_quit),
        )

    def run(self):
        def setup(icon):
            icon.visible = True

        icon_image = self.create_icon_image("red")
        self.icon = pystray.Icon(
            "tobii_service", icon_image, "Tobii Eye Tracker Service", self.create_menu()
        )

        def update_menu():
            while True:
                time.sleep(2)
                if self.icon:
                    self.icon.menu = self.create_menu()
                    self.update_icon()

        update_thread = threading.Thread(target=update_menu, daemon=True)
        update_thread.start()

        self.icon.run(setup=setup)
