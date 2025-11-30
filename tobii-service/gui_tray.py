import multiprocessing
from gui.tray_app import TobiiTrayApp


if __name__ == "__main__":
    multiprocessing.freeze_support()
    app = TobiiTrayApp()
    app.run()
