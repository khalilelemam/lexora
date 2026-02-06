import logging
import multiprocessing
import os
import socket
import sys

import psutil
import uvicorn

from app.config import settings

logger = logging.getLogger(__name__)

# Plain-text log config for frozen executables (PyInstaller with console=False).
# Uvicorn's default formatter calls sys.stderr.isatty() which fails when
# stdout/stderr are None.
_FROZEN_LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(levelname)s: %(message)s",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
    },
    "loggers": {
        "uvicorn": {"handlers": ["default"], "level": "INFO"},
        "uvicorn.error": {"level": "INFO"},
        "uvicorn.access": {"handlers": ["default"], "level": "INFO"},
    },
}


class ServiceManager:
    """Manages the FastAPI server lifecycle on fixed port."""

    def __init__(self):
        self.server_process: multiprocessing.Process | None = None
        self.current_port: int = settings.PORT

    def _run_server(self):
        """Start the uvicorn server.

        Handles three issues that occur in frozen executables (PyInstaller
        with console=False):

        1. sys.stdout and sys.stderr are None — uvicorn's colored formatter
           calls .isatty() on them, raising AttributeError, so we redirect
           these streams to the OS null device.
        2. uvicorn.run("main:app") uses importlib to resolve the app by
           string, which silently fails in frozen builds — so we pass the
           app object directly.
        3. uvicorn's default color formatter requires a real TTY, so we
           use a plain-text log configuration when running frozen.
        """
        # Redirect None streams to OS null device.
        # These file handles are intentionally kept open for the lifetime
        # of the process — closing them would re-expose the None-stream
        # crash.  The OS reclaims them on exit.
        if sys.stdout is None:
            sys.stdout = open(os.devnull, "w")
        if sys.stderr is None:
            sys.stderr = open(os.devnull, "w")

        # Import and pass app object directly (string imports fail when frozen).
        # This import MUST stay inside _run_server — it runs in a child
        # process spawned by multiprocessing.
        from app.api import create_app

        try:
            app = create_app()
        except Exception:
            logger.exception("Failed to initialize FastAPI application")
            raise

        log_config = _FROZEN_LOG_CONFIG if getattr(sys, "frozen", False) else None

        uvicorn.run(
            app,
            host=settings.HOST,
            port=settings.PORT,
            log_level="info",
            reload=False,
            log_config=log_config,
        )

    def check_port_available(self) -> tuple[bool, int | None]:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((settings.HOST, settings.PORT))
            sock.close()

            if result == 0:
                # Port is in use, find the process
                for proc in psutil.process_iter(["pid", "name"]):
                    try:
                        for conn in proc.net_connections():
                            if conn.laddr.port == settings.PORT:
                                return False, proc.pid
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                return False, None
            return True, None
        except Exception as e:
            logger.error(f"Error checking port: {e}")
            return True, None

    def get_process_using_port(self) -> dict | None:
        try:
            for proc in psutil.process_iter(["pid", "name", "exe"]):
                try:
                    for conn in proc.net_connections():
                        if conn.laddr.port == settings.PORT:
                            return {
                                "pid": proc.pid,
                                "name": proc.name(),
                                "exe": proc.exe() if proc.exe() else "Unknown",
                            }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            return None
        except Exception as e:
            logger.error(f"Error getting process info: {e}")
            return None

    def kill_process_on_port(self, pid: int) -> bool:
        try:
            proc = psutil.Process(pid)
            proc.terminate()
            proc.wait(timeout=5)
            logger.info(f"Killed process {pid} using port {settings.PORT}")
            return True
        except psutil.TimeoutExpired:
            try:
                proc.kill()
                logger.info(f"Force killed process {pid} using port {settings.PORT}")
                return True
            except Exception as e:
                logger.error(f"Failed to force kill process {pid}: {e}")
                return False
        except Exception as e:
            logger.error(f"Failed to kill process {pid}: {e}")
            return False

    def start(self) -> bool:
        if self.is_running():
            logger.warning("Service is already running")
            return False

        try:
            self.server_process = multiprocessing.Process(
                target=self._run_server, daemon=True
            )
            self.server_process.start()
            logger.info(f"Service started on port {settings.PORT}")
            return True
        except Exception as e:
            logger.error(f"Failed to start service: {e}")
            return False

    def stop(self) -> bool:
        if not self.is_running():
            logger.warning("Service is not running")
            return False

        try:
            self.server_process.terminate()
            self.server_process.join(timeout=5)

            if self.server_process.is_alive():
                self.server_process.kill()
                self.server_process.join()

            self.server_process = None
            logger.info("Service stopped")
            return True
        except Exception as e:
            logger.error(f"Failed to stop service: {e}")
            return False

    def restart(self) -> bool:
        if self.stop():
            return self.start()
        return False

    def is_running(self) -> bool:
        return self.server_process is not None and self.server_process.is_alive()

    def get_port(self) -> int | None:
        return self.current_port if self.is_running() else None
