"""Service manager for controlling the FastAPI server."""

import multiprocessing
import logging
import socket
from typing import Optional
import uvicorn

from app.config import settings

logger = logging.getLogger(__name__)


class ServiceManager:
    """Manages the FastAPI server lifecycle."""

    def __init__(self):
        self.server_process: Optional[multiprocessing.Process] = None
        self.current_port: Optional[int] = settings.load_port()

    @staticmethod
    def find_free_port(start_port: int = 3001, max_attempts: int = 10) -> Optional[int]:
        """Find an available port starting from start_port."""
        for port in range(start_port, start_port + max_attempts):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(("127.0.0.1", port))
                    return port
            except OSError:
                continue
        return None

    def _run_server(self, port: int):
        """Run the FastAPI server in a separate process."""
        uvicorn.run(
            "main:app",
            host=settings.HOST,
            port=port,
            log_level="info",
            reload=False,
        )

    def start(self, port: Optional[int] = None) -> bool:
        """Start the service on the specified port or auto-detect."""
        if self.is_running():
            logger.warning("Service is already running")
            return False

        target_port = port or self.find_free_port(settings.PORT)
        
        if not target_port:
            logger.error("No available ports found")
            return False

        try:
            self.server_process = multiprocessing.Process(
                target=self._run_server,
                args=(target_port,),
                daemon=True
            )
            self.server_process.start()
            self.current_port = target_port
            settings.save_port(target_port)
            logger.info(f"Service started on port {target_port}")
            return True
        except Exception as e:
            logger.error(f"Failed to start service: {e}")
            return False

    def stop(self) -> bool:
        """Stop the running service."""
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
        """Restart the service."""
        port = self.current_port
        if self.stop():
            return self.start(port)
        return False

    def is_running(self) -> bool:
        """Check if the service is currently running."""
        return self.server_process is not None and self.server_process.is_alive()

    def get_port(self) -> Optional[int]:
        """Get the current port the service is running on."""
        return self.current_port if self.is_running() else None
