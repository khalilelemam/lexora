import customtkinter as ctk
from gui.styles import Styles
from pathlib import Path


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
            font=(Styles.FONT_FAMILY, 22, "bold"),
            text_color="white",
        )
        title.pack(expand=True)

        return frame


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


class ConfirmDialog(ctk.CTkToplevel):
    """Custom styled confirmation dialog matching app theme."""

    def __init__(self, parent, title, message, message_type="warning"):
        super().__init__(parent)
        self.result = False

        self.title(title)
        self.geometry("540x340")
        self.resizable(False, False)

        self.transient(parent)
        self.grab_set()

        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - (540 // 2)
        y = parent.winfo_y() + (parent.winfo_height() // 2) - (340 // 2)
        self.geometry(f"+{x}+{y}")

        icon_path = str(Path(__file__).parent.parent / "assets" / "eye.ico")

        # Set icon after a short delay to ensure the window is initialized
        # This is a bug in customtkinter where setting iconbitmap immediately may fail
        self.after(250, lambda: self.iconbitmap(icon_path))
        self.after(100, self.lift)

        header_color = (
            Styles.WARNING_COLOR if message_type == "warning" else Styles.DANGER_COLOR
        )
        header = ctk.CTkFrame(self, fg_color=header_color, height=70, corner_radius=0)
        header.pack(fill="x")
        header.pack_propagate(False)

        icon_text = "⚠" if message_type == "warning" else "ⓘ"
        icon_label = ctk.CTkLabel(
            header,
            text=icon_text,
            font=(Styles.FONT_FAMILY, 36),
            text_color="white",
        )
        icon_label.pack(side="left", padx=20)

        title_label = ctk.CTkLabel(
            header,
            text=title,
            font=(Styles.FONT_FAMILY, 20, "bold"),
            text_color="white",
        )
        title_label.pack(side="left")

        content_frame = ctk.CTkFrame(self, fg_color=Styles.CARD_BG_LIGHT)
        content_frame.pack(fill="both", expand=True)

        message_frame = ctk.CTkFrame(
            content_frame, fg_color=Styles.CARD_BG, corner_radius=10
        )
        message_frame.pack(fill="both", expand=True, padx=20, pady=(20, 15))

        message_label = ctk.CTkLabel(
            message_frame,
            text=message,
            font=(Styles.FONT_FAMILY_MONO, 12),
            text_color=Styles.TEXT_PRIMARY,
            wraplength=480,
            justify="left",
        )
        message_label.pack(padx=20, pady=20)

        button_frame = ctk.CTkFrame(content_frame, fg_color="transparent")
        button_frame.pack(fill="x", padx=20, pady=(0, 20))

        yes_btn = ctk.CTkButton(
            button_frame,
            text="Yes",
            command=self.on_yes,
            fg_color=Styles.SUCCESS_COLOR,
            hover_color=Styles.SUCCESS_HOVER,
            font=(Styles.FONT_FAMILY, 14, "bold"),
            height=45,
            width=150,
        )
        yes_btn.pack(side="right", padx=(10, 0))

        no_btn = ctk.CTkButton(
            button_frame,
            text="No",
            command=self.on_no,
            fg_color=Styles.DANGER_COLOR,
            hover_color=Styles.DANGER_HOVER,
            font=(Styles.FONT_FAMILY, 14, "bold"),
            height=45,
            width=150,
        )
        no_btn.pack(side="right")

    def on_yes(self):
        self.result = True
        self.destroy()

    def on_no(self):
        self.result = False
        self.destroy()

    def get_result(self):
        self.wait_window()
        return self.result
