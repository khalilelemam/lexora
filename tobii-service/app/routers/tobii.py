"""Tobii eye tracker endpoints."""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Any
import asyncio

from app.services.tobii_service import TobiiService

logger = logging.getLogger(__name__)

router = APIRouter()
tobii_service = TobiiService()


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Check if Tobii eye tracker is connected."""
    try:
        is_connected = tobii_service.is_connected()
        device_info = tobii_service.get_device_info() if is_connected else None

        return {"connected": is_connected, "device": device_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/gaze")
async def gaze_websocket(websocket: WebSocket):
    """WebSocket endpoint for capturing gaze data from Tobii eye tracker."""
    await websocket.accept()
    
    try:
        tobii_service.start_capture()
        
        while True:
            gaze_points = tobii_service.get_gaze_data()
            
            if gaze_points:
                await websocket.send_json(gaze_points)
                tobii_service.clear_data()
            
            await asyncio.sleep(0.05)
            
    except WebSocketDisconnect:
        tobii_service.stop_capture()
        logger.info("WebSocket disconnected")
    except Exception as e:
        tobii_service.stop_capture()
        logger.error(f"Error in WebSocket: {e}")
        await websocket.close()
