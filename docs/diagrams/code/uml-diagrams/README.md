# Lexora System - Split Composite Structure Diagrams

## 📋 Overview

The complete Lexora system architecture has been **split into 6 focused diagrams** to make it easier to understand and explain each component independently.

**Original**: One complex diagram with ML Service + Tobii Service + Hardware + Storage  
**Now**: 6 clear diagrams, each focusing on a specific aspect

---

## 📂 Diagram Index

| # | Diagram | Focus | Purpose | Audience |
|---|---------|-------|---------|----------|
| 1 | **ML Service Core** | API + Infrastructure | Show FastAPI foundation | Backend devs, DevOps |
| 2 | **Eye Tracker Pipeline** | Tobii data processing | High-precision ML workflow | ML engineers, researchers |
| 3 | **Webcam Pipeline** | Webcam gaze estimation | Accessible alternative | Product, developers |
| 4 | **Data Flow** | Request/response | API contracts and validation | Frontend + backend devs |
| 5 | **Tobii Service** | Desktop app structure | Hardware integration | Desktop devs, QA |
| 6 | **System Integration** | End-to-end flow | Complete system view | Everyone, stakeholders |

---

## 🎯 How to Use These Diagrams

### For Different Audiences

**Product Managers / Stakeholders**
```
Start with: 06-system-integration.mermaid
→ Shows complete user journey
→ Explains both eye tracker and webcam options
→ High-level overview
```

**Backend Developers**
```
1. Start: 01-ml-service-core.mermaid (understand API structure)
2. Then: 04-data-flow.mermaid (understand requests/responses)
3. Deep dive: 02 or 03 (depending on which pipeline you're working on)
```

**ML Engineers / Data Scientists**
```
1. 02-eye-tracker-pipeline.mermaid (professional hardware workflow)
2. 03-webcam-pipeline.mermaid (accessible alternative + UDA)
→ Shows feature processing and model architecture
```

**Desktop Application Developers**
```
05-tobii-service.mermaid
→ PyQt5 GUI structure
→ Hardware SDK integration
→ REST API implementation
```

**Frontend Developers**
```
04-data-flow.mermaid
→ API endpoints
→ Request/response formats
→ Error handling
```

**DevOps / Infrastructure**
```
1. 01-ml-service-core.mermaid (deployment structure)
2. 06-system-integration.mermaid (architecture overview)
```

---

## 📖 Recommended Explanation Order

### For Complete Understanding

**Progressive Learning Path:**

1. **Start with System Integration** (Diagram 6)
   - Get the big picture
   - Understand user journey
   - See how parts connect

2. **Understand ML Service Core** (Diagram 1)
   - FastAPI structure
   - Infrastructure components
   - Configuration management

3. **Choose Your Pipeline** (Diagrams 2 or 3)
   - Eye Tracker: Professional, high-precision
   - Webcam: Accessible, lower-cost

4. **Learn Data Flow** (Diagram 4)
   - API contracts
   - Validation rules
   - Error handling

5. **Optional: Tobii Service** (Diagram 5)
   - Only if working with eye tracker
   - Desktop app architecture

---

## 🔍 Diagram Details

### 1️⃣ ML Service Core (`01-ml-service-core.mermaid`)

**What it shows:**
- FastAPI application structure
- API routers (Health, Predict)
- Core infrastructure (Middleware, Lifespan, Exceptions)
- Configuration management

**Key concepts:**
- Middleware wraps all requests
- Lifespan manages startup/shutdown
- Settings control behavior

**When to use:**
- Setting up the ML service
- Understanding request flow
- Configuring the application

---

### 2️⃣ Eye Tracker Pipeline (`02-eye-tracker-pipeline.mermaid`)

**What it shows:**
- Raw gaze data → Feature processing → Prediction
- 3-task neural network architecture
- StandardScaler usage
- Model file loading

**Key concepts:**
- High-precision Tobii hardware data
- Feature extraction (saccades, fixations, velocities)
- 3-branch neural network (syllables, pseudo, meaningful)
- Risk classification output

**When to use:**
- Understanding professional eye tracking
- ML model architecture
- Feature engineering details

---

### 3️⃣ Webcam Pipeline (`03-webcam-pipeline.mermaid`)

**What it shows:**
- Webcam data → One Euro smoothing + I-DT fixation detection → UDA model → Prediction
- Domain adaptation approach
- Noise handling strategies

**Key concepts:**
- I-DT (Identification by Dispersion Threshold) for fixation detection
- One Euro adaptive smoothing for jitter reduction with low lag
- UDA (Unsupervised Domain Adaptation) bridges eye tracker → webcam gap
- Signal smoothing for noise reduction
- Accessible alternative to eye tracker

**When to use:**
- Implementing webcam support
- Understanding UDA necessity
- Comparing with eye tracker approach

---

### 4️⃣ Data Flow (`04-data-flow.mermaid`)

**What it shows:**
- Complete request/response cycle
- Pydantic validation
- Error handling
- Data schemas

**Key concepts:**
- Type-safe API with Pydantic
- Validation before processing
- Structured responses
- Error responses (400/500)

**When to use:**
- Integrating with API
- Understanding data contracts
- Debugging validation errors

---

### 5️⃣ Tobii Service (`05-tobii-service.mermaid`)

**What it shows:**
- Desktop application structure (PyQt5)
- REST API for remote control
- Tobii SDK integration
- Hardware management

**Key concepts:**
- Multi-layer architecture (GUI, API, Hardware)
- Callback-based data collection
- Buffering strategy
- Desktop app as service

**When to use:**
- Building Tobii desktop app
- Hardware integration
- Understanding device communication

---

### 6️⃣ System Integration (`06-system-integration.mermaid`)

**What it shows:**
- Complete end-to-end workflow
- User interactions
- Service connections
- Hardware options

**Key concepts:**
- Two modes: Eye Tracker vs Webcam
- Client → Services → ML → Database flow
- Deployment architecture
- User journey

**When to use:**
- Presenting to stakeholders
- System design discussions
- Architecture decisions
- Onboarding overview

---

## 💡 Key Architectural Patterns

### Microservices Architecture
```
ML Service (Cloud)    ← HTTP ←  Web App (Browser)
                      ← HTTP ←  Tobii Service (Desktop)
```

### Pipeline Pattern
```
Raw Data → Feature Processing → Model → Prediction
```

### Layered Architecture
```
API Layer → Business Logic → Data Access
```

### Adapter Pattern (UDA)
```
Eye Tracker Data → UDA Model → Webcam Compatible
```

---

## 🚀 Quick Start Examples

### Example 1: Explain to Product Manager

**Goal:** Show how the system works end-to-end

**Steps:**
1. Open `06-system-integration.mermaid`
2. Walk through user journey:
   - Teacher opens web app
   - Child takes test
   - Data flows to ML service
   - Results displayed
3. Explain two options:
   - Eye Tracker (professional)
   - Webcam (accessible)

**Time:** 10 minutes

---

### Example 2: Onboard Backend Developer

**Goal:** Help developer understand API structure

**Steps:**
1. Start with `01-ml-service-core.mermaid`
   - Show FastAPI setup
   - Explain routers and middleware
2. Move to `04-data-flow.mermaid`
   - Show request validation
   - Explain response format
3. Deep dive to `02-eye-tracker-pipeline.mermaid`
   - Show actual ML processing

**Time:** 30 minutes

---

### Example 3: Present to Investors/Leadership

**Goal:** Show technical capability without overwhelming

**Steps:**
1. Show `06-system-integration.mermaid` only
2. Highlight:
   - Two technology options (premium + accessible)
   - Cloud-based ML service
   - Proven ML models
   - Professional results
3. Don't show other diagrams unless asked

**Time:** 5 minutes

---

## 🔄 Workflows Explained

### Eye Tracker Test Workflow
```
1. Teacher → Web App → "Start Test"
2. Web App → Tobii Service → "Start Capture"
3. Child reads 3 tasks (syllables, pseudo, meaningful)
4. Tobii Device → Tobii Service → buffers gaze data
5. Web App → Tobii Service → "Get Gaze Data"
6. Web App → ML Service → POST /v1/eye-tracker/predict
7. ML Service → Eye Tracker Pipeline → processes
8. ML Service → Database → saves results
9. ML Service → Web App → returns prediction
10. Web App → Teacher → displays results
```

### Webcam Test Workflow
```
1. Teacher → Web App → "Start Test"
2. Web App → enables webcam
3. Child reads tasks
4. Web App → estimates gaze from video (browser-based)
5. Web App → ML Service → POST /v1/webcam/predict
6. ML Service → Webcam Pipeline → processes with UDA
7. ML Service → Database → saves results
8. ML Service → Web App → returns prediction
9. Web App → Teacher → displays results
```

---

## 📊 Comparison: Eye Tracker vs Webcam

| Aspect | Eye Tracker | Webcam |
|--------|-------------|--------|
| **Hardware** | Tobii device (~$150+) | Any webcam |
| **Precision** | Very high | Lower |
| **Setup** | Desktop app required | Browser only |
| **Pipeline** | Direct features | UDA adaptation |
| **Use Case** | Clinical, research | Screening, accessible |
| **Diagram** | #2 | #3 |

---

## 🛠️ Technical Stack Summary

### ML Service
- **Framework:** FastAPI (Python)
- **ML:** TensorFlow/Keras
- **Validation:** Pydantic
- **Deployment:** Docker, Cloud

### Tobii Service
- **GUI:** PyQt5
- **API:** FastAPI
- **Hardware:** Tobii Research SDK
- **Platform:** Windows, Mac, Linux

### Models
- **Eye Tracker:** 3-branch neural network (.h5)
- **Webcam:** UDA classifier (.h5)
- **Preprocessing:** StandardScaler (.pkl)

---

## ✅ Benefits of Split Diagrams

✅ **Reduced Complexity** - Focus on one aspect at a time  
✅ **Better Understanding** - Each diagram tells one story  
✅ **Easier Presentations** - Show only relevant parts  
✅ **Progressive Learning** - Build knowledge step-by-step  
✅ **Role-Specific** - Different audiences see different diagrams  
✅ **Maintainable** - Update one diagram without confusion  

---

## 📝 When to Update

Update diagrams when:
- Adding new endpoints → Update #1 and #4
- Changing ML models → Update #2 or #3
- Adding new services → Update #6
- Changing data schemas → Update #4
- Modifying hardware integration → Update #5

---

## 🤝 Contributing

When updating diagrams:
1. Update the specific `.mermaid` file
2. Test rendering in Mermaid Live Editor
3. Update this README if adding concepts
4. Keep explanations in diagram comments

---

## 🔗 Related Documentation

- **Database Docs:** `../database-docs/` - Database schema details
- **API Docs:** See ML Service README - Endpoint documentation
- **Deployment:** See infrastructure docs - DevOps guides

---

**Next Steps:**
1. Choose a diagram based on your role/goal
2. Open in Mermaid editor or compatible viewer
3. Follow the explanation flow
4. Refer to inline comments for details
