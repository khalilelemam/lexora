import uvicorn
from app.api import create_app
from app.config import settings


def main():
    """Run the Tobii local service."""
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )


app = create_app()


if __name__ == "__main__":
    main()
