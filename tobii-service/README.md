# Tobii Eye Tracker Service

Local Windows desktop application that captures eye tracking data from Tobii hardware and exposes it via WebSocket API.

## Features

- **System Tray Integration** - Runs in background, left-click tray to open window
- **Fixed Port (28980)** - No discovery needed, simple connection
- **Port Conflict Resolution** - Automatically detects and offers to kill conflicting processes
- **Real-time Status** - Service status, port info, and eye tracker connection
- **Modern GUI** - CustomTkinter-based interface with clean design
- **WebSocket API** - Real-time gaze data streaming
- **CORS Enabled** - Ready for web integration

## Quick Start

1. Create virtual environment and install dependencies:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run the application:
```powershell
python gui_window.py
```

3. Use the GUI to:
   - Start/Stop the service
   - Monitor eye tracker status
   - View current port (28980)

### Auto-Start (Minimized to Tray)

```powershell
python gui_window.py --minimized
```

## Application Behavior

| Action | Behavior |
|--------|----------|
| **Left-click tray** | Opens main window |
| **Right-click tray** | Shows menu (Open, Exit) |
| **Minimize button (-)** | Hides to tray, service keeps running |
| **Close button (X)** | Stops service, hides to tray |
| **Exit button** | Stops service, hides to tray |
| **Tray → Exit** | Stops service, quits application |

## API Endpoints

### Health Check
```
GET http://localhost:28980/tobii/status
```

Response:
```json
{
  "connected": true,
  "device": {
    "model": "Tobii Eye Tracker 5",
    "serial_number": "..."
  }
}
```

### Gaze Data Stream (WebSocket)
```
ws://localhost:28980/tobii/gaze
```

Data format:
```json
{
  "timestamp": 1234567890.123,
  "left_gaze": {"x": 0.5, "y": 0.5},
  "right_gaze": {"x": 0.5, "y": 0.5}
}
```

## Web Integration

Example Next.js integration:

```typescript
const ws = new WebSocket('ws://localhost:28980/tobii/gaze');

ws.onopen = () => console.log('Connected to Tobii service');

ws.onmessage = (event) => {
  const gazeData = JSON.parse(event.data);
  // Process gaze data
};

ws.onerror = (error) => console.error('WebSocket error:', error);
```

**Important:** Add your production domain to `ALLOWED_ORIGINS` in `app/config.py`:

```python
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "https://yourapp.com"
]
```

## File Structure

```
tobii-service/
├── gui_window.py              # Main application entry point
├── main.py                    # FastAPI server entry
├── requirements.txt           # Python dependencies
├── config.json               # Runtime configuration
├── app/
│   ├── api.py                # FastAPI application
│   ├── config.py             # Settings and environment
│   ├── routers/
│   │   └── tobii.py          # Eye tracker endpoints
│   └── services/
│       └── tobii_service.py  # Tobii SDK integration
├── gui/
│   ├── widgets.py            # GUI components
│   ├── styles.py             # Theme and colors
│   └── service_manager.py    # Server lifecycle management
└── assets/
    └── eye.ico             # Application icon
```

## Configuration

**Port:** Fixed at 28980 (configured in `app/config.py`)

**Environment Variables** (optional `.env` file):
```env
HOST=127.0.0.1
PORT=28980
DEBUG=true
```

## Requirements

- **Python:** 3.8 or higher
- **Hardware:** Tobii Eye Tracker (4C, 5, or compatible)
- **OS:** Windows 10/11
- **Drivers:** Tobii Eye Tracker drivers installed

## Dependencies

Core libraries:
- `fastapi==0.109.0` - REST API framework
- `uvicorn[standard]==0.27.0` - ASGI server
- `tobii_research` - Tobii SDK
- `customtkinter==5.2.2` - Modern GUI framework
- `pystray==0.19.5` - System tray integration
- `psutil==5.9.8` - Process management

See `requirements.txt` for complete list.

## Troubleshooting

**Port 28980 already in use:**
- The GUI will detect this and offer to kill the conflicting process
- Or manually check: `netstat -ano | findstr :28980`

**Eye tracker not detected:**
- Ensure Tobii drivers are installed
- Check USB connection
- Restart the Tobii service from Windows Services

**Icon not showing in dialog:**
- Known issue with CustomTkinter - icon appears after short delay
- Icon file must be `.ico` format for Windows title bar

## Development

### Running the Server Directly

```powershell
uvicorn main:app --host 127.0.0.1 --port 28980
```

### Code Structure

- **GUI Layer** (`gui/`) - CustomTkinter widgets and service manager
- **API Layer** (`app/`) - FastAPI routes and business logic
- **Service Layer** (`app/services/`) - Tobii SDK integration

### Styling

All colors and fonts are centralized in `gui/styles.py` for easy theming.

## Future Enhancements

- [ ] Package as standalone executable (PyInstaller)
- [ ] Windows installer with auto-start option
- [ ] Calibration UI
- [ ] Data recording and export
- [ ] Settings panel for port configuration
