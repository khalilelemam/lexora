"""Application configuration."""

from pydantic_settings import BaseSettings
from typing import List
import json
from pathlib import Path


class Settings(BaseSettings):
    """Application settings."""

    HOST: str = "127.0.0.1"
    PORT: int = 3001
    DEBUG: bool = True
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    APP_NAME: str = "Tobii Local Service"
    VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def save_port(self, port: int):
        """Save the current port to config file."""
        config_file = Path("config.json")
        config = {}
        if config_file.exists():
            with open(config_file, 'r') as f:
                config = json.load(f)
        
        config['PORT'] = port
        
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        self.PORT = port
    
    def load_port(self) -> int:
        """Load the saved port from config file."""
        config_file = Path("config.json")
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    port = config.get('PORT', self.PORT)
                    self.PORT = port
                    return port
            except (json.JSONDecodeError, IOError):
                pass
        
        return self.PORT


settings = Settings()
