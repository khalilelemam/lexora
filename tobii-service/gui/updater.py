"""Auto-updater that checks GitHub Releases for new versions.

Checks https://api.github.com/repos/{OWNER}/{REPO}/releases/latest
and compares the tag against the current app version.
"""

import logging
import os
import platform
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from typing import Optional
from urllib import request, error
import json

from app.config import settings

logger = logging.getLogger(__name__)

# ── Configuration ───────────────────────────────────────────────────
GITHUB_OWNER = "khalilelemam"
GITHUB_REPO = "lexora"
RELEASES_API = (
    f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"
)
CHECK_INTERVAL_MS = 60 * 60 * 1000  # Check every 60 minutes


class UpdateInfo:
    """Holds information about an available update."""

    def __init__(
        self,
        tag: str,
        version: str,
        name: str,
        body: str,
        download_url: str,
        html_url: str,
    ):
        self.tag = tag
        self.version = version
        self.name = name
        self.body = body
        self.download_url = download_url
        self.html_url = html_url


class UpdateChecker:
    """Checks GitHub Releases for newer versions of the application."""

    def __init__(self):
        self.current_version = settings.VERSION
        self._github_token = settings.GITHUB_TOKEN
        self._latest_update: Optional[UpdateInfo] = None
        self._checking = False
        self._on_update_available = None
        self._on_update_downloaded = None
        self._on_error = None

    def _get_auth_headers(self) -> dict:
        """Return auth headers if a GitHub token is configured (for private repos)."""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": f"Lexora-Updater/{self.current_version}",
        }
        if self._github_token:
            headers["Authorization"] = f"Bearer {self._github_token}"
        return headers

    def set_callbacks(
        self,
        on_update_available=None,
        on_update_downloaded=None,
        on_error=None,
    ):
        """Set callback functions for update events."""
        self._on_update_available = on_update_available
        self._on_update_downloaded = on_update_downloaded
        self._on_error = on_error

    @staticmethod
    def _parse_version(version_str: str) -> tuple:
        """Parse 'v1.2.3' or '1.2.3' into (1, 2, 3)."""
        clean = version_str.lstrip("vV").strip()
        parts = []
        for p in clean.split("."):
            try:
                parts.append(int(p))
            except ValueError:
                parts.append(0)
        return tuple(parts)

    def _is_newer(self, remote_version: str) -> bool:
        """Return True if remote_version is newer than current."""
        return self._parse_version(remote_version) > self._parse_version(
            self.current_version
        )

    def _get_asset_name_pattern(self) -> str:
        """Determine which release asset to download for this platform."""
        system = platform.system().lower()
        if system == "windows":
            return "windows"
        elif system == "darwin":
            return "macos"
        else:
            return "linux"

    def check_now(self) -> Optional[UpdateInfo]:
        """Synchronously check for updates. Returns UpdateInfo or None."""
        try:
            req = request.Request(
                RELEASES_API,
                headers=self._get_auth_headers(),
            )
            with request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            tag = data.get("tag_name", "")
            if not self._is_newer(tag):
                logger.info(
                    f"Up to date (current={self.current_version}, latest={tag})"
                )
                return None

            # Find the right asset for this platform
            platform_key = self._get_asset_name_pattern()
            download_url = ""
            for asset in data.get("assets", []):
                name_lower = asset["name"].lower()
                if platform_key in name_lower:
                    # For private repos, use the API URL with Accept header for binary
                    if self._github_token:
                        download_url = asset["url"]  # api.github.com URL
                    else:
                        download_url = asset["browser_download_url"]
                    break

            # Fallback to the release page if no matching asset
            if not download_url:
                download_url = data.get("html_url", "")

            update = UpdateInfo(
                tag=tag,
                version=tag.lstrip("vV"),
                name=data.get("name", tag),
                body=data.get("body", ""),
                download_url=download_url,
                html_url=data.get("html_url", ""),
            )

            self._latest_update = update
            logger.info(f"Update available: {tag} (download: {download_url})")
            return update

        except error.URLError as e:
            logger.warning(f"Network error checking for updates: {e}")
            return None
        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return None

    def check_async(self):
        """Check for updates in a background thread."""
        if self._checking:
            return

        def _worker():
            self._checking = True
            try:
                update = self.check_now()
                if update and self._on_update_available:
                    self._on_update_available(update)
            except Exception as e:
                logger.error(f"Async update check failed: {e}")
                if self._on_error:
                    self._on_error(str(e))
            finally:
                self._checking = False

        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()

    def download_update(self, update: UpdateInfo, on_progress=None) -> Optional[Path]:
        """Download the update asset to a temp directory.

        Returns the path to the downloaded file, or None on failure.
        """
        if not update.download_url or "github.com" not in update.download_url:
            return None

        try:
            headers = {"User-Agent": f"Lexora-Updater/{self.current_version}"}
            if self._github_token:
                headers["Authorization"] = f"Bearer {self._github_token}"
                headers["Accept"] = (
                    "application/octet-stream"  # Required for private repo asset downloads
                )

            req = request.Request(
                update.download_url,
                headers=headers,
            )

            # Derive filename from URL
            filename = update.download_url.split("/")[-1]
            download_dir = Path(tempfile.gettempdir()) / "lexora_updates"
            download_dir.mkdir(exist_ok=True)
            dest = download_dir / filename

            logger.info(f"Downloading update to {dest}")

            with request.urlopen(req, timeout=120) as resp:
                total = int(resp.headers.get("Content-Length", 0))
                downloaded = 0
                chunk_size = 64 * 1024

                with open(dest, "wb") as f:
                    while True:
                        chunk = resp.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if on_progress and total > 0:
                            on_progress(downloaded / total)

            logger.info(f"Download complete: {dest}")

            if self._on_update_downloaded:
                self._on_update_downloaded(dest)

            return dest

        except Exception as e:
            logger.error(f"Failed to download update: {e}")
            if self._on_error:
                self._on_error(str(e))
            return None

    def download_and_install(self, update: UpdateInfo, on_progress=None):
        """Download the update in background, then launch the installer."""

        def _worker():
            dest = self.download_update(update, on_progress=on_progress)
            if dest:
                self._launch_installer(dest)

        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()

    @staticmethod
    def _launch_installer(file_path: Path):
        """Launch the downloaded installer/executable."""
        system = platform.system().lower()
        path_str = str(file_path)

        try:
            if system == "windows":
                os.startfile(path_str)
            elif system == "darwin":
                subprocess.Popen(["open", path_str])
            else:
                subprocess.Popen(["xdg-open", path_str])
            logger.info(f"Launched installer: {path_str}")
        except Exception as e:
            logger.error(f"Failed to launch installer: {e}")

    @property
    def latest_update(self) -> Optional[UpdateInfo]:
        return self._latest_update
