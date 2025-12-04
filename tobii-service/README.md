# Lexora Eye Tracker Service

Local desktop application that connects to your Tobii Pro eye tracker and provides real-time gaze data to web applications.

## What It Does

This service runs quietly in your system tray and makes your Tobii eye tracker accessible to web browsers through a local WebSocket connection. Perfect for integrating eye tracking into web-based applications, research tools, or accessibility projects.

## Installation

### System Requirements

- **OS:** Windows 10 or Windows 11 (currently Windows-only due to GUI framework)
- **Hardware:** Tobii Pro eye tracker (e.g., Pro Fusion, Pro Spectrum, Pro Nano) with Tobii Pro SDK support

### Setup

1. **Download** the latest release from the [Releases page](../../releases)
2. **Install** by running `Lexora-setup.exe`
3. **Launch** from Start Menu or Desktop shortcut
4. The app will appear in your system tray (look for the eye icon 👁️)

## How to Use

### Starting the Service

1. **Left-click** the tray icon to open the control window
2. Click **Start** to begin the eye tracking service
3. The status cards will turn green when running
4. You can now connect from your web application

### Application Controls

| Action | What Happens |
|--------|--------------|
| **Left-click tray icon** | Opens the control window |
| **Right-click tray icon** | Quick menu (Open/Exit) |
| **Start button** | Starts the eye tracking service |
| **Stop button** | Stops the service |
| **Restart button** | Restarts the service |
| **Minimize (-) button** | Hides window to tray (service keeps running) |
| **Close (X) button** | Stops service and minimizes to tray |
| **Exit button** | Stops service and minimizes to tray |
| **Tray → Exit** | Completely quits the application |

### Auto-Start on Windows Login

To start the service automatically when you log in:
1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to Lexora in this folder
3. Right-click shortcut → Properties → Add `--minimized` to Target field


## Connecting from Web Applications

The service runs on **port 28980** and provides two endpoints:

### Check Connection Status

```
GET http://localhost:28980/tobii/status
```

Returns tracker information:
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


### Stream Gaze Data (WebSocket)

```
ws://localhost:28980/tobii/gaze
```

Receives batches of gaze points (array):
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

**Data format:**
- `fixation_x`, `fixation_y`: Averaged gaze coordinates from both eyes (normalized 0.0 to 1.0)
- `timestamp`: System timestamp in **microseconds** (not milliseconds)
- Coordinates: `x: 0.0` = left edge, `x: 1.0` = right edge; `y: 0.0` = top edge, `y: 1.0` = bottom edge
- Response is an **array** of gaze points collected since last message (~50ms batches)

### Example: JavaScript/TypeScript Integration

```javascript
// Connect to the service
const ws = new WebSocket('ws://localhost:28980/tobii/gaze');

ws.onopen = () => {
  console.log('Connected to Tobii eye tracker');
};

ws.onmessage = (event) => {
  const gazePoints = JSON.parse(event.data);
  // gazePoints is an array of gaze data
  gazePoints.forEach(point => {
    console.log(`Gaze: (${point.fixation_x}, ${point.fixation_y})`);
    // Use the gaze data in your application
  });
};

ws.onerror = (error) => {
  console.error('Connection error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from Tobii service');
};
```

## Troubleshooting

### Port 28980 Already in Use

If another application is using port 28980:
- The service will automatically detect this when you click Start
- A dialog will show which process is using the port
- You can choose to terminate that process or cancel

To manually check what's using the port:
1. Open PowerShell or Command Prompt
2. Run: `netstat -ano | findstr :28980`

### Eye Tracker Not Detected

**Check the USB connection:**
- Unplug and reconnect your Tobii Pro device
- Try a different USB port (preferably USB 3.0)
- Ensure the tracker is getting power (LED indicators should be on)

**Verify device compatibility:**
- Only Tobii Pro devices with SDK support are compatible
- Consumer devices (e.g., Tobii Eye Tracker 5) are NOT supported

**Check with Tobii Pro Eye Tracker Manager:**
- Download [Tobii Pro Eye Tracker Manager](https://www.tobii.com/products/software/applications-and-developer-kits/tobii-pro-eye-tracker-manager) (free)
- Install and launch the application
- Verify your device is detected and functioning
- Run firmware updates if available

### WebSocket Connection Fails from Browser

**Firewall blocking:**
- Windows may block local connections
- Add exception for port 28980 in Windows Defender Firewall

**Wrong URL:**
- Make sure you're using `ws://` not `wss://`
- URL must be exactly: `ws://localhost:28980/tobii/gaze`

**Service not running:**
- Check the app's status cards - they should be green
- Try Stop → Start to restart the service

### Application Won't Start

**Previous instance still running:**
- Check system tray for the eye icon
- Right-click → Exit to close previous instance
- Open Task Manager and end any "Lexora" or "python" processes using port 28980

## Support & Feedback

- **Issues:** Report bugs on the [GitHub Issues page](../../issues)
- **Questions:** Check existing issues or open a new discussion

## For Developers

If you're developing a web application that integrates with this service, see [API.md](API.md) for complete API documentation, CORS configuration, and development guidelines.

## License

This project is part of the Lexora suite. See the main repository for license information.

---

**Note:** This service only works locally on your computer. Web applications must be running in your browser to connect to `localhost:28980`.
