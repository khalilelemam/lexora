"""Lexora branded header widget."""

from pathlib import Path

import customtkinter as ctk
from PIL import Image

from gui.styles import Styles


class HeaderWidget:
    @staticmethod
    def create(parent):
        frame = ctk.CTkFrame(
            parent, fg_color=Styles.BRAND_OLIVE, height=116, corner_radius=0
        )
        frame.pack(fill="x")
        frame.pack_propagate(False)

        inner = ctk.CTkFrame(frame, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=22, pady=18)

        mark = ctk.CTkFrame(
            inner,
            width=76,
            height=76,
            fg_color=Styles.BRAND_SAGE,
            corner_radius=Styles.CORNER_RADIUS,
            border_width=1,
            border_color=Styles.BRAND_KHAKI,
        )
        mark.pack(side="right")
        mark.pack_propagate(False)

        logo_path = (
            Path(__file__).parent.parent.parent / "assets" / "lexora_eye_logo.png"
        )
        if logo_path.exists():
            logo_img = Image.open(logo_path)
            target_h = 34
            aspect = logo_img.width / logo_img.height
            target_w = int(target_h * aspect)
            logo_img = logo_img.resize((target_w, target_h), Image.LANCZOS)

            logo_ctk = ctk.CTkImage(
                light_image=logo_img,
                dark_image=logo_img,
                size=(target_w, target_h),
            )

            logo_label = ctk.CTkLabel(mark, image=logo_ctk, text="")
            logo_label.pack(expand=True)
            logo_label._logo_ref = logo_ctk

        text_block = ctk.CTkFrame(inner, fg_color="transparent")
        text_block.pack(side="left", fill="both", expand=True)

        brand = ctk.CTkLabel(
            text_block,
            text="LEXORA",
            font=(Styles.FONT_FAMILY, 27, "bold"),
            text_color=Styles.BRAND_CREAM,
            anchor="w",
        )
        brand.pack(anchor="w")

        tagline = ctk.CTkLabel(
            text_block,
            text="LOCAL GAZE STREAM",
            font=(Styles.FONT_FAMILY, 10, "bold"),
            text_color=Styles.BRAND_KHAKI,
            anchor="w",
        )
        tagline.pack(anchor="w", pady=(2, 0))

        subtitle = ctk.CTkLabel(
            text_block,
            text="Tobii service bridge",
            font=(Styles.FONT_FAMILY, 10),
            text_color=Styles.BRAND_CREAM,
            anchor="w",
        )
        subtitle.pack(anchor="w", pady=(12, 0))

        return frame
