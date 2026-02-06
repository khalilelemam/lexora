"""Status card widget."""

import customtkinter as ctk

from gui.styles import Styles


class StatusCard:
    def __init__(self, parent):
        self.frame = ctk.CTkFrame(
            parent, fg_color=Styles.CARD_BG_LIGHT, corner_radius=10
        )
        self.frame.pack(fill="both", pady=(0, 20))

        header = ctk.CTkLabel(
            self.frame,
            text="Service Status",
            font=(Styles.FONT_FAMILY, 18, "bold"),
            text_color=Styles.TEXT_PRIMARY,
            anchor="w",
        )
        header.pack(fill="x", padx=25, pady=(20, 15))

        self.service_card = ctk.CTkFrame(
            self.frame,
            fg_color=Styles.CARD_BG,
            corner_radius=8,
        )
        self.service_card.pack(fill="x", padx=25, pady=5)
        self.service_label = self._create_status_content(
            self.service_card, "Service", "● Stopped", Styles.DANGER_COLOR
        )

        self.port_card = ctk.CTkFrame(
            self.frame,
            fg_color=Styles.CARD_BG,
            corner_radius=8,
        )
        self.port_card.pack(fill="x", padx=25, pady=5)
        self.port_label = self._create_status_content(
            self.port_card, "Port", "N/A", Styles.TEXT_MUTED
        )

        self.tracker_card = ctk.CTkFrame(
            self.frame,
            fg_color=Styles.CARD_BG,
            corner_radius=8,
        )
        self.tracker_card.pack(fill="x", padx=25, pady=(5, 20))
        self.tracker_label = self._create_status_content(
            self.tracker_card, "Eye Tracker", "✗ Not Connected", Styles.TEXT_MUTED
        )

    def _create_status_content(self, parent_card, label_text, value_text, value_color):
        row_frame = ctk.CTkFrame(parent_card, fg_color="transparent")
        row_frame.pack(fill="x", padx=18, pady=12)

        label = ctk.CTkLabel(
            row_frame,
            text=f"{label_text}:",
            font=(Styles.FONT_FAMILY, 14),
            text_color=Styles.TEXT_SECONDARY,
            anchor="w",
        )
        label.pack(side="left")

        value_label = ctk.CTkLabel(
            row_frame,
            text=value_text,
            font=(Styles.FONT_FAMILY, 14, "bold"),
            text_color=value_color,
            anchor="e",
        )
        value_label.pack(side="right")

        return value_label

    def update_service_status(self, is_running):
        if is_running:
            self.service_label.configure(
                text="● Running", text_color=Styles.SUCCESS_DARK
            )
            self.service_card.configure(fg_color=Styles.SUCCESS_LIGHT)
        else:
            self.service_label.configure(
                text="● Stopped", text_color=Styles.DANGER_COLOR
            )
            self.service_card.configure(fg_color=Styles.CARD_BG)

    def update_port(self, port):
        if port:
            self.port_label.configure(text=f"{port}", text_color=Styles.INFO_DARK)
            self.port_card.configure(fg_color=Styles.INFO_LIGHT)
        else:
            self.port_label.configure(text="N/A", text_color=Styles.TEXT_MUTED)
            self.port_card.configure(fg_color=Styles.CARD_BG)

    def update_tracker_status(self, is_connected):
        if is_connected:
            self.tracker_label.configure(
                text="✓ Connected", text_color=Styles.SUCCESS_DARK
            )
            self.tracker_card.configure(fg_color=Styles.SUCCESS_LIGHT)
        else:
            self.tracker_label.configure(
                text="✗ Not Connected", text_color=Styles.TEXT_MUTED
            )
            self.tracker_card.configure(fg_color=Styles.CARD_BG)
