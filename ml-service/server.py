import os

# TF_CPP_MIN_LOG_LEVEL: 0=all, 1=no INFO, 2=no INFO/WARNING, 3=no INFO/WARNING/ERROR
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "1"

import uvicorn
from app.config import settings


if __name__ == "__main__":
    uvicorn.run(
        "app.api:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
