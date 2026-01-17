# Functional Requirements Specification

## Lexora - Dyslexia Screening and Learning Support Platform

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Roles & Access Control](#2-user-roles--access-control)
3. [Platform & Device Control](#3-platform--device-control)
4. [Test System](#4-test-system)
5. [Session System](#5-session-system)
6. [Learning Support System](#6-learning-support-system)
7. [Games System](#7-games-system)
8. [Teacher System](#8-teacher-system)
9. [Parent System](#9-parent-system)
10. [Notifications](#10-notifications)
11. [Content Generation](#11-content-generation)
12. [Data Storage](#12-data-storage)
13. [Language System](#13-language-system)
14. [Payment & Subscription](#14-payment--subscription)
15. [Admin System](#15-admin-system)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for Lexora, a web-based platform designed to screen children for dyslexia risk using eye-tracking technology and provide targeted learning support.

### 1.2 Scope

The system shall support:

- Dyslexia risk screening via Tobii eye tracker and webcam
- Guardian-controlled child profiles and testing
- Learning support tools (reading assistance, exercises)
- Educational games
- Teacher classroom management
- Subscription-based access control

### 1.3 Definitions

| Term | Definition |
|------|------------|
| Guardian | Parent or teacher responsible for child supervision |
| Child Profile | Non-authenticated account linked to guardian |
| Tobii Mode | Eye-tracking using Tobii hardware |
| Webcam Mode | Eye-tracking using browser webcam |
| Session | Time-limited access link for learning/games |
| Task | Individual reading test (syllables, pseudo-words, or meaningful text) |
| Fixation | A pause in eye movement where gaze remains relatively stable |

---

## 2. User Roles & Access Control

### FR-2.1 Guardian Registration

The system shall allow users to register as guardians with one of two roles:

- Parent
- Teacher

Only guardians can create accounts. Children cannot create accounts independently.

**Acceptance Criteria:**

- Registration form collects required information
- Email verification sent upon registration
- Only verified guardians can access the system

---

### FR-2.2 Child Profile Creation

The system shall allow guardians to create child profiles with the following attributes:

- Name
- Age
- Language (Arabic or English)

**Constraints:**

- Child profiles shall NOT have login credentials
- Access to child profile is always through guardian account or session link

**Acceptance Criteria:**

- Guardian can create multiple child profiles
- Each child profile is linked to the creating guardian
- Child's language selection is permanent (cannot be changed after creation)

---

### FR-2.3 Authentication

The system shall provide authentication mechanisms for guardians:

- Google social login
- Additional social login providers (optional, TBD)
- Password reset via email
- Email verification

**Session-Based Access for Children:**

- Children access learning/games via time-limited session links
- No authentication required for session access
- Sessions automatically expire after timeout

**Acceptance Criteria:**

- Google OAuth integration functional
- Failed login attempts are logged
- Session links expire after configurable duration

---

### FR-2.4 Child Profile Claiming

The system shall allow parents to claim child profiles created by teachers:

**Scenario:**

1. Teacher creates child profile for a student in their classroom
2. Parent joins the platform later
3. Parent requests to claim (link) the child to their account

**Claim Process:**

- Parent searches for child by name within a specific classroom
- System sends verification request to the teacher
- Teacher confirms the parent-child relationship
- Child profile is linked to both teacher and parent as guardians

**Constraints:**

- Original creator (teacher) remains as guardian
- Parent becomes additional guardian with PARENT relationship type
- Both guardians can view child's progress and test results

**Acceptance Criteria:**

- Parent can initiate claim request
- Teacher receives notification of claim request
- Teacher can approve or deny claim
- Approved claim links child to parent account
- Child profile shows both guardians after claim

---

## 3. Platform & Device Control

### FR-3.1 Device Restrictions

The system shall restrict certain features based on device type:

**Desktop/Laptop Only (tests, games, learning):**

- Dyslexia screening tests
- Learning sessions
- Game sessions

**All Devices Allowed (dashboards, reports, management):**

- Guardian dashboards
- Teacher analytics
- Child data viewing
- Report downloads
- Account management

**Acceptance Criteria:**

- System detects device type on feature access
- Blocked features show clear explanation
- Dashboard and reports accessible from mobile/tablet

**Rationale:** Eye-tracking and learning activities require larger screens and stable viewing distance.

---

### FR-3.2 Tobii Helper Integration

The system shall integrate with Tobii helper application for hardware-based eye tracking:

**Requirements:**

- Detect if Tobii helper app is running on user's machine
- Establish WebSocket connection to helper app
- Stream real-time fixation data from Tobii device
- Handle connection failures gracefully

**Acceptance Criteria:**

- System displays clear instructions if Tobii helper is not detected
- WebSocket connection established successfully
- Fixation data streamed in real-time
- Connection errors trigger user-friendly notifications

---

### FR-3.3 Webcam Mode

The system shall support webcam-based eye tracking as an alternative to Tobii hardware:

**Requirements:**

- Request camera permission via browser API
- Capture raw gaze data through browser
- Process gaze data and send to ML service

**Acceptance Criteria:**

- System explains accuracy difference between Tobii and webcam modes
- Camera permission request includes clear explanation
- Webcam preview shown during calibration
- System recommends Tobii mode when available

---

## 4. Test System

### FR-4.1 Supported Test Modes

The system shall support two test modes:

**Eye Tracker Mode (Tobii):**

- Three sequential tasks: syllables, pseudo-words, meaningful text
- High accuracy tracking via hardware
- Records fixation data

**Webcam Mode:**

- Single paragraph reading task
- Software-based tracking
- Records raw gaze data (converted to fixations by ML service)

**Acceptance Criteria:**

- Guardian selects test mode before starting
- System clearly explains accuracy differences between modes
- Both modes accessible through web interface

---

### FR-4.2 Test Tasks

The system shall provide task-specific content:

**Eye Tracker Tasks:**

1. **Syllables Task:** Child reads list of syllables
2. **Pseudo-words Task:** Child reads non-real words
3. **Meaningful Text Task:** Child reads paragraph with real sentences

**Webcam Task:**

1. **Paragraph Task:** Child reads one long paragraph

**Acceptance Criteria:**

- Content is age-appropriate
- Content matches child's selected language
- Tasks enforce sequential order in eye tracker mode (syllables → pseudo-words → meaningful text)

---

### FR-4.3 Test Orchestration

The system shall guide the child through testing process:

**Eye Tracker Mode Workflow:**

1. Calibration
2. Instructions for syllables task
3. Child completes syllables task (gaze recorded)
4. Instructions for pseudo-words task
5. Child completes pseudo-words task (gaze recorded)
6. Instructions for meaningful text task
7. Child completes meaningful text task (gaze recorded)
8. All three task fixations sent to ML service together
9. Result displayed

**Webcam Mode Workflow:**

1. Calibration
2. Instructions for paragraph task
3. Child reads paragraph (gaze recorded)
4. Raw gaze sent to ML service
5. Result displayed

**Constraints:**

- Tasks cannot be skipped in eye tracker mode
- Task order is enforced
- Child cannot control task progression

**Acceptance Criteria:**

- Instructions are clear and age-appropriate
- Visual indicators show current task and progress
- Guardian supervises entire test

---

### FR-4.4 Calibration System

The system shall perform calibration before any test:

**Calibration Process:**

1. Display calibration targets
2. Record gaze accuracy for each point
3. Calculate tracking quality metrics
4. Verify minimum accuracy threshold

**Tobii Calibration:**

- Block test if calibration fails
- Allow guardian to restart calibration

**Webcam Calibration:**

- Allow test to proceed with warning if accuracy is lower
- Display guidance for improvement:
  - Adjust lighting conditions
  - Remove backlighting
  - Center face in camera
  - Maintain stable distance
  - Reduce head movement

**Acceptance Criteria:**

- Calibration quality metrics displayed to guardian
- Guardian can retry calibration
- Clear guidance provided for failed or low-quality calibration

---

### FR-4.5 Retake Logic

The system shall allow guardian-controlled task retakes:

**Rules:**

- Guardian can request retake during or after a task
- Maximum retakes per task (tracked locally)
- Child cannot initiate retakes

**Eye Tracker Mode:**

- Retake available per individual task
- Guardian decides based on observation (e.g., child was distracted)

**Webcam Mode:**

- Retake available before submitting to ML service

**Acceptance Criteria:**

- Retake limit enforced
- Retake count tracked per test session
- Clear indication of remaining retakes

---

### FR-4.6 Gaze Data Recording

The system shall record gaze data during tests:

**Eye Tracker Mode (Tobii):**

- Fixation coordinates (x, y)
- Fixation timestamps
- Fixation durations
- Screen resolution metadata

**Webcam Mode:**

- Raw gaze point coordinates (x, y)
- Timestamps
- Screen resolution metadata

**Acceptance Criteria:**

- Timestamps are monotonically increasing
- No data loss during recording
- Data format compatible with ML service

---

### FR-4.7 ML Service Communication

The system shall communicate with ML prediction service:

**Eye Tracker Mode:**

- Send fixation data for all three tasks together
- Receive prediction result

**Webcam Mode:**

- Send raw gaze data
- Receive prediction result and extracted fixations

**Response Data:**

- Dyslexia probability
- Confidence score
- Risk level (low, medium, high)

**Acceptance Criteria:**

- Retry logic handles transient failures
- Error responses logged
- Network errors shown to guardian with retry option

---

### FR-4.8 Result Interpretation

The system shall convert ML predictions into user-friendly results:

**Risk Level Classification:**

- **Low Risk:** Green indicator
- **Medium Risk:** Yellow indicator
- **High Risk:** Red indicator

**Display Components:**

- Color-coded risk indicator
- Confidence score (percentage)
- Explanation of what the result means
- Recommendations for next steps

**Acceptance Criteria:**

- Results displayed after prediction completes
- Clear visual distinction between risk levels

---

### FR-4.9 Test Reports

The system shall generate test reports:

**Report Contents:**

- Test date and time
- Child name and age
- Test mode (Tobii/Webcam)
- Risk level and probability
- Confidence score
- Comparison with previous tests (if any)
- Recommendations

**Delivery:**

- Instant in-app notification to guardian
- Downloadable from guardian dashboard (PDF)

**Acceptance Criteria:**

- Reports generated after test completion
- PDF format is printer-friendly
- Historical comparison included when previous tests exist

---

## 5. Session System

### FR-5.1 Session Creation

The system shall allow guardians to generate time-limited session links:

**Session Configuration:**

- Select child profile
- Choose session type: Learning or Games

**Generated Session:**

- Unique URL or code
- Pre-configured with child preferences
- No authentication required

**Acceptance Criteria:**

- Session link/code generated instantly
- Link is copyable and shareable

---

### FR-5.2 Session Access

The system shall provide frictionless session access for children:

**Access Flow:**

1. Child opens session link or enters code
2. System loads child preferences automatically
3. Content restricted to session type (learning or games)
4. Session expires after timeout or guardian terminates

**Acceptance Criteria:**

- No login required
- Expiration timer visible
- Warning shown before expiration

---

### FR-5.3 Session Tracking

The system shall track child activity during sessions:

**Tracked Metrics:**

- Session start/end time
- Total time spent
- Tasks/games completed
- Scores achieved

**Acceptance Criteria:**

- Metrics stored in real-time
- Guardian can view session history

---

## 6. Learning Support System

### FR-6.1 Reading Mode

The system shall provide assistive reading interface:

**Features:**

- Word-by-word highlighting during narration
- Line focus (dims surrounding text)
- Audio narration with speed control
- Tap word to hear pronunciation
- Progress indicator

**Acceptance Criteria:**

- Highlighting synchronized with audio
- Audio speed adjustable
- Text-to-speech supports Arabic and English
- Pronunciation playback on word tap

---

### FR-6.2 Reading Content Management

The system shall organize reading content with metadata:

**Content Attributes:**

- Title
- Body text (paragraphs)
- Difficulty level
- Target age range
- Language (Arabic/English)
- Category tags (fiction, non-fiction, science, etc.)
- Approval status

**Acceptance Criteria:**

- Content filterable by all attributes
- Admin can manage difficulty rating

---

### FR-6.3 Child Reading Preferences

The system shall allow guardians to configure reading preferences per child:

**Configurable Settings (predefined options only):**

- Font family (selection from provided fonts, e.g., OpenDyslexic, Arial)
- Letter spacing (normal, wide, extra-wide)
- Background color (selection from provided colors)
- Text size (small, medium, large, extra-large)
- Audio narration speed (selection from provided speeds)

**Acceptance Criteria:**

- Preferences persist across sessions
- Changes applied instantly
- Preview shown before saving
- Only predefined options available (no custom values)

---

### FR-6.4 Exercise Engine

The system shall provide interactive reading exercises:

**Exercise Types:**

1. **Syllable Splitting:** Split word into syllables
2. **Missing Letter:** Complete word with correct letter
3. **Phoneme Matching:** Match sounds to words
4. **Rhyme Matching:** Identify rhyming words

**Exercise Selection:**

- Auto-selected based on child's level
- Adaptive difficulty based on performance

**Scoring:**

- Accuracy (correct/total)
- Time taken
- Attempts needed

**Acceptance Criteria:**

- Immediate feedback on answers
- Progress saved after each exercise

---

## 7. Games System

### FR-7.1 Game Catalog

The system shall provide educational games:

**Game 1: Syllable Splitter**

- Present word, child splits into syllables
- Progressive difficulty with longer words
- Timed challenges

**Game 2: Sound Matching**

- Play audio of word/sound
- Child selects matching word from options
- Phonetic awareness training

**Game 3: Word Builder**

- Scrambled letters presented
- Child reorders to form correct word
- Hint system available

**Acceptance Criteria:**

- All games support Arabic and English
- Games adapted to child's difficulty level
- Audio quality suitable for phoneme discrimination

---

### FR-7.2 Game Progression

The system shall implement progression mechanics:

**Progression Features:**

- Level system per game
- Points/score accumulation
- Streak tracking (consecutive correct answers)
- Unlockable harder levels

**Acceptance Criteria:**

- Levels unlock upon completion
- Score persists across sessions
- Visual feedback for level-up

---

### FR-7.3 Game Tracking

The system shall track game performance:

**Tracked Metrics:**

- Current level per game
- Total score
- Accuracy rate
- Time spent per game

**Acceptance Criteria:**

- Metrics updated in real-time
- Guardian can view statistics

---

## 8. Teacher System

### FR-8.1 Classroom Management

The system shall allow teachers to manage classrooms:

**Classroom Features:**

- Create classroom with name and language
- Generate unique join code
- View enrolled students
- Delete classrooms

**Constraints:**

- Classroom creation limited for non-subscribed teachers

**Acceptance Criteria:**

- Each classroom has unique join code
- Classroom language determines available content
- Subscription limits enforced

---

### FR-8.2 Student Enrollment

The system shall support student enrollment via join codes:

**Enrollment Flow:**

1. Teacher shares classroom join code
2. Parent enters code in their dashboard
3. Parent selects which child to enroll
4. Child linked to classroom

**Acceptance Criteria:**

- Join code valid until classroom deleted
- Parent can enroll child in multiple classrooms
- Parent can unenroll child anytime
- Teacher sees enrollment notifications

---

### FR-8.3 Teacher-Initiated Tests

The system shall allow teachers to initiate tests for students:

**Test Workflow:**

1. Teacher selects student from classroom
2. Teacher chooses test mode (Tobii/Webcam)
3. Test session generated
4. Teacher supervises test
5. Results shared with teacher and parent

**Acceptance Criteria:**

- Teacher sees test progress
- Teacher can terminate test if needed
- Results automatically shared with parent

---

### FR-8.4 Assignment System

The system shall allow teachers to assign tasks:

**Assignment Types:**

- Specific games
- Reading tasks
- Exercise sets

**Assignment Flow:**

1. Teacher creates assignment
2. Teacher selects students or entire classroom
3. System notifies students
4. Students complete assignment
5. Teacher reviews completion

**Acceptance Criteria:**

- Assignments have optional due dates
- Notifications sent to parents
- Teacher sees completion status per student

---

### FR-8.5 Teacher Dashboard

The system shall provide analytics dashboard for teachers:

**Dashboard Metrics:**

- Class progress overview
- Individual student statistics
- Risk distribution (low/medium/high counts)
- Engagement metrics

**Acceptance Criteria:**

- Dashboard reflects current data
- Filterable by date range

---

## 9. Parent System

### FR-9.1 Parent Dashboard

The system shall provide comprehensive parent dashboard:

**Dashboard Features:**

- View all child profiles
- Initiate tests
- Start learning sessions
- Start game sessions
- View test reports
- View activity history
- Manage preferences

**Acceptance Criteria:**

- All children displayed in card layout
- Quick actions accessible from each child card

---

### FR-9.2 Test History

The system shall maintain complete test history per child:

**History View:**

- Chronological list of all tests
- Risk level trend
- Comparison between tests
- Downloadable reports

**Acceptance Criteria:**

- History retained indefinitely
- Export to PDF available

---

### FR-9.3 Notification Preferences

The system shall allow parents to configure notifications:

**Configurable Notifications:**

- Test results
- Weekly summary
- Assignment notifications
- Inactivity alerts

**Acceptance Criteria:**

- Preferences saved per notification type
- Opt-out available for non-critical notifications

---

## 10. Notifications

### FR-10.1 Notification Channels

The system shall support multiple notification channels:

**Channels:**

- In-app notifications (bell icon)
- Email notifications
- Push notifications (browser)

**Acceptance Criteria:**

- Notifications delivered
- In-app badge shows unread count
- Email includes direct action links

---

### FR-10.2 Parent Notifications

The system shall send notifications to parents for key events:

**Notification Triggers:**

- Test completed
- Weekly activity summary
- Inactivity alert (after period of no login)
- Assignment due reminder

**Acceptance Criteria:**

- Unsubscribe option in emails

---

### FR-10.3 Teacher Notifications

The system shall send notifications to teachers for classroom events:

**Notification Triggers:**

- Scheduled test reminder
- Student completed assignment
- New student enrolled in classroom
- Class summary

**Acceptance Criteria:**

- Reminders dismissible after acknowledged

---

## 11. Content Generation

### FR-11.1 LLM-Based Content Generation

The system shall automatically generate educational content using LLM:

**Generated Content Types:**

- Reading paragraphs (various topics and difficulties)
- Exercise questions
- Game content (word lists)

**Generation Schedule:**

- Periodic batch job (e.g., weekly)
- Generates content per language
- Balances difficulty levels

**Generation Rules:**

- Content age-appropriate
- Language-specific grammar rules
- Diverse topics
- Controllable difficulty parameters

**Acceptance Criteria:**

- Generated content marked as "pending approval"
- Error handling for API failures

---

### FR-11.2 Content Approval Workflow

The system shall require admin approval before content is visible:

**Approval Process:**

1. Admin reviews generated content
2. Admin can edit content before approval
3. Admin approves or rejects
4. Approved content marked as "active"
5. Only active content visible to users

**Acceptance Criteria:**

- Admin dashboard shows pending content count
- Rejected content removed from queue

---

## 12. Data Storage

### FR-12.1 Fixation Data Storage

The system shall store fixation data for each test:

**Eye Tracker Mode:**

- Fixations received from Tobii helper
- Stored in backend after test completion

**Webcam Mode:**

- Raw gaze sent to ML service
- ML service returns prediction AND extracted fixations
- Fixations stored in backend after receiving from ML service

**Storage Requirements:**

- Fixation data stored in object storage (S3-compatible)
- Organized by child and test identifiers
- Retained for historical analysis and potential ML retraining

**Acceptance Criteria:**

- Upload completes successfully
- Data retrievable for report generation

---

### FR-12.2 Test Metadata Storage

The system shall store test metadata in database:

**Stored Information:**

- Test identifier
- Child identifier
- Guardian identifier
- Test mode (Tobii/Webcam)
- Test timestamp
- Language
- Risk level
- Probability and confidence scores
- Reference to fixation data storage location
- Reference to generated report

**Acceptance Criteria:**

- Queries perform efficiently
- Data integrity maintained

---

## 13. Language System

### FR-13.1 Language Assignment

The system shall enforce one language per child:

**Rules:**

- Guardian selects language during child profile creation
- Selection is permanent (cannot be changed)
- Language determines all content filtering

**Supported Languages:**

- Arabic
- English

**Acceptance Criteria:**

- Language selection required before profile creation
- Confirmation warns that selection is permanent

---

### FR-13.2 Content Language Filtering

The system shall filter all content by language:

**Filtering Rules:**

- Test paragraphs shown only in child's language
- Learning content restricted to child's language
- Games present words in child's language
- Classroom language matches content

**Acceptance Criteria:**

- No content from other language visible to child
- Empty state shown if no content available

---

## 14. Payment & Subscription

### FR-14.1 Subscription Plans

The system shall support tiered subscription plans:

**Free Plan:**

- Limited tests per month per child
- Access to basic games
- Limited learning content

**Premium Plan:**

- Unlimited tests
- All games unlocked
- Full learning content library
- Advanced analytics

**Acceptance Criteria:**

- Plan limits enforced in real-time
- Free users shown upgrade prompt when limit reached

---

### FR-14.2 Subscription Management

The system shall allow guardians to manage subscriptions:

**Features:**

- Subscribe to premium plan
- Cancel subscription
- View billing history

**Payment Integration:**

- Payment provider integration (e.g., Stripe, Clerk)
- Automatic billing
- Payment failure handling

**Acceptance Criteria:**

- Subscription changes effective appropriately
- Cancellation provides access until period end
- Failed payments trigger notification
- Invoices downloadable

---

### FR-14.3 Access Control Based on Plan

The system shall restrict features based on subscription plan:

**Enforcement Points:**

- Test initiation (check remaining quota)
- Game access (check if game unlocked)
- Learning content access (check plan)
- Classroom creation (check teacher plan)

**Acceptance Criteria:**

- Check performed before feature access
- Clear message shown when limit reached
- Upgrade option provided

---

## 15. Admin System

### FR-15.1 User Management

The system shall allow admins to manage users:

**Admin Capabilities:**

- View all users (guardians, children)
- Search users by email, name
- Suspend user accounts
- Reset user passwords
- View user activity logs

**Acceptance Criteria:**

- Search returns relevant results
- Account suspension immediate

---

### FR-15.2 Content Approval Dashboard

The system shall provide admin dashboard for content approval:

**Dashboard Features:**

- View pending content (paragraphs, exercises)
- Preview content as users see it
- Edit content before approval
- Approve or reject

**Acceptance Criteria:**

- Pending items displayed in queue
- Preview renders content accurately
- Bulk approve action available

---

### FR-15.3 System Metrics

The system shall provide operational metrics to admins:

**Metrics:**

- Total users (guardians, children)
- Active subscriptions
- Tests conducted
- Content generation status
- Error rates

**Acceptance Criteria:**

- Metrics updated periodically

---

### FR-15.4 Subscription Override

The system shall allow admins to grant free premium access:

**Use Cases:**

- Compensation for user issues
- Promotional access
- Research participants

**Acceptance Criteria:**

- Override can have expiration date
- User notified of premium access

