"""Status card widget — premium design with indicator dots and clean layout."""

import customtkinter as ctk

from gui.styles import Styles


class StatusCard:
    def __init__(self, parent):
        # ── Outer container with subtle border ──────────────────
        self.frame = ctk.CTkFrame(
            parent,
            fg_color=Styles.CARD_BG,
            corner_radius=Styles.CORNER_RADIUS,
            border_width=1,
            border_color=Styles.BORDER_COLOR,
        )
        self.frame.pack(fill="both", pady=(0, 16))

        # ── Section header ──────────────────────────────────────
        header_frame = ctk.CTkFrame(self.frame, fg_color="transparent")
        header_frame.pack(fill="x", padx=22, pady=(18, 4))

        header = ctk.CTkLabel(
            header_frame,
            text="Service Status",
            font=(Styles.FONT_FAMILY, 16, "bold"),
            text_color=Styles.TEXT_PRIMARY,
            anchor="w",
        )
        header.pack(side="left")

        # Subtle "LIVE" badge
        self.live_badge = ctk.CTkLabel(
            header_frame,
            text="",
            font=(Styles.FONT_FAMILY, 9, "bold"),
            text_color=Styles.TEXT_MUTED,
            anchor="e",
        )
        self.live_badge.pack(side="right")

        # ── Divider ────────────────────────────────────────────
        divider = ctk.CTkFrame(
            self.frame, fg_color=Styles.DIVIDER_COLOR, height=1
        )
        divider.pack(fill="x", padx=22, pady=(8, 4))

        # ── Status rows ────────────────────────────────────────
        self.service_row, self.service_dot, self.service_label = (
            self._create_status_row(self.frame, "Service", "Stopped", "stopped")
        )
        self.port_row, self.port_dot, self.port_label = (
            self._create_status_row(self.frame, "Port", "—", "idle")
        )
        self.tracker_row, self.tracker_dot, self.tracker_label = (
            self._create_status_row(self.frame, "Eye Tracker", "Not Connected", "idle", last=True)
        )

    def _create_status_row(self, parent, label_text, value_text, state, last=False):
        """Create a status row with an indicator dot."""
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=22, pady=(10, 14 if last else 4))

        # Left side: dot + label
        left = ctk.CTkFrame(row, fg_color="transparent")
        left.pack(side="left")

        dot_color = {
            "active": Styles.SUCCESS_COLOR,
            "stopped": Styles.DANGER_COLOR,
            "idle": Styles.TEXT_MUTED,
        }.get(state, Styles.TEXT_MUTED)

        dot = ctk.CTkLabel(
            left,
            text="●",
            font=(Styles.FONT_FAMILY, 11),
            text_color=dot_color,
            width=16,
        )
        dot.pack(side="left", padx=(0, 8))

        label = ctk.CTkLabel(
            left,
            text=label_text,
            font=(Styles.FONT_FAMILY, 13),
            text_color=Styles.TEXT_SECONDARY,
        )
        label.pack(side="left")

        # Right side: value
        value = ctk.CTkLabel(
            row,
            text=value_text,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            text_color=Styles.TEXT_PRIMARY,
            anchor="e",
        )
        value.pack(side="right")

        return row, dot, value

    def update_service_status(self, is_running):
        if is_running:
            self.service_label.configure(text="Running", text_color=Styles.SUCCESS_COLOR)
            self.service_dot.configure(text_color=Styles.SUCCESS_COLOR)
            self.live_badge.configure(text="● LIVE", text_color=Styles.SUCCESS_COLOR)
        else:
            self.service_label.configure(text="Stopped", text_color=Styles.DANGER_COLOR)
            self.service_dot.configure(text_color=Styles.DANGER_COLOR)
            self.live_badge.configure(text="", text_color=Styles.TEXT_MUTED)

    def update_port(self, port):
        if port:
            self.port_label.configure(text=f":{port}", text_color=Styles.BRAND_OLIVE)
            self.port_dot.configure(text_color=Styles.BRAND_SAGE)
        else:
            self.port_label.configure(text="—", text_color=Styles.TEXT_MUTED)
            self.port_dot.configure(text_color=Styles.TEXT_MUTED)

    def update_tracker_status(self, is_connected):
        if is_connected:
            self.tracker_label.configure(text="Connected", text_color=Styles.SUCCESS_COLOR)
            self.tracker_dot.configure(text_color=Styles.SUCCESS_COLOR)
        else:
            self.tracker_label.configure(text="Not Connected", text_color=Styles.TEXT_MUTED)
            self.tracker_dot.configure(text_color=Styles.TEXT_MUTED)
