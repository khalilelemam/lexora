"""Header widget — premium Lexora branded header with logo."""

from pathlib import Path

import customtkinter as ctk
from PIL import Image

from gui.styles import Styles


class HeaderWidget:
    @staticmethod
    def create(parent):
        # ── Outer header bar ────────────────────────────────────
        frame = ctk.CTkFrame(
            parent, fg_color=Styles.BRAND_OLIVE, height=100, corner_radius=0
        )
        frame.pack(fill="x")
        frame.pack_propagate(False)

        # ── Inner centered content ──────────────────────────────
        inner = ctk.CTkFrame(frame, fg_color="transparent")
        inner.pack(expand=True)

        # Load the Lexora eye logo
        logo_path = (
            Path(__file__).parent.parent.parent / "assets" / "lexora_eye_logo.png"
        )
        if logo_path.exists():
            logo_img = Image.open(logo_path)

            # Fit to 44px tall, keep aspect ratio
            target_h = 44
            aspect = logo_img.width / logo_img.height
            target_w = int(target_h * aspect)
            logo_img = logo_img.resize((target_w, target_h), Image.LANCZOS)

            logo_ctk = ctk.CTkImage(
                light_image=logo_img,
                dark_image=logo_img,
                size=(target_w, target_h),
            )

            logo_label = ctk.CTkLabel(inner, image=logo_ctk, text="")
            logo_label.pack(side="left", padx=(0, 14))
            logo_label._logo_ref = logo_ctk

        # ── Text block: brand name + tagline ────────────────────
        text_block = ctk.CTkFrame(inner, fg_color="transparent")
        text_block.pack(side="left")

        brand = ctk.CTkLabel(
            text_block,
            text="LEXORA",
            font=(Styles.FONT_FAMILY, 24, "bold"),
            text_color=Styles.BRAND_CREAM,
            anchor="w",
        )
        brand.pack(anchor="w")

        tagline = ctk.CTkLabel(
            text_block,
            text="E Y E   T R A C K E R   S E R V I C E",
            font=(Styles.FONT_FAMILY, 9),
            text_color=Styles.BRAND_SAGE,
            anchor="w",
        )
        tagline.pack(anchor="w", pady=(0, 0))

        return frame
