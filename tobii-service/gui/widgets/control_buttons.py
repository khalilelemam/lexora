"""Control buttons widget."""

import customtkinter as ctk

from gui.styles import Styles


class ControlButtons:
    def __init__(self, parent, on_start, on_stop, on_restart):
        self.frame = ctk.CTkFrame(parent, fg_color="transparent")
        self.frame.pack(fill="x", pady=(0, 15))

        self.start_btn = ctk.CTkButton(
            self.frame,
            text="▶  Start Service",
            command=on_start,
            fg_color=Styles.SUCCESS_COLOR,
            hover_color=Styles.SUCCESS_HOVER,
            text_color="white",
            text_color_disabled=Styles.BUTTON_DISABLED,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            height=48,
            corner_radius=8,
        )
        self.start_btn.pack(side="left", padx=(0, 8), expand=True, fill="both")

        self.stop_btn = ctk.CTkButton(
            self.frame,
            text="■  Stop Service",
            command=on_stop,
            fg_color=Styles.DANGER_COLOR,
            hover_color=Styles.DANGER_HOVER,
            text_color="white",
            text_color_disabled=Styles.BUTTON_DISABLED,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            height=48,
            corner_radius=8,
            state="disabled",
        )
        self.stop_btn.pack(side="left", padx=(0, 8), expand=True, fill="both")

        self.restart_btn = ctk.CTkButton(
            self.frame,
            text="↻  Restart Service",
            command=on_restart,
            fg_color=Styles.ACCENT_COLOR,
            hover_color=Styles.ACCENT_HOVER,
            text_color="white",
            text_color_disabled=Styles.BUTTON_DISABLED,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            height=48,
            corner_radius=8,
            state="disabled",
        )
        self.restart_btn.pack(side="left", expand=True, fill="both")

    def update_button_states(self, is_running):
        if is_running:
            self.start_btn.configure(state="disabled")
            self.stop_btn.configure(state="normal")
            self.restart_btn.configure(state="normal")
        else:
            self.start_btn.configure(state="normal")
            self.stop_btn.configure(state="disabled")
            self.restart_btn.configure(state="disabled")
