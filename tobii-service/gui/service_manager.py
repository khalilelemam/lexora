import multiprocessing
import logging
import os
import sys
from typing import Optional, Tuple
import uvicorn
import psutil
import socket

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
        self.server_process: Optional[multiprocessing.Process] = None
        self.current_port: int = settings.PORT

    def _run_server(self):
        """Start the uvicorn server.

        Handles two issues that occur in frozen executables (PyInstaller
        with console=False):

        1. sys.stdout and sys.stderr are None — uvicorn's colored formatter
           calls .isatty() on them, raising AttributeError.
        2. uvicorn.run("main:app") uses importlib to resolve the app by
           string, which silently fails in frozen builds.
        """
        # Redirect None streams to OS null device
        devnull = "NUL" if os.name == "nt" else "/dev/null"
        if sys.stdout is None:
            sys.stdout = open(devnull, "w")
        if sys.stderr is None:
            sys.stderr = open(devnull, "w")

        # Import and pass app object directly (string imports fail when frozen)
        from app.api import create_app
        app = create_app()

        log_config = _FROZEN_LOG_CONFIG if getattr(sys, "frozen", False) else None

        uvicorn.run(
            app,
            host=settings.HOST,
            port=settings.PORT,
            log_level="info",
            reload=False,
            log_config=log_config,
        )

    def check_port_available(self) -> Tuple[bool, Optional[int]]:
        """Check if the port is available.

        Returns:
            Tuple of (is_available, process_id_using_port)
        """
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((settings.HOST, settings.PORT))
            sock.close()

            if result == 0:
                # Port is in use, find the process
                for proc in psutil.process_iter(["pid", "name"]):
                    try:
                        for conn in proc.connections():
                            if conn.laddr.port == settings.PORT:
                                return False, proc.pid
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                return False, None
            return True, None
        except Exception as e:
            logger.error(f"Error checking port: {e}")
            return True, None

    def get_process_using_port(self) -> Optional[dict]:
        """Get information about the process using the port.

        Returns:
            Dictionary with process info or None if no process found.
        """
        try:
            for proc in psutil.process_iter(["pid", "name", "exe"]):
                try:
                    for conn in proc.connections():
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
        """Kill the process using the port.

        Args:
            pid: Process ID to kill

        Returns:
            True if process was killed successfully, False otherwise.
        """
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
        """Start the FastAPI server in a separate process.

        Returns:
            True if server started successfully, False otherwise.
        """
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
        """Stop the running FastAPI server.

        Returns:
            True if server stopped successfully, False otherwise.
        """
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
        """Restart the FastAPI server.

        Returns:
            True if server restarted successfully, False otherwise.
        """
        if self.stop():
            return self.start()
        return False

    def is_running(self) -> bool:
        """Check if the server process is currently running."""
        return self.server_process is not None and self.server_process.is_alive()

    def get_port(self) -> Optional[int]:
        """Get the port number the server is running on.

        Returns:
            Port number if server is running, None otherwise.
        """
        return self.current_port if self.is_running() else None
