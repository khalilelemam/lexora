import logging
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["debug"], prefix="/debug")


class DebugLog(BaseModel):
    """Frontend debug log message"""
    title: str
    data: dict | list | str


@router.post("/log")
async def log_debug_message(log: DebugLog):
    """
    Receive debug logs from the frontend and print them to terminal.
    
    This allows frontend console.log() output to appear in the server terminal.
    """
    logger.info(f"[FRONTEND] {log.title}")
    if isinstance(log.data, dict):
        for key, value in log.data.items():
            logger.info(f"  {key}: {value}")
    elif isinstance(log.data, list):
        logger.info(f"  {log.data}")
    else:
        logger.info(f"  {log.data}")
    
    return {"status": "logged"}
