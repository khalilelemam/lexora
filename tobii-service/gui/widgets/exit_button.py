"""Exit button widget — subtle, secondary-styled."""

import customtkinter as ctk

from gui.styles import Styles


class ExitButton:
    @staticmethod
    def create(parent, on_exit):
        btn = ctk.CTkButton(
            parent,
            text="Minimize to Tray",
            command=on_exit,
            fg_color="transparent",
            hover_color=Styles.BORDER_COLOR,
            text_color=Styles.TEXT_MUTED,
            font=(Styles.FONT_FAMILY, 12),
            height=36,
            corner_radius=Styles.CORNER_RADIUS_SM,
            border_width=1,
            border_color=Styles.BORDER_COLOR,
        )
        btn.pack(fill="x")

        return btn
