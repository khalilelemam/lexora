"""Control buttons widget — premium styled action buttons."""

import customtkinter as ctk

from gui.styles import Styles


class ControlButtons:
    def __init__(self, parent, on_start, on_stop, on_restart):
        self.frame = ctk.CTkFrame(parent, fg_color="transparent")
        self.frame.pack(fill="x", pady=(0, 12))

        # Use grid for even distribution
        self.frame.columnconfigure((0, 1, 2), weight=1)

        self.start_btn = ctk.CTkButton(
            self.frame,
            text="▶  Start",
            command=on_start,
            fg_color=Styles.SUCCESS_COLOR,
            hover_color=Styles.SUCCESS_HOVER,
            text_color="white",
            text_color_disabled=Styles.BUTTON_DISABLED,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            height=44,
            corner_radius=Styles.CORNER_RADIUS_SM,
            border_width=0,
        )
        self.start_btn.grid(row=0, column=0, padx=(0, 5), sticky="ew")

        self.stop_btn = ctk.CTkButton(
            self.frame,
            text="■  Stop",
            command=on_stop,
            fg_color=Styles.DANGER_COLOR,
            hover_color=Styles.DANGER_HOVER,
            text_color="white",
            text_color_disabled=Styles.BUTTON_DISABLED,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            height=44,
            corner_radius=Styles.CORNER_RADIUS_SM,
            border_width=0,
            state="disabled",
        )
        self.stop_btn.grid(row=0, column=1, padx=5, sticky="ew")

        self.restart_btn = ctk.CTkButton(
            self.frame,
            text="↻  Restart",
            command=on_restart,
            fg_color=Styles.BRAND_OLIVE,
            hover_color=Styles.ACCENT_HOVER,
            text_color="white",
            text_color_disabled=Styles.BUTTON_DISABLED,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            height=44,
            corner_radius=Styles.CORNER_RADIUS_SM,
            border_width=0,
            state="disabled",
        )
        self.restart_btn.grid(row=0, column=2, padx=(5, 0), sticky="ew")

    def update_button_states(self, is_running):
        if is_running:
            self.start_btn.configure(state="disabled")
            self.stop_btn.configure(state="normal")
            self.restart_btn.configure(state="normal")
        else:
            self.start_btn.configure(state="normal")
            self.stop_btn.configure(state="disabled")
            self.restart_btn.configure(state="disabled")
