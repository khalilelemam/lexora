# Running Lexora Locally & Folder Structure

Welcome to the **Lexora** development guide. The deployed production website is accessible at [lexora.page](https://lexora.page).

---

## 📁 Repository Folder Structure

The repository is structured as a monorepo containing the web application, machine learning models/services, and local eye tracker integrations:

*   **`web/`**: The core Next.js web application (frontend + backend). Built with TypeScript, React, Tailwind CSS, Better Auth, and Prisma. It handles the user flow (calibration, reading tasks, visualization, results, and persistence).
*   **`ml-service/`**: A FastAPI backend service written in Python that handles dyslexia screening prediction using TensorFlow models. It processes webcam gaze data or Tobii eye tracker data.
*   **`tobii-service/`**: A local desktop helper application (Python + customtkinter GUI) designed to run on the client machine to bridge connection to a physical Tobii eye tracker hardware via WebSockets.
*   **`ml-work/`**: Jupyter notebooks, model training scripts, and experimental work for the machine learning models.
*   **`docs/`**: Diagrams, specification documentation, and design assets.

---

## 🚀 How to Run the Project Locally

### 1. Web Application (`web/`)

The web app requires a PostgreSQL database (Prisma) and local object storage (Azurite/Azure Blob Storage emulation).

```bash
# Navigate to the web directory
cd web

# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# (Configure DATABASE_URL and Auth provider secrets inside .env.local as needed)

# 3. Start local Postgres database & local Azure Blob Storage emulator (Azurite)
docker compose up -d

# 4. Run database migrations
npx prisma migrate dev

# 5. Start the Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in a Chromium-based browser (Chrome/Edge recommended).

---

### 2. Machine Learning Service (`ml-service/`)

The ML Service acts as the intelligence backend, predicting dyslexia risk from webcam eye movements.

```bash
# Navigate to the ml-service directory
cd ml-service

# 1. Create and activate a Python virtual environment (Python 3.12+)
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/Mac:
source .venv/bin/activate

# 2. Install dependencies
pip install -e ".[dev]"

# 3. Run the FastAPI service
python server.py
```
The ML API will be running at `http://localhost:8001`. You can view the Swagger documentation at `http://localhost:8001/docs`.

---

### 3. Tobii Service (`tobii-service/`) (Optional)

Only required if you are connecting to a physical Tobii Eye Tracker hardware.

```bash
# Navigate to the tobii-service directory
cd tobii-service

# 1. Create and activate virtual environment (Python 3.10), then install dependencies
python -m venv .venv  # ensure `python` is 3.10 (Windows: `py -3.10 -m venv .venv`)
# Activate virtual environment (.venv\Scripts\Activate.ps1 on Windows)
pip install -r requirements.txt

# 2. Start the helper service GUI
python main.py
```

---

## 🌐 Deployed Production Website
The latest stable build is continuously deployed and accessible at:
👉 **[lexora.page](https://lexora.page)**
