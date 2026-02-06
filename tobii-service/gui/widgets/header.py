"""Header widget."""

import customtkinter as ctk

from app.config import settings
from gui.styles import Styles


class HeaderWidget:
    @staticmethod
    def create(parent):
        frame = ctk.CTkFrame(
            parent, fg_color=Styles.ACCENT_COLOR, height=80, corner_radius=0
        )
        frame.pack(fill="x")
        frame.pack_propagate(False)

        title = ctk.CTkLabel(
            frame,
            text=settings.APP_NAME,
            font=(Styles.FONT_FAMILY, 22, "bold"),
            text_color="white",
        )
        title.pack(expand=True)

        return frame
