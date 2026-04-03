from fastapi.testclient import TestClient
from app.api import create_app

app = create_app()
client = TestClient(app)

res = client.post("/v1/webcam/predict", json={
  "gazeData": [
    {"x": 100, "y": 100, "timestamp": 0},
    {"x": 105, "y": 105, "timestamp": 50},
    {"x": 102, "y": 101, "timestamp": 100},
    {"x": 100, "y": 100, "timestamp": 150},
    {"x": 400, "y": 100, "timestamp": 200},
    {"x": 400, "y": 100, "timestamp": 250},
    {"x": 400, "y": 100, "timestamp": 300},
    {"x": 400, "y": 100, "timestamp": 1000},
    {"x": 400, "y": 100, "timestamp": 2000},
    {"x": 400, "y": 100, "timestamp": 3000}
  ],
  "screenWidth": 1920,
  "screenHeight": 1080
})
print(res.status_code)
print(res.json())
