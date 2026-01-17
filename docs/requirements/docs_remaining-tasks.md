# Remaining Tasks - Senior Project 2

## Lexora - Dyslexia Screening and Learning Support Platform

**Document Purpose:** This document outlines the key tasks planned for completion during the Senior Project 2 semester, based on comparison with the functional requirements specification. 

**Last Updated:** January 17, 2026

---

## 1. Core Web Application Development

### 1.1 Frontend Foundation (Next. js)
- [ ] **Set up Next.js application structure**
  - Initialize Next.js 14+ with App Router
  - Configure TypeScript, ESLint, and Prettier
  - Set up Tailwind CSS for styling
  - Configure environment variables and API routes

- [ ] **Implement authentication system**
  - Google OAuth integration (FR-2. 3)
  - Session management with NextAuth
  - Email verification flow
  - Password reset functionality
  - Protected route middleware

### 1.2 Backend API Development
- [ ] **Database setup**
  - Deploy PostgreSQL database (see ERD in docs/diagrams)
  - Run database migrations based on schema
  - Set up connection pooling
  - Configure Prisma ORM or similar

- [ ] **User management APIs**
  - Guardian registration endpoints (FR-2.1)
  - Child profile CRUD operations (FR-2.2)
  - Child profile claiming system (FR-2.4, FR-2.5)
  - PII masking and auto-deletion for claims

- [ ] **Subscription & payment integration**
  - Stripe integration (FR-14.1, FR-14.2)
  - Subscription plan management
  - Access control based on subscription (FR-14.3)
  - Payment webhook handlers

---

## 2. Test System Implementation

### 2.1 Test Orchestration
- [ ] **Eye tracker mode workflow** (FR-4.3)
  - Sequential task flow:  syllables → pseudo-words → meaningful text
  - Task progression controller
  - Guardian supervision interface
  - Gaze data collection for all three tasks

- [ ] **Webcam mode workflow** (FR-4.3)
  - Single paragraph reading task
  - Browser camera API integration
  - Raw gaze data capture

### 2.2 Calibration System
- [ ] **Tobii calibration** (FR-4.4)
  - Calibration UI with target points
  - Quality metrics calculation
  - Calibration failure handling
  - Retry mechanism

- [ ] **Webcam calibration** (FR-4.4)
  - Browser-based calibration
  - Quality warnings and guidance
  - Lighting/positioning recommendations

### 2.3 Integration with Services
- [ ] **Tobii helper integration** (FR-3.2)
  - WebSocket client for Tobii service
  - Connection detection and error handling
  - Real-time fixation data streaming
  - User-friendly error messages

- [ ] **ML service integration** (FR-4.7)
  - API client for prediction endpoints
  - Eye tracker data submission (3 tasks)
  - Webcam data submission (raw gaze)
  - Retry logic for transient failures
  - Error handling and user feedback

### 2.4 Results & Reports
- [ ] **Result interpretation UI** (FR-4.8)
  - Color-coded risk indicators (low/medium/high)
  - Confidence score display
  - Explanatory text for each risk level
  - Recommendations for next steps

- [ ] **Test report generation** (FR-4.9)
  - PDF report generation
  - Historical comparison charts
  - Downloadable reports from dashboard
  - Email notifications to guardians

---

## 3. Learning Support System

### 3.1 Reading Mode
- [ ] **Assistive reading interface** (FR-6.1)
  - Word-by-word highlighting synchronized with audio
  - Line focus mode (dim surrounding text)
  - Audio narration with speed control
  - Tap-to-hear word pronunciation
  - Progress indicator

- [ ] **Text-to-Speech integration**
  - Arabic TTS integration
  - English TTS integration
  - Audio speed controls
  - Word-level audio playback

### 3.2 Reading Content Management
- [ ] **Content database & APIs** (FR-6.2)
  - Content CRUD operations
  - Metadata management (difficulty, age, language, category)
  - Content filtering by attributes
  - Approval workflow

- [ ] **Reading preferences** (FR-6.3)
  - Child-specific preference settings
  - Font family selection (OpenDyslexic, Arial, etc.)
  - Letter spacing controls
  - Background color options
  - Text size controls
  - Live preview of preferences

### 3.3 Exercise Engine
- [ ] **Exercise types implementation** (FR-6.4)
  - Syllable splitting exercises
  - Missing letter completion
  - Phoneme matching
  - Rhyme matching exercises

- [ ] **Adaptive difficulty system**
  - Performance tracking per child
  - Auto-leveling based on accuracy
  - Progress saving

- [ ] **Scoring & feedback**
  - Immediate answer feedback
  - Accuracy calculation
  - Time tracking
  - Attempt counting

---

## 4. Games System

### 4.1 Game Implementation
- [ ] **Game 1: Syllable Splitter** (FR-7.1)
  - Word presentation and splitting UI
  - Progressive difficulty
  - Timed challenges
  - Arabic and English support

- [ ] **Game 2: Sound Matching** (FR-7.1)
  - Audio playback system
  - Multiple choice interface
  - Phonetic awareness training
  - Arabic and English audio

- [ ] **Game 3: Word Builder** (FR-7.1)
  - Letter scrambling logic
  - Drag-and-drop or tap interface
  - Hint system
  - Arabic and English support

### 4.2 Game Mechanics
- [ ] **Progression system** (FR-7.2)
  - Level unlocking logic
  - Points/score accumulation
  - Streak tracking
  - Level-up animations

- [ ] **Performance tracking** (FR-7.3)
  - Real-time metrics updates
  - Statistics dashboard for guardians
  - Historical performance charts

---

## 5. Teacher System

### 5.1 Classroom Management
- [ ] **Classroom features** (FR-8.1)
  - Classroom creation UI
  - Join code generation
  - Student roster view
  - Classroom deletion

### 5.2 Student Management
- [ ] **Enrollment system** (FR-8.2)
  - Join code entry interface for parents
  - Child enrollment flow
  - Unenrollment functionality
  - Enrollment notifications

### 5.3 Teacher Features
- [ ] **Teacher-initiated tests** (FR-8.3)
  - Student selection interface
  - Test mode selection
  - Test supervision dashboard
  - Result sharing with parents

- [ ] **Assignment system** (FR-8.4)
  - Assignment creation UI
  - Student/classroom selection
  - Assignment types:  games, reading, exercises
  - Due date management
  - Completion tracking
  - Parent notifications

- [ ] **Teacher dashboard** (FR-8.5)
  - Class progress overview
  - Individual student stats
  - Risk distribution visualization
  - Engagement metrics
  - Date range filtering

---

## 6. Parent System

### 6.1 Parent Dashboard
- [ ] **Dashboard UI** (FR-9.1)
  - Child profile cards
  - Quick action buttons (test, learning, games)
  - Test reports view
  - Activity history
  - Preference management

### 6.2 Test History & Reporting
- [ ] **Test history interface** (FR-9.2)
  - Chronological test list
  - Risk level trend charts
  - Test comparison tool
  - PDF export functionality

### 6.3 Notification Preferences
- [ ] **Preference management** (FR-9.3)
  - Per-notification-type settings
  - Opt-out controls
  - Test result notifications
  - Weekly summary toggle
  - Assignment notifications
  - Inactivity alerts toggle

---

## 7. Session System

### 7.1 Session Management
- [ ] **Session creation** (FR-5.1)
  - Time-limited link generation
  - Session type selection (learning/games)
  - Unique code generation
  - Child preference pre-configuration

- [ ] **Session access** (FR-5.2)
  - No-login session entry
  - Session code validation
  - Auto-load child preferences
  - Session expiration handling
  - Expiration warnings

- [ ] **Session tracking** (FR-5.3)
  - Activity logging
  - Time tracking
  - Task/game completion recording
  - Score tracking
  - Guardian dashboard for session history

---

## 8. Notification System

### 8.1 Multi-channel Notifications
- [ ] **Notification channels** (FR-10.1)
  - In-app notification system
  - Email notification service
  - Browser push notifications
  - Unread badge counter

### 8.2 Parent Notifications
- [ ] **Parent notification triggers** (FR-10.2)
  - Test completed notifications
  - Weekly activity summary
  - Inactivity alerts
  - Assignment due reminders
  - Email unsubscribe functionality

### 8.3 Teacher Notifications
- [ ] **Teacher notification triggers** (FR-10.3)
  - New student enrollment alerts
  - Assignment completion notifications
  - Scheduled test reminders
  - Claim request notifications (FR-2.4)
  - Class summary reports

---

## 9. Content Generation System

### 9.1 LLM Integration
- [ ] **Content generation service** (FR-11.1)
  - LLM API integration (OpenAI, Gemini, or similar)
  - Reading paragraph generation
  - Exercise question generation
  - Game content generation
  - Scheduled batch job setup
  - Difficulty level controls
  - Language-specific prompts (Arabic/English)

- [ ] **Content approval workflow** (FR-11.2)
  - Admin approval dashboard
  - Content preview interface
  - Edit-before-approve functionality
  - Bulk approval actions
  - Rejection handling

---

## 10. Admin System

### 10.1 User Management
- [ ] **Admin user management** (FR-15.1)
  - User search (by email, name)
  - User details view
  - Account suspension
  - Password reset for users
  - Activity log viewing

### 10.2 Content Management
- [ ] **Content approval dashboard** (FR-15.2)
  - Pending content queue
  - Content preview
  - Edit interface
  - Approve/reject actions

### 10.3 System Metrics
- [ ] **Analytics dashboard** (FR-15.3)
  - User registration metrics
  - Test completion stats
  - Content usage analytics
  - Subscription metrics
  - System health monitoring

---

## 11. Platform & Device Control

### 11.1 Device Restrictions
- [ ] **Device detection** (FR-3.1)
  - User agent parsing
  - Feature access restrictions (desktop-only for tests/games)
  - Mobile-friendly dashboards and reports
  - Clear restriction messaging

---

## 12. Language System

### 12.1 Bilingual Support
- [ ] **Language infrastructure** (FR-13)
  - Arabic language support (RTL layout)
  - English language support
  - Content language filtering
  - Child language selection enforcement
  - i18n setup for UI strings

---

## 13. Data Storage & Object Storage

### 13.1 Fixation Data Storage
- [ ] **Object storage setup** (FR-12.1)
  - S3 or MinIO integration
  - Fixation data upload
  - Presigned URL generation
  - Data retrieval for analysis

### 13.2 Test Metadata
- [ ] **Database schema implementation** (FR-12.2)
  - Test metadata storage
  - Test-task relationships
  - Historical data retention

---

## 14. Testing & Quality Assurance

### 14.1 Unit Testing
- [ ] Write unit tests for API endpoints
- [ ] Write unit tests for business logic
- [ ] Set up test coverage reporting

### 14.2 Integration Testing
- [ ] Test Tobii service integration
- [ ] Test ML service integration
- [ ] Test Stripe payment flows
- [ ] Test email notification delivery

### 14.3 End-to-End Testing
- [ ] Test complete user workflows (parent)
- [ ] Test complete user workflows (teacher)
- [ ] Test test-taking flow (Tobii and webcam modes)
- [ ] Test session system

---

## 15. Deployment & DevOps

### 15.1 Infrastructure Setup
- [ ] Set up production database (PostgreSQL)
- [ ] Configure object storage (S3/MinIO)
- [ ] Deploy ML service to cloud
- [ ] Deploy Next.js application
- [ ] Set up CI/CD pipeline
- [ ] Configure domain and SSL certificates

### 15.2 Monitoring & Logging
- [ ] Set up application logging
- [ ] Configure error tracking (Sentry or similar)
- [ ] Set up uptime monitoring
- [ ] Performance monitoring

---

## 16. Documentation

### 16.1 Technical Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Deployment guide
- [ ] Environment setup guide

### 16.2 User Documentation
- [ ] Parent user guide
- [ ] Teacher user guide
- [ ] Test administration guide
- [ ] Troubleshooting guide

---

## Priority Matrix

### **High Priority (Must Complete for Senior Project 2)**
1. Core web application foundation (authentication, database)
2. Test system (both Tobii and webcam modes)
3. Parent dashboard and test history
4. Integration with ML service and Tobii service
5. Basic reading mode implementation
6. At least one educational game
7. Subscription/payment system

### **Medium Priority (Important for Full Functionality)**
8. Teacher system (classroom, assignments)
9. Session system
10. Notification system
11. Child profile claiming
12. Exercise engine
13. All three games
14. Admin system

### **Lower Priority (Nice to Have)**
15. LLM content generation
16. Advanced analytics
17. Comprehensive admin metrics
18. Browser push notifications

---

## Timeline Recommendation

### **Weeks 1-3: Foundation**
- Set up Next.js application
- Configure database and ORM
- Implement authentication
- Basic UI components

### **Weeks 4-7: Core Features**
- Test system implementation
- Tobii and ML service integration
- Parent dashboard
- Reading mode (basic version)

### **Weeks 8-10: Extended Features**
- Teacher system
- Games implementation
- Exercise engine
- Session system

### **Weeks 11-12: Polish & Testing**
- Notification system
- Admin features
- End-to-end testing
- Bug fixes

### **Weeks 13-14: Deployment & Documentation**
- Production deployment
- User documentation
- Final testing
- Presentation preparation

---

## Notes

- **Current Status**: Project has ML models trained, Tobii service implemented, and database schema designed.  The main web application needs to be built. 
- **Dependencies**:  Ensure ML service (`ml-service/`) and Tobii service (`tobii-service/`) are deployable and accessible via API.
- **Database**: ERD is documented in `docs/diagrams/code/erd-mermaid.mermaid` and `docs/diagrams/code/erd-dbdiagram.txt`.
- **Functional Requirements**: All requirements documented in `docs/requirements/functional-requirements.md`.