import logging

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _error_body(code: str, message: str, details: list | None = None) -> dict:
    """Build a consistent error envelope."""
    body: dict = {"code": code, "message": message}
    if details:
        body["details"] = details
    return body


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Replace default Pydantic 422 with a clean, consistent response."""
    details = []
    for err in exc.errors():
        loc = err.get("loc", ())
        # Drop the leading "body" segment that FastAPI injects
        field = ".".join(str(part) for part in loc if part != "body")
        details.append({"field": field, "message": err["msg"]})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(
            code="VALIDATION_ERROR",
            message="One or more fields failed validation.",
            details=details,
        ),
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please try again later.",
        ),
    )
