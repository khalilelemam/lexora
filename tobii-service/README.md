# Tobii Local Service

A local HTTP service that captures gaze data from Tobii eye trackers and exposes it via REST API for web applications.

## Prerequisites

- Python 3.10 (required for tobii_research compatibility)
- Tobii Eye Tracker (connected and drivers installed)
- [Tobii Eye Tracker drivers](https://gaming.tobii.com/getstarted/)

## Setup

### 1. Create Virtual Environment

```powershell
# Navigate to tobii-service directory
cd tobii-service

# Create virtual environment with Python 3.10
py -3.10 -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configuration

Copy `.env.example` to `.env` and adjust settings if needed:

```powershell
cp .env.example .env
```

## Running the Service

```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Run the service
python main.py
```

The service will start on `http://127.0.0.1:3001`

## API Endpoints

### Tobii Endpoints
- `GET /tobii/status` - Check eye tracker connection status
- `WebSocket /tobii/gaze` - Real-time gaze data streaming (auto-starts/stops capture)

## API Documentation

Once running, visit `http://127.0.0.1:3001/docs` for interactive API documentation (Swagger UI).

## Project Structure

```
tobii-service/
├── app/
│   ├── __init__.py
│   ├── api.py              # Application factory
│   ├── config.py           # Configuration settings
│   ├── models/             # Data models
│   │   ├── __init__.py
│   │   └── gaze.py
│   ├── routers/            # API routes
│   │   ├── __init__.py
│   │   └── tobii.py
│   └── services/           # Business logic
│       ├── __init__.py
│       └── tobii_service.py
├── main.py                 # Application entry point
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Development

### Code Style
- Follow PEP 8 guidelines
- Use type hints
- Write docstrings for all functions and classes

### Testing
```powershell
# TODO: Add testing instructions
```

## Troubleshooting

### Eye tracker not detected
1. Ensure Tobii drivers are installed
2. Check if eye tracker is properly connected
3. Restart the service

### CORS issues
- Check `ALLOWED_ORIGINS` in `.env` matches your frontend URL
- Default is `http://localhost:3000` for Next.js

## License

[Your License Here]
