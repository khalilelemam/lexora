import os

import uvicorn


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", "8000")),
        reload=True,
        log_level="info",
    )
