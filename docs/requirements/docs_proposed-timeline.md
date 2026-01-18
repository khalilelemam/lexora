# Proposed Timeline - Senior Project 2

## Lexora - Dyslexia Screening and Learning Support Platform

**Project Duration:** 14 Weeks (January 2026 - April 2026)  
**Last Updated:** January 17, 2026

---

## Executive Summary

This timeline outlines the development schedule for completing the Lexora platform during the Senior Project 2 semester. The schedule is organized into 4 major phases with weekly breakdowns, accounting for dependencies, testing periods, and buffer time for unexpected challenges.

### Timeline Overview

| Phase | Duration | Focus |
|-------|----------|-------|
| **Phase 1: Foundation** | Weeks 1-3 | Infrastructure, authentication, database setup |
| **Phase 2: Core Features** | Weeks 4-8 | Test system, ML integration, parent dashboard |
| **Phase 3: Extended Features** | Weeks 9-11 | Teacher system, games, sessions |
| **Phase 4: Polish & Launch** | Weeks 12-14 | Testing, deployment, documentation |

### Key Milestones

- ✅ **Week 3:** Authentication and database operational
- ✅ **Week 6:** First working test (Tobii mode)
- ✅ **Week 8:** Parent dashboard with test results
- ✅ **Week 11:** Teacher system and games completed
- ✅ **Week 13:** Production deployment
- ��� **Week 14:** Final presentation

---

## Phase 1: Foundation (Weeks 1-3)

**Goal:** Establish the technical foundation for the entire platform

### Week 1: Project Setup & Infrastructure

**Dates:** January 20-26, 2026

#### Tasks
- [x] **Day 1-2: Next.js Application Setup**
  - Initialize Next.js 14+ with App Router
  - Configure TypeScript, ESLint, Prettier
  - Set up Tailwind CSS
  - Create project folder structure
  - Configure environment variables
  - **Deliverable:** Running Next.js app with basic routing

- [x] **Day 2-3: Database Setup**
  - Deploy PostgreSQL database (development)
  - Install and configure Prisma ORM
  - Convert ERD to Prisma schema
  - Run initial migrations
  - **Deliverable:** Database with all tables created

- [x] **Day 3-5: CI/CD Pipeline**
  - Set up GitHub Actions workflow
  - Configure linting and type checking
  - Set up staging environment (Vercel/Railway)
  - **Deliverable:** Automated deployment pipeline

- [x] **Day 5-7: UI Component Library**
  - Set up shadcn/ui or similar component library
  - Create base components (Button, Card, Input, etc.)
  - Implement design system (colors, typography)
  - Create layout components
  - **Deliverable:** Reusable component library

**Milestone:** ✅ Development environment fully operational

---

### Week 2: Authentication & User Management

**Dates:** January 27 - February 2, 2026

#### Tasks
- [x] **Day 1-3: Authentication System**
  - Install and configure NextAuth.js
  - Set up Google OAuth provider
  - Create sign-up/sign-in pages
  - Implement session management
  - Create protected route middleware
  - **Deliverable:** Working Google OAuth login

- [x] **Day 3-4: Email Verification**
  - Configure email service (Resend/SendGrid)
  - Create email verification flow
  - Design email templates
  - **Deliverable:** Email verification working

- [x] **Day 4-5: Password Reset**
  - Implement forgot password flow
  - Create reset password page
  - Email template for password reset
  - **Deliverable:** Complete password reset functionality

- [x] **Day 5-7: User Profile & Settings**
  - Create user profile page
  - Implement profile update API
  - Avatar upload functionality
  - Account settings page
  - **Deliverable:** User can manage their profile

**Milestone:** ✅ Users can register, login, and manage accounts

---

### Week 3: Child Profile & Subscription Foundation

**Dates:** February 3-9, 2026

#### Tasks
- [x] **Day 1-3: Child Profile Management**
  - Create child profile creation form
  - Implement child CRUD APIs
  - Child profile list view
  - Language selection (permanent)
  - Age input and validation
  - **Deliverable:** Guardians can create/manage child profiles

- [x] **Day 3-5: Stripe Integration Setup**
  - Set up Stripe account
  - Install Stripe SDK
  - Create subscription plan products in Stripe
  - Implement checkout session API
  - **Deliverable:** Basic Stripe integration working

- [x] **Day 5-7: Subscription Management**
  - Create subscription management page
  - Implement webhook handlers
  - Billing history view
  - Plan upgrade/downgrade logic
  - **Deliverable:** Users can subscribe to premium

**Milestone:** ✅ Core user and subscription system complete

**Phase 1 Review:** Test all authentication flows, ensure database integrity, verify Stripe test mode

---

## Phase 2: Core Features (Weeks 4-8)

**Goal:** Implement the core testing functionality and parent dashboard

### Week 4: Test System Foundation

**Dates:** February 10-16, 2026

#### Tasks
- [x] **Day 1-2: Test Data Models & APIs**
  - Create test-related Prisma models
  - Implement test creation API
  - Implement test retrieval APIs
  - Test history queries
  - **Deliverable:** Backend APIs for test management

- [x] **Day 2-4: Device Detection & Restrictions**
  - Implement device detection utility
  - Create device restriction middleware
  - Desktop-only route protection
  - Error pages for unsupported devices
  - **Deliverable:** Device restrictions working

- [x] **Day 4-6: Test Content Management**
  - Create content seeding scripts
  - Syllables content (Arabic & English)
  - Pseudo-words content (Arabic & English)
  - Meaningful text content (Arabic & English)
  - **Deliverable:** Test content available in database

- [x] **Day 6-7: Test Mode Selection UI**
  - Create test initiation page
  - Mode selection (Tobii vs Webcam)
  - Child selection interface
  - Mode comparison information
  - **Deliverable:** Guardian can select test mode

**Milestone:** ✅ Test system foundation ready

---

### Week 5: Tobii Mode Implementation

**Dates:** February 17-23, 2026

#### Tasks
- [x] **Day 1-2: Tobii Service Detection**
  - WebSocket connection utility
  - Tobii service health check
  - Connection error handling
  - Service not found UI
  - **Deliverable:** App can detect Tobii service

- [x] **Day 2-4: Tobii Calibration**
  - Calibration UI (target points)
  - Calibration data collection
  - Quality metrics calculation
  - Retry mechanism
  - Pass/fail determination
  - **Deliverable:** Working Tobii calibration

- [x] **Day 4-6: Tobii Test Flow**
  - Task 1: Syllables reading UI
  - Task 2: Pseudo-words reading UI
  - Task 3: Meaningful text reading UI
  - Sequential task enforcement
  - Fixation data collection
  - Guardian supervision controls
  - **Deliverable:** Complete 3-task Tobii flow

- [x] **Day 6-7: Retake Logic**
  - Retake button implementation
  - Retake limit enforcement
  - Retake counter UI
  - **Deliverable:** Guardian can request retakes

**Milestone:** ✅ Tobii mode fully functional (no ML integration yet)

---

### Week 6: Webcam Mode & ML Integration

**Dates:** February 24 - March 2, 2026

#### Tasks
- [x] **Day 1-2: Webcam Calibration**
  - Browser camera permission request
  - Webcam preview
  - Calibration UI
  - Quality warnings
  - Guidance for improvement
  - **Deliverable:** Webcam calibration working

- [x] **Day 2-3:  Webcam Test Flow**
  - Single paragraph reading UI
  - Raw gaze data collection
  - Gaze data validation
  - **Deliverable:** Webcam test collects gaze data

- [x] **Day 3-5: ML Service Integration**
  - ML service API client
  - Eye tracker prediction endpoint integration
  - Webcam prediction endpoint integration
  - Error handling and retries
  - Loading states
  - **Deliverable:** Tests send data to ML service

- [x] **Day 5-7: Result Processing**
  - Parse ML service response
  - Risk level interpretation
  - Store results in database
  - Store fixation data in object storage
  - **Deliverable:** Test results saved to database

**Milestone:** ✅ Both test modes with ML predictions working

---

### Week 7: Test Results & Reports

**Dates:** March 3-9, 2026

#### Tasks
- [x] **Day 1-3: Result Display UI**
  - Color-coded risk indicators
  - Confidence score display
  - Risk level explanations
  - Recommendations text
  - Visual result cards
  - **Deliverable:** Beautiful results page

- [x] **Day 3-5: PDF Report Generation**
  - Install PDF generation library (react-pdf)
  - Design PDF report template
  - Include test metadata
  - Include fixation visualizations
  - Historical comparison
  - **Deliverable:** Downloadable PDF reports

- [x] **Day 5-7: Object Storage Setup**
  - Set up S3 or MinIO
  - Fixation data upload
  - Presigned URL generation
  - Data retrieval for reports
  - **Deliverable:** Fixation data stored in object storage

**Milestone:** ✅ Complete test-to-report pipeline working

---

### Week 8: Parent Dashboard

**Dates:** March 10-16, 2026

#### Tasks
- [x] **Day 1-3: Dashboard UI**
  - Child profile cards
  - Quick action buttons
  - Test statistics overview
  - Activity feed
  - **Deliverable:** Parent dashboard homepage

- [x] **Day 3-5: Test History**
  - Chronological test list
  - Risk level trend charts
  - Test comparison tool
  - Filter by child, date range
  - **Deliverable:** Complete test history view

- [x] **Day 5-7: Notification System Foundation**
  - In-app notification model
  - Notification API endpoints
  - Notification badge counter
  - Email notification service setup
  - Test completion email
  - **Deliverable:** Basic notifications working

**Milestone:** ✅ Parents can view all child data and test results

**Phase 2 Review:** End-to-end test of complete testing workflow (parent creates test → child takes test → results displayed)

---

## Phase 3: Extended Features (Weeks 9-11)

**Goal:** Implement teacher system, learning support, and games

### Week 9: Teacher System - Classrooms

**Dates:** March 17-23, 2026

#### Tasks
- [x] **Day 1-2: Classroom Management**
  - Classroom creation form
  - Join code generation
  - Classroom list view
  - Student roster
  - Classroom deletion
  - **Deliverable:** Teachers can create classrooms

- [x] **Day 2-4: Student Enrollment**
  - Join code entry (parent side)
  - Child enrollment flow
  - Unenrollment functionality
  - Enrollment notifications
  - **Deliverable:** Parents can join classrooms

- [x] **Day 4-6: Teacher-Initiated Tests**
  - Student selection from roster
  - Test mode selection
  - Test supervision interface
  - Result sharing with parents
  - **Deliverable:** Teachers can initiate tests

- [x] **Day 6-7: Teacher Dashboard**
  - Class progress overview
  - Student statistics table
  - Risk distribution chart
  - Engagement metrics
  - **Deliverable:** Teacher analytics dashboard

**Milestone:** ✅ Complete teacher classroom system

---

### Week 10: Learning Support & Games (Part 1)

**Dates:** March 24-30, 2026

#### Tasks
- [x] **Day 1-3: Reading Mode - Basic**
  - Reading content display
  - Text-to-speech integration (English)
  - Text-to-speech integration (Arabic)
  - Word highlighting
  - Audio speed controls
  - **Deliverable:** Basic assistive reading works

- [x] **Day 3-5: Reading Preferences**
  - Preference settings page
  - Font family options
  - Letter spacing controls
  - Background color selection
  - Text size controls
  - Preference persistence
  - **Deliverable:** Child reading preferences working

- [x] **Day 5-7: Game 1 - Syllable Splitter**
  - Game UI
  - Syllable splitting logic
  - Progressive difficulty
  - Timer implementation
  - Score tracking
  - Arabic & English support
  - **Deliverable:** First game complete

**Milestone:** ✅ Reading mode and first game operational

---

### Week 11: Games & Sessions

**Dates:** March 31 - April 6, 2026

#### Tasks
- [x] **Day 1-2: Game 2 - Sound Matching**
  - Audio playback system
  - Multiple choice UI
  - Answer validation
  - Arabic & English audio
  - **Deliverable:** Second game complete

- [x] **Day 2-3: Game 3 - Word Builder**
  - Letter scrambling
  - Drag-and-drop interface
  - Hint system
  - **Deliverable:** Third game complete

- [x] **Day 3-5: Game Progression System**
  - Level system implementation
  - Points accumulation
  - Streak tracking
  - Level unlocking
  - Progress persistence
  - **Deliverable:** Game progression working

- [x] **Day 5-7: Session System**
  - Session creation API
  - Unique code generation
  - Session access page (no login)
  - Session expiration handling
  - Session activity tracking
  - **Deliverable:** Time-limited sessions working

**Milestone:** ✅ All games and session system complete

**Phase 3 Review:** Test teacher workflows, game functionality, and session access

---

## Phase 4: Polish & Launch (Weeks 12-14)

**Goal:** Testing, deployment, documentation, and final preparations

### Week 12: Assignment System & Child Claiming

**Dates:** April 7-13, 2026

#### Tasks
- [x] **Day 1-3: Assignment System**
  - Assignment creation form
  - Assignment types (games, reading, exercises)
  - Student/classroom selection
  - Due date management
  - Assignment completion tracking
  - Notifications to parents
  - **Deliverable:** Assignment system complete

- [x] **Day 3-5: Child Profile Claiming**
  - Parent search interface
  - Claim request submission
  - Teacher review interface
  - PII masking/revealing (with logging)
  - Approval/rejection flow
  - Claim status notifications
  - **Deliverable:** Claiming system complete

- [x] **Day 5-7: Exercise Engine - Basic**
  - Syllable splitting exercise
  - Missing letter exercise
  - Simple scoring
  - **Deliverable:** Basic exercises working

**Milestone:** ✅ All major features implemented

---

### Week 13: Testing, Admin & Deployment

**Dates:** April 14-20, 2026

#### Tasks
- [x] **Day 1-2: Admin System**
  - Admin user management dashboard
  - Content approval interface
  - System metrics dashboard
  - User suspension functionality
  - **Deliverable:** Basic admin panel

- [x] **Day 2-3: Integration Testing**
  - Test complete parent workflows
  - Test complete teacher workflows
  - Test all test modes
  - Test subscription flows
  - Cross-browser testing
  - **Deliverable:** Test report with issues

- [x] **Day 3-4: Bug Fixes**
  - Fix critical bugs from testing
  - UI/UX improvements
  - Performance optimizations
  - **Deliverable:** Stable application

- [x] **Day 4-6: Production Deployment**
  - Deploy ML service to production
  - Deploy PostgreSQL (production)
  - Configure object storage (production)
  - Deploy Next.js app to production
  - Set up domain and SSL
  - Configure production environment variables
  - **Deliverable:** Live production site

- [x] **Day 6-7: Monitoring Setup**
  - Error tracking (Sentry)
  - Logging configuration
  - Uptime monitoring
  - Performance monitoring
  - **Deliverable:** Monitoring dashboards

**Milestone:** ✅ Production deployment successful

---

### Week 14: Documentation & Final Presentation

**Dates:** April 21-27, 2026

#### Tasks
- [x] **Day 1-2: User Documentation**
  - Parent user guide
  - Teacher user guide
  - Test administration guide
  - FAQ document
  - **Deliverable:** User documentation PDF

- [x] **Day 2-3: Technical Documentation**
  - API documentation (Swagger)
  - Database schema documentation
  - Deployment guide
  - Developer setup guide
  - **Deliverable:** Technical documentation

- [x] **Day 3-4: Video Demos**
  - Parent workflow demo video
  - Teacher workflow demo video
  - Test-taking demo video
  - Admin panel demo video
  - **Deliverable:** Demo videos

- [x] **Day 4-6: Final Presentation Preparation**
  - Create presentation slides
  - Prepare live demo
  - Practice presentation
  - Backup demo recordings
  - **Deliverable:** Presentation ready

- [x] **Day 6-7: Final Review & Submission**
  - Code cleanup
  - Final testing
  - Project submission
  - **Deliverable:** Project submitted

**Milestone:** ✅ Project complete and presented

---

## Resource Allocation

### Team Composition (Adjust based on actual team)

| Role | Responsibilities | Primary Weeks |
|------|------------------|---------------|
| **Frontend Developer 1** | UI/UX, React components, parent dashboard | All weeks |
| **Frontend Developer 2** | Test system UI, teacher dashboard, games | Weeks 4-11 |
| **Backend Developer 1** | APIs, database, authentication | Weeks 1-8 |
| **Backend Developer 2** | ML integration, object storage, notifications | Weeks 5-12 |
| **Full-Stack Developer** | Session system, admin panel, deployment | Weeks 9-14 |
| **QA/Testing Lead** | Testing, bug tracking, documentation | Weeks 12-14 |

*Note: Adjust roles based on actual team size.  Smaller teams will need to multi-task.*

---

## Dependencies & Critical Path

### Critical Path Tasks (Cannot be parallelized)

1. **Week 1:** Database setup → Authentication setup
2. **Week 2:** Authentication → Child profiles
3. **Week 3:** Child profiles → Test system
4. **Week 5:** Tobii service integration → Test flow
5. **Week 6:** Test flow → ML integration
6. **Week 7:** ML integration → Results display

### Parallel Work Streams

After Week 8, several features can be developed in parallel:

- **Stream A:** Teacher system (Weeks 9-12)
- **Stream B:** Learning support & games (Weeks 10-11)
- **Stream C:** Session system (Week 11)
- **Stream D:** Admin system (Week 13)

---

## Risk Management & Buffers

### High-Risk Areas

| Risk | Impact | Mitigation | Buffer |
|------|--------|------------|--------|
| **ML service integration issues** | High | Early integration testing in Week 6 | +2 days |
| **Tobii WebSocket connection problems** | Medium | Fallback to webcam-only mode | +1 day |
| **Stripe webhook issues** | Medium | Thorough testing in staging | +1 day |
| **TTS quality for Arabic** | Medium | Test multiple TTS providers early | +2 days |
| **Object storage configuration** | Low | Use managed service (S3) | +1 day |
| **Production deployment issues** | High | Deploy early to staging | +2 days |

### Buffer Allocation

- **Week 8:** 2-day buffer before Phase 3
- **Week 11:** 1-day buffer before Phase 4
- **Week 13:** 2-day buffer for deployment issues
- **Week 14:** Entire week is flexible for polish

---

## Testing Strategy

### Testing Schedule

| Week | Testing Type | Focus |
|------|-------------|--------|
| **Week 3** | Unit tests | Authentication, APIs |
| **Week 6** | Integration tests | ML service, Tobii service |
| **Week 8** | E2E tests | Parent test-taking flow |
| **Week 11** | Integration tests | Teacher system, games |
| **Week 13** | Full regression | All features, cross-browser |
| **Week 14** | UAT | User acceptance testing |

---

## Milestones & Deliverables

### Major Deliverables

| Week | Deliverable | Stakeholder Demo |
|------|------------|------------------|
| **Week 3** | Working authentication and subscription | ✅ |
| **Week 6** | First complete test (Tobii mode) | ✅ |
| **Week 8** | Parent dashboard with test results | ✅ |
| **Week 11** | Teacher system and all games | ✅ |
| **Week 13** | Production deployment | ✅ |
| **Week 14** | Final presentation | ✅ |

---

## Optional/Stretch Features

If ahead of schedule, consider implementing:

1. **LLM Content Generation** (Week 12-13)
   - Automated paragraph generation
   - Exercise question generation

2. **Advanced Exercise Types** (Week 11)
   - Phoneme matching
   - Rhyme matching

3. **Browser Push Notifications** (Week 12)
   - Web push API integration

4. **Advanced Analytics** (Week 13)
   - Custom date range reports
   - Cohort analysis for teachers

5. **Mobile App (React Native)** (Post-launch)
   - Native mobile experience for dashboards

---

## Communication & Meetings

### Weekly Cadence

- **Monday:** Week planning meeting (1 hour)
- **Wednesday:** Mid-week sync (30 min)
- **Friday:** Demo & retrospective (1 hour)

### Phase Milestones

- **End of Week 3, 8, 11, 14:** Stakeholder demo
- **End of Week 8:** Mid-project formal review
- **Week 14:** Final presentation

---

## Success Criteria

### Minimum Viable Product (MVP) Checklist

By Week 13, the following must be complete:

- [ ] Parent can register and create child profiles
- [ ] Subscription/payment system working
- [ ] Both test modes (Tobii & Webcam) functional
- [ ] ML service integration working
- [ ] Test results display with PDF reports
- [ ] Parent dashboard with test history
- [ ] Teacher can create classrooms and view students
- [ ] At least 1 educational game working
- [ ] Basic reading mode functional
- [ ] Session system working
- [ ] Notification system (at least email)
- [ ] Production deployment successful

---

## Conclusion

This timeline provides a realistic 14-week schedule for completing the Lexora platform. The schedule prioritizes core functionality first (testing and parent features) before moving to extended features (teacher system and games). 

**Key Success Factors:**
- ✅ Start with solid foundation (Weeks 1-3)
- ✅ Early integration with ML service (Week 6)
- ✅ Buffer time for high-risk areas
- ✅ Parallel development streams after Week 8
- ✅ Dedicated testing and deployment time

**Flexibility:** This timeline assumes a team of 3-5 developers.  Adjust task assignments based on actual team size and expertise.  The buffer time and optional features provide flexibility for unexpected challenges or faster-than-expected progress.

**Next Steps:**
1. Review timeline with team
2. Assign specific developers to roles
3. Set up project management tool (Jira, Linear, etc.)
4. Create Week 1 detailed task breakdown
5. Begin development! 

---

**Document Version:** 1.0  
**Last Updated:** January 17, 2026  
**Next Review:** End of Week 3 (February 9, 2026)