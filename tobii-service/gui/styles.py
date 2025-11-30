from tkinter import ttk


class Styles:
    BG_COLOR = "#ffffff"
    CARD_BG = "#ffffff"
    ACCENT_COLOR = "#0d6efd"
    SUCCESS_COLOR = "#1eab3d"
    DANGER_COLOR = "#e53e3e"
    SECONDARY_COLOR = "#6c757d"

    TEXT_PRIMARY = "#1f2937"
    TEXT_SECONDARY = "#6b7280"
    TEXT_MUTED = "#9ca3af"

    FONT_FAMILY = "Segoe UI"
    FONT_SIZE_LARGE = 20
    FONT_SIZE_MEDIUM = 12
    FONT_SIZE_NORMAL = 10

    @staticmethod
    def configure_styles():
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(
            "Accent.TButton",
            background=Styles.ACCENT_COLOR,
            foreground="white",
            borderwidth=0,
            focuscolor="none",
            padding=(15, 12),
            font=(Styles.FONT_FAMILY, Styles.FONT_SIZE_NORMAL, "bold"),
        )

        style.map(
            "Accent.TButton",
            background=[("active", "#0a58ca"), ("disabled", "#cfe2ff")],
            foreground=[("disabled", "#9ec5fe")],
        )

        style.configure(
            "Success.TButton",
            background=Styles.SUCCESS_COLOR,
            foreground="white",
            borderwidth=0,
            focuscolor="none",
            padding=(15, 12),
            font=(Styles.FONT_FAMILY, Styles.FONT_SIZE_NORMAL, "bold"),
        )

        style.map(
            "Success.TButton",
            background=[("active", "#16a34a"), ("disabled", "#d1fae5")],
            foreground=[("disabled", "#86efac")],
        )

        style.configure(
            "Danger.TButton",
            background=Styles.DANGER_COLOR,
            foreground="white",
            borderwidth=0,
            focuscolor="none",
            padding=(15, 12),
            font=(Styles.FONT_FAMILY, Styles.FONT_SIZE_NORMAL, "bold"),
        )

        style.map(
            "Danger.TButton",
            background=[("active", "#c53030"), ("disabled", "#fecaca")],
            foreground=[("disabled", "#fca5a5")],
        )

        style.configure(
            "Card.TLabelframe", background=Styles.CARD_BG, borderwidth=0, relief="flat"
        )

        style.configure(
            "Card.TLabelframe.Label",
            background=Styles.CARD_BG,
            foreground=Styles.TEXT_PRIMARY,
            font=(Styles.FONT_FAMILY, Styles.FONT_SIZE_MEDIUM, "bold"),
        )
