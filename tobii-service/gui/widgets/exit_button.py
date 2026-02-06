"""Exit button widget."""

import customtkinter as ctk

from gui.styles import Styles


class ExitButton:
    @staticmethod
    def create(parent, on_exit):
        btn = ctk.CTkButton(
            parent,
            text="Exit Application",
            command=on_exit,
            fg_color=Styles.SECONDARY_COLOR,
            hover_color=Styles.SECONDARY_HOVER,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            height=48,
            corner_radius=8,
        )
        btn.pack(fill="x")

        return btn
