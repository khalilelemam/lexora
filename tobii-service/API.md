# Lexora Eye Tracker Service - API Documentation

Developer documentation for integrating the Lexora Eye Tracker Service into web applications.

## Architecture Overview

The service runs locally on the user's machine (localhost:28980) and communicates with web applications via:
- **REST API** for status checks
- **WebSocket** for real-time gaze data streaming

```
Web App (Browser) ──WebSocket──> Lexora Service (localhost:28980) ──SDK──> Tobii Pro Device
```

## API Endpoints

### Health Check

**Endpoint:** `GET http://localhost:28980/tobii/status`

**Response:**
```json
{
  "connected": true,
  "device": {
    "device_name": "Tobii Pro Fusion",
    "serial_number": "TPC-0123456789AB",
    "model": "Tobii Pro Fusion",
    "firmware_version": "1.7.6-citronkola-ibland.6"
  }
}
```

When no device is connected:
```json
{
  "connected": false,
  "device": null
}
```

**Use case:** Check if the service is running and a tracker is connected before attempting WebSocket connection.

---

### Gaze Data Stream

**Endpoint:** `ws://localhost:28980/tobii/gaze`

**Protocol:** WebSocket

**Data Format:**
```json
[
  {
    "fixation_x": 0.5,
    "fixation_y": 0.5,
    "timestamp": 1234567890123456
  },
  {
    "fixation_x": 0.51,
    "fixation_y": 0.49,
    "timestamp": 1234567890140000
  }
]
```

**Response Structure:**
- Returns an **array** of gaze points (batch collected since last message)
- Each message contains multiple gaze points (~50ms worth of data)
- Batches sent approximately every 50ms

**Field Descriptions:**
- `fixation_x`, `fixation_y`: Averaged gaze coordinates from both eyes (normalized 0.0 to 1.0)
- `timestamp`: System timestamp in **microseconds** (integer, not milliseconds)

**Coordinate System:**
- Normalized coordinates (0.0 to 1.0)
- `fixation_x: 0.0` = left edge of screen, `fixation_x: 1.0` = right edge
- `fixation_y: 0.0` = top edge of screen, `fixation_y: 1.0` = bottom edge

**Frequency:** Depends on the Tobii Pro device (typically 60Hz, 120Hz, 250Hz, or higher)

---

## Integration Examples

### JavaScript/TypeScript (Vanilla)

```javascript
class EyeTrackerClient {
  constructor() {
    this.ws = null;
    this.reconnectInterval = 3000;
  }

  async checkStatus() {
    try {
      const response = await fetch('http://localhost:28980/tobii/status');
      const data = await response.json();
      return data.connected;
    } catch (error) {
      console.error('Service not available:', error);
      return false;
    }
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:28980/tobii/gaze');

    this.ws.onopen = () => {
      console.log('Connected to eye tracker');
    };

    this.ws.onmessage = (event) => {
      const gazePoints = JSON.parse(event.data);
      this.handleGazeData(gazePoints);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }

  handleGazeData(gazePoints) {
    // Process array of gaze points
    gazePoints.forEach(point => {
      // Convert normalized coordinates to screen pixels
      const screenX = point.fixation_x * window.innerWidth;
      const screenY = point.fixation_y * window.innerHeight;
      
      // Your application logic here
      console.log(`Gaze at: (${screenX}, ${screenY})`);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const tracker = new EyeTrackerClient();
tracker.checkStatus().then(connected => {
  if (connected) {
    tracker.connect();
  } else {
    alert('Please start the Lexora service');
  }
});
```

---

### React/Next.js Hook

```typescript
import { useEffect, useRef, useState } from 'react';

interface GazePoint {
  fixation_x: number;
  fixation_y: number;
  timestamp: number;
}

interface UseEyeTrackerReturn {
  connected: boolean;
  gazePoints: GazePoint[];
  error: string | null;
}

export function useEyeTracker(): UseEyeTrackerReturn {
  const [connected, setConnected] = useState(false);
  const [gazePoints, setGazePoints] = useState<GazePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket('ws://localhost:28980/tobii/gaze');

        ws.onopen = () => {
          setConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          const points = JSON.parse(event.data) as GazePoint[];
          setGazePoints(points);
        };

        ws.onerror = (err) => {
          setError('Connection error - ensure Lexora service is running');
          setConnected(false);
        };

        ws.onclose = () => {
          setConnected(false);
          // Attempt reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        wsRef.current = ws;
      } catch (err) {
        setError('Failed to connect to eye tracker service');
      }
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { connected, gazePoints, error };
}

// Usage in component
function MyComponent() {
  const { connected, gazePoints, error } = useEyeTracker();

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!connected) {
    return <div>Connecting to eye tracker...</div>;
  }

  return (
    <div>
      <p>Eye tracking active</p>
      {gazePoints.length > 0 && (
        <p>
          Latest gaze: ({gazePoints[gazePoints.length - 1].fixation_x.toFixed(3)}, 
          {gazePoints[gazePoints.length - 1].fixation_y.toFixed(3)})
        </p>
      )}
    </div>
  );
}
```

---

## CORS Configuration

The service is configured to accept connections from specific origins. By default:

```python
# In app/config.py
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",  # Local Next.js dev server
]
```

### For Production Deployment

When deploying your web app to production, **you must add your domain** to the allowed origins:

1. Clone the repository
2. Edit `tobii-service/app/config.py`
3. Add your production domain:
   ```python
   ALLOWED_ORIGINS: List[str] = [
       "http://localhost:3000",
       "https://yourapp.com",
       "https://www.yourapp.com"
   ]
   ```
4. Rebuild and redistribute the service to users

**Important:** Users must run the modified version that includes your domain in ALLOWED_ORIGINS.

---

## Error Handling

### Service Not Running

```javascript
fetch('http://localhost:28980/tobii/status')
  .catch(error => {
    // Service is not running or port is blocked
    showUserMessage('Please install and start the Lexora service');
  });
```

### Device Not Connected

```javascript
const status = await fetch('http://localhost:28980/tobii/status').then(r => r.json());
if (!status.connected) {
  showUserMessage('Please connect your Tobii Pro eye tracker');
}
```

### WebSocket Disconnection

Implement automatic reconnection with exponential backoff:

```javascript
let reconnectAttempts = 0;
const maxReconnectDelay = 30000; // 30 seconds

function reconnect() {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
  reconnectAttempts++;
  
  setTimeout(() => {
    console.log(`Reconnection attempt ${reconnectAttempts}`);
    connect();
  }, delay);
}

ws.onclose = () => {
  reconnect();
};

ws.onopen = () => {
  reconnectAttempts = 0; // Reset on successful connection
};
```

---

## Data Processing

### Processing Gaze Point Batches

The WebSocket sends arrays of gaze points. You typically want to process the latest point:

```javascript
ws.onmessage = (event) => {
  const gazePoints = JSON.parse(event.data);
  
  if (gazePoints.length > 0) {
    // Get the most recent gaze point
    const latestPoint = gazePoints[gazePoints.length - 1];
    updateUI(latestPoint);
    
    // Or process all points in the batch
    gazePoints.forEach(point => {
      recordForAnalysis(point);
    });
  }
};
```

### Smoothing with Moving Average

```javascript
class GazeSmoothing {
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.buffer = [];
  }

  smooth(gazePoint) {
    this.buffer.push(gazePoint);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    const avgX = this.buffer.reduce((sum, p) => sum + p.fixation_x, 0) / this.buffer.length;
    const avgY = this.buffer.reduce((sum, p) => sum + p.fixation_y, 0) / this.buffer.length;

    return { fixation_x: avgX, fixation_y: avgY };
  }
}

// Usage
const smoother = new GazeSmoothing(5);
ws.onmessage = (event) => {
  const gazePoints = JSON.parse(event.data);
  if (gazePoints.length > 0) {
    const latestPoint = gazePoints[gazePoints.length - 1];
    const smoothedGaze = smoother.smooth(latestPoint);
    // Use smoothedGaze for UI
  }
};
```

### Converting to Screen Coordinates

```javascript
function toScreenCoordinates(gazePoint, element = document.body) {
  const rect = element.getBoundingClientRect();
  return {
    x: gazePoint.fixation_x * rect.width + rect.left,
    y: gazePoint.fixation_y * rect.height + rect.top
  };
}
```

---

## Performance Considerations

### Throttling Updates

High-frequency gaze data (60Hz+) can overwhelm UI updates:

```javascript
import { throttle } from 'lodash';

const updateGazeCursor = throttle((gazePoint) => {
  // Update UI at max 30fps instead of tracker frequency
  const { x, y } = toScreenCoordinates(gazePoint);
  gazeCursor.style.left = `${x}px`;
  gazeCursor.style.top = `${y}px`;
}, 33); // ~30fps

ws.onmessage = (event) => {
  const gazePoints = JSON.parse(event.data);
  if (gazePoints.length > 0) {
    const latestPoint = gazePoints[gazePoints.length - 1];
    updateGazeCursor(latestPoint);
  }
};
```

### Buffering for Analysis

For data analysis or recording:

```javascript
const gazeBuffer = [];
const MAX_BUFFER_SIZE = 1000; // Store last 1000 samples

ws.onmessage = (event) => {
  const gazePoints = JSON.parse(event.data);
  
  // Add all points from this batch to buffer
  gazePoints.forEach(point => {
    gazeBuffer.push(point);
    if (gazeBuffer.length > MAX_BUFFER_SIZE) {
      gazeBuffer.shift();
    }
  });
  
  // Process buffer periodically instead of every batch
};
```

---

## Testing Without Hardware

During development, you can mock the service:

```javascript
class MockEyeTracker {
  connect(onMessage) {
    this.interval = setInterval(() => {
      // Simulate batch of gaze data (like real service)
      const mockBatch = [
        {
          fixation_x: 0.4 + Math.random() * 0.2,
          fixation_y: 0.4 + Math.random() * 0.2,
          timestamp: Date.now() * 1000 // Convert to microseconds
        },
        {
          fixation_x: 0.4 + Math.random() * 0.2,
          fixation_y: 0.4 + Math.random() * 0.2,
          timestamp: Date.now() * 1000 + 16000 // ~16ms later
        }
      ];
      onMessage(mockBatch);
    }, 50); // ~20Hz batch rate
  }

  disconnect() {
    clearInterval(this.interval);
  }
}
```

---

## Troubleshooting

### CORS Errors

**Problem:** Browser console shows CORS policy errors

**Solution:**
1. Verify your domain is in `ALLOWED_ORIGINS` in `app/config.py`
2. Rebuild the service after configuration changes
3. For local development, ensure you're using `http://localhost:3000` (not `127.0.0.1`)

### Mixed Content Warnings

**Problem:** HTTPS website trying to connect to `ws://localhost`

**Solution:** Modern browsers allow WebSocket connections to localhost even from HTTPS pages. If issues persist:
- Ensure you're using `ws://` not `wss://` for localhost
- Check browser security settings
- Test in different browsers

### Firewall Blocking

**Problem:** Cannot connect even though service is running

**Solution:**
1. Windows Defender may block localhost connections
2. Add exception for port 28980
3. Or temporarily disable firewall for testing

---

## Development Setup

To run the service from source:

```powershell
# Clone repository
git clone https://github.com/Khalil-Elemam/eglex.git
cd eglex/tobii-service

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the GUI application
python gui_window.py

# Or run server directly (without GUI)
uvicorn main:app --host 127.0.0.1 --port 28980
```

### File Structure

```
tobii-service/
├── gui_window.py          # Main application entry
├── main.py                # FastAPI server
├── requirements.txt       # Dependencies
├── app/
│   ├── api.py            # FastAPI app factory
│   ├── config.py         # Settings (CORS, port)
│   ├── models/
│   │   └── gaze.py       # Data models
│   ├── routers/
│   │   └── tobii.py      # API endpoints
│   └── services/
│       └── tobii_service.py  # Tobii SDK integration
├── gui/
│   ├── widgets.py        # UI components
│   ├── styles.py         # Theme colors
│   └── service_manager.py    # Server lifecycle
└── assets/
    └── eye.ico          # Application icon
```

---

## Support

For issues or questions:
- **GitHub Issues:** [Report bugs](https://github.com/Khalil-Elemam/eglex/issues)
- **API Questions:** Open a discussion in the repository

---

**Version:** 1.0.0-rc.1  
**Last Updated:** December 2025
