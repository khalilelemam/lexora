"""Confirmation dialog widget."""

from pathlib import Path

import customtkinter as ctk

from gui.styles import Styles


class ConfirmDialog(ctk.CTkToplevel):
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

        icon_path = str(Path(__file__).parent.parent.parent / "assets" / "lexora_eye.ico")

        # Set icon after a short delay to ensure the window is initialized.
        # This is a bug in customtkinter where setting iconbitmap immediately
        # may fail.
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

        content_frame = ctk.CTkFrame(self, fg_color=Styles.BG_COLOR)
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
            command=self._on_yes,
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
            command=self._on_no,
            fg_color=Styles.DANGER_COLOR,
            hover_color=Styles.DANGER_HOVER,
            font=(Styles.FONT_FAMILY, 14, "bold"),
            height=45,
            width=150,
        )
        no_btn.pack(side="right")

    def _on_yes(self):
        self.result = True
        self.destroy()

    def _on_no(self):
        self.result = False
        self.destroy()

    def get_result(self):
        self.wait_window()
        return self.result
