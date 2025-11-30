import customtkinter as ctk
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
            text="Tobii Eye Tracker Service",
            font=("Segoe UI", 22, "bold"),
            text_color="white",
        )
        title.pack(expand=True)

        return frame


class StatusCard:
    def __init__(self, parent):
        self.frame = ctk.CTkFrame(parent, fg_color="#f8f9fa", corner_radius=10)
        self.frame.pack(fill="both", pady=(0, 20))

        header = ctk.CTkLabel(
            self.frame,
            text="Service Status",
            font=("Segoe UI", 18, "bold"),
            text_color=Styles.TEXT_PRIMARY,
            anchor="w",
        )
        header.pack(fill="x", padx=25, pady=(20, 15))

        # Store the card frames so we can update their colors
        self.service_card = ctk.CTkFrame(
            self.frame,
            fg_color="white",
            corner_radius=8,
        )
        self.service_card.pack(fill="x", padx=25, pady=5)
        self.service_label = self._create_status_content(
            self.service_card, "Service", "● Stopped", Styles.DANGER_COLOR
        )

        self.port_card = ctk.CTkFrame(
            self.frame,
            fg_color="white",
            corner_radius=8,
        )
        self.port_card.pack(fill="x", padx=25, pady=5)
        self.port_label = self._create_status_content(
            self.port_card, "Port", "N/A", Styles.TEXT_MUTED
        )

        self.tracker_card = ctk.CTkFrame(
            self.frame,
            fg_color="white",
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
            font=("Segoe UI", 14),
            text_color=Styles.TEXT_SECONDARY,
            anchor="w",
        )
        label.pack(side="left")

        value_label = ctk.CTkLabel(
            row_frame,
            text=value_text,
            font=("Segoe UI", 14, "bold"),
            text_color=value_color,
            anchor="e",
        )
        value_label.pack(side="right")

        return value_label

    def update_service_status(self, is_running):
        if is_running:
            self.service_label.configure(text="● Running", text_color="#059669")
            self.service_card.configure(fg_color="#a7f3d0")  # Strong green
        else:
            self.service_label.configure(
                text="● Stopped", text_color=Styles.DANGER_COLOR
            )
            self.service_card.configure(fg_color="white")

    def update_port(self, port):
        if port:
            self.port_label.configure(text=f"{port}", text_color="#1e40af")
            self.port_card.configure(fg_color="#bfdbfe")  # Strong blue
        else:
            self.port_label.configure(text="N/A", text_color=Styles.TEXT_MUTED)
            self.port_card.configure(fg_color="white")

    def update_tracker_status(self, is_connected):
        if is_connected:
            self.tracker_label.configure(text="✓ Connected", text_color="#059669")
            self.tracker_card.configure(fg_color="#a7f3d0")  # Strong green
        else:
            self.tracker_label.configure(
                text="✗ Not Connected", text_color=Styles.TEXT_MUTED
            )
            self.tracker_card.configure(fg_color="white")


class ControlButtons:
    def __init__(self, parent, on_start, on_stop, on_restart):
        self.frame = ctk.CTkFrame(parent, fg_color="transparent")
        self.frame.pack(fill="x", pady=(0, 15))

        self.start_btn = ctk.CTkButton(
            self.frame,
            text="▶  Start Service",
            command=on_start,
            fg_color=Styles.SUCCESS_COLOR,
            hover_color="#16a34a",
            text_color="white",
            text_color_disabled="#94a3b8",
            font=("Segoe UI", 13, "bold"),
            height=48,
            corner_radius=8,
        )
        self.start_btn.pack(side="left", padx=(0, 8), expand=True, fill="both")

        self.stop_btn = ctk.CTkButton(
            self.frame,
            text="■  Stop Service",
            command=on_stop,
            fg_color=Styles.DANGER_COLOR,
            hover_color="#c53030",
            text_color="white",
            text_color_disabled="#94a3b8",
            font=("Segoe UI", 13, "bold"),
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
            hover_color="#0a58ca",
            text_color="white",
            text_color_disabled="#94a3b8",
            font=("Segoe UI", 13, "bold"),
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


class ExitButton:
    @staticmethod
    def create(parent, on_exit):
        btn = ctk.CTkButton(
            parent,
            text="Exit Application",
            command=on_exit,
            fg_color=Styles.SECONDARY_COLOR,
            hover_color="#5a6268",
            font=("Segoe UI", 13, "bold"),
            height=48,
            corner_radius=8,
        )
        btn.pack(fill="x")

        return btn
