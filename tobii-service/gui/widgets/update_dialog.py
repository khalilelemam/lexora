"""Update notification dialog — shows when a new version is available."""

import webbrowser
from pathlib import Path

import customtkinter as ctk

from gui.styles import Styles


class UpdateDialog(ctk.CTkToplevel):
    """Modal dialog that notifies the user about an available update."""

    def __init__(self, parent, update_info, on_update, on_skip):
        super().__init__(parent)
        self.update_info = update_info
        self._on_update = on_update
        self._on_skip = on_skip
        self.result = None

        self.title("Update Available")
        self.geometry("480x320")
        self.resizable(False, False)

        self.transient(parent)
        self.grab_set()

        # Center on parent
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - (480 // 2)
        y = parent.winfo_y() + (parent.winfo_height() // 2) - (320 // 2)
        self.geometry(f"+{x}+{y}")

        icon_path = str(Path(__file__).parent.parent / "assets" / "lexora_eye.ico")
        self.after(250, lambda: self.iconbitmap(icon_path))
        self.after(100, self.lift)

        self._build_ui()

    def _build_ui(self):
        # ── Header bar ──────────────────────────────────────────
        header = ctk.CTkFrame(
            self, fg_color=Styles.BRAND_SAGE, height=60, corner_radius=0
        )
        header.pack(fill="x")
        header.pack_propagate(False)

        header_inner = ctk.CTkFrame(header, fg_color="transparent")
        header_inner.pack(expand=True)

        icon_label = ctk.CTkLabel(
            header_inner,
            text="⬆",
            font=(Styles.FONT_FAMILY, 24),
            text_color="white",
        )
        icon_label.pack(side="left", padx=(0, 12))

        title_label = ctk.CTkLabel(
            header_inner,
            text="Update Available",
            font=(Styles.FONT_FAMILY, 18, "bold"),
            text_color="white",
        )
        title_label.pack(side="left")

        # ── Content ─────────────────────────────────────────────
        content = ctk.CTkFrame(self, fg_color=Styles.BG_COLOR)
        content.pack(fill="both", expand=True)

        # Version info card
        info_card = ctk.CTkFrame(
            content,
            fg_color=Styles.CARD_BG,
            corner_radius=Styles.CORNER_RADIUS,
            border_width=1,
            border_color=Styles.BORDER_COLOR,
        )
        info_card.pack(fill="x", padx=20, pady=(20, 12))

        version_text = (
            f"A new version of Lexora is available!\n\n"
            f"Current version:   v{self.update_info.version.split('→')[0] if '→' in self.update_info.version else 'current'}\n"
            f"New version:        {self.update_info.tag}"
        )

        # Simpler version display
        current_label = ctk.CTkLabel(
            info_card,
            text=f"New version available: {self.update_info.tag}",
            font=(Styles.FONT_FAMILY, 14, "bold"),
            text_color=Styles.TEXT_PRIMARY,
            wraplength=420,
            justify="left",
        )
        current_label.pack(padx=18, pady=(14, 4), anchor="w")

        if self.update_info.name and self.update_info.name != self.update_info.tag:
            name_label = ctk.CTkLabel(
                info_card,
                text=self.update_info.name,
                font=(Styles.FONT_FAMILY, 12),
                text_color=Styles.TEXT_SECONDARY,
                wraplength=420,
                justify="left",
            )
            name_label.pack(padx=18, pady=(0, 4), anchor="w")

        # Truncated release notes
        if self.update_info.body:
            notes = self.update_info.body[:200]
            if len(self.update_info.body) > 200:
                notes += "..."
            notes_label = ctk.CTkLabel(
                info_card,
                text=notes,
                font=(Styles.FONT_FAMILY, 11),
                text_color=Styles.TEXT_MUTED,
                wraplength=420,
                justify="left",
            )
            notes_label.pack(padx=18, pady=(0, 14), anchor="w")
        else:
            # Spacer
            ctk.CTkFrame(info_card, fg_color="transparent", height=10).pack()

        # ── Buttons ─────────────────────────────────────────────
        btn_frame = ctk.CTkFrame(content, fg_color="transparent")
        btn_frame.pack(fill="x", padx=20, pady=(0, 20))

        update_btn = ctk.CTkButton(
            btn_frame,
            text="⬆  Update Now",
            command=self._do_update,
            fg_color=Styles.SUCCESS_COLOR,
            hover_color=Styles.SUCCESS_HOVER,
            font=(Styles.FONT_FAMILY, 13, "bold"),
            text_color="white",
            height=40,
            corner_radius=Styles.CORNER_RADIUS_SM,
        )
        update_btn.pack(side="right", padx=(8, 0))

        view_btn = ctk.CTkButton(
            btn_frame,
            text="View Release",
            command=self._open_release,
            fg_color=Styles.BRAND_OLIVE,
            hover_color=Styles.ACCENT_HOVER,
            font=(Styles.FONT_FAMILY, 13),
            text_color="white",
            height=40,
            corner_radius=Styles.CORNER_RADIUS_SM,
        )
        view_btn.pack(side="right", padx=(8, 0))

        skip_btn = ctk.CTkButton(
            btn_frame,
            text="Later",
            command=self._do_skip,
            fg_color="transparent",
            hover_color=Styles.BORDER_COLOR,
            text_color=Styles.TEXT_MUTED,
            font=(Styles.FONT_FAMILY, 12),
            height=40,
            corner_radius=Styles.CORNER_RADIUS_SM,
            border_width=1,
            border_color=Styles.BORDER_COLOR,
        )
        skip_btn.pack(side="right")

    def _do_update(self):
        self.result = "update"
        self.destroy()
        if self._on_update:
            self._on_update(self.update_info)

    def _open_release(self):
        if self.update_info.html_url:
            webbrowser.open(self.update_info.html_url)

    def _do_skip(self):
        self.result = "skip"
        self.destroy()
        if self._on_skip:
            self._on_skip()

    def get_result(self):
        self.wait_window()
        return self.result
