# Non-Functional Requirements Specification

## Lexora - Dyslexia Screening and Learning Support Platform

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Performance Requirements](#2-performance-requirements)
3. [Scalability Requirements](#3-scalability-requirements)
4. [Availability & Reliability](#4-availability--reliability)
5. [Security Requirements](#5-security-requirements)
6. [Usability Requirements](#6-usability-requirements)
7. [Compatibility Requirements](#7-compatibility-requirements)
8. [Maintainability Requirements](#8-maintainability-requirements)
9. [Data Requirements](#9-data-requirements)
10. [Localization Requirements](#10-localization-requirements)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the non-functional requirements for Lexora, defining the quality attributes, constraints, and standards the system must meet.

### 1.2 Scope

These requirements apply to all system components:

- Web application (Next.js frontend/backend)
- ML prediction service (FastAPI)
- Tobii helper application (CustomTkinter)
- Database and storage systems (Postgres and S3/MinIO)
- Third-party integrations

---

## 2. Performance Requirements

### NFR-2.1 Page Load Time

The web application shall load pages within acceptable time limits:

- Initial page load: ≤ 3 seconds on standard broadband connection
- Subsequent navigation: ≤ 1 second (client-side routing)
- Dashboard data load: ≤ 2 seconds

---

### NFR-2.2 API Response Time

Backend APIs shall respond within acceptable time limits:

- Standard API calls: ≤ 500ms (95th percentile)
- ML prediction requests: ≤ 10 seconds (includes model inference)
- Authentication requests: ≤ 1 second

---

### NFR-2.3 Real-Time Data Streaming

Gaze data streaming shall meet minimum requirements:

- Tobii WebSocket: ≥ 30Hz data rate
- Webcam gaze capture: ≥ 30 FPS
- Maximum latency: ≤ 100ms for real-time visualization

---


## 3. Scalability Requirements

### NFR-3.1 Horizontal Scalability

The system shall be designed for horizontal scaling:

- Stateless API design for load balancing
- Database connection pooling
- ML service containerized for replication

---

### NFR-3.2 Storage Scalability

The system shall handle growing data volumes:

- Object storage for fixation data (unlimited capacity)
- Database partitioning strategy for large datasets
- Archival strategy for historical data

---

### NFR-3.3 Content Scalability

The system shall support growing content library:

- No hard limit on number of paragraphs
- No hard limit on number of exercises
- Efficient content querying with pagination

---

## 4. Availability & Reliability

### NFR-4.1 System Availability

The system shall maintain high availability:

- Target uptime: 99.5% (excluding planned maintenance)
- Planned maintenance windows: Off-peak hours only
- Status page for system health

---

### NFR-4.2 Fault Tolerance

The system shall handle failures gracefully:

- Automatic retry for transient failures
- Circuit breaker pattern for external services
- Graceful degradation when ML service unavailable

---

### NFR-4.3 Data Durability

The system shall protect against data loss:

- Database backups: Daily automated backups
- Backup retention: Minimum 30 days
- Point-in-time recovery capability

---

### NFR-4.4 Disaster Recovery

The system shall have recovery procedures:

- Recovery Time Objective (RTO): ≤ 4 hours
- Recovery Point Objective (RPO): ≤ 1 hour
- Documented recovery procedures

---

## 5. Security Requirements

### NFR-5.1 Authentication Security

The system shall implement secure authentication:

- OAuth 2.0 / OpenID Connect for social login
- Secure session management
- Session timeout after inactivity
- Protection against brute force attacks

---

### NFR-5.2 Data Encryption

The system shall encrypt sensitive data:

- HTTPS (TLS 1.2+) for all communications
- Encryption at rest for database
- Encryption at rest for object storage
- Secure key management

---

### NFR-5.3 Authorization

The system shall enforce proper access control:

- Role-based access control (Guardian, Teacher, Admin)
- Resource-level permissions (child belongs to guardian)
- API authorization on all endpoints

---

### NFR-5.4 Child Data Protection

The system shall protect child data according to regulations:

- COPPA compliance considerations
- Minimal data collection
- Guardian consent for all child data
- No direct child authentication

---

### NFR-5.5 Input Validation

The system shall validate all inputs:

- Server-side validation on all endpoints
- SQL injection prevention
- XSS prevention
- CSRF protection

---

### NFR-5.6 API Security

The system shall secure API communications:

- Rate limiting on public endpoints
- API authentication for internal services
- Request size limits
- Logging of security events

---

### NFR-5.7 PII Protection

The system shall protect Personally Identifiable Information (PII):

**Field-Level Encryption:**

- National ID numbers encrypted at rest using AES-256
- Encryption keys managed separately from database
- Decryption only occurs at application layer when explicitly needed

**PII Access Controls:**

- Access to sensitive fields (national ID, phone) requires explicit user action
- All PII access logged in audit trail (who viewed, when, why)
- Automatic masking in UI (show only last 4 digits of national ID, last 2 of phone)
- Full reveal requires confirmation and is logged

**Data Minimization:**

- PII collected only when necessary (claim requests)
- Clear purpose stated at collection time
- PII not included in logs or error messages

---

## 6. Usability Requirements

### NFR-6.1 Accessibility

The system shall be accessible:

- WCAG 2.1 Level AA compliance for guardian interfaces
- Keyboard navigation support
- Screen reader compatibility for dashboards
- Sufficient color contrast

---

### NFR-6.2 Child-Friendly Design

The system shall be designed for children:

- Simple, clear instructions
- Large interactive elements
- Minimal text, maximum visual cues
- Encouraging feedback (no negative messages)

---

### NFR-6.3 Responsive Design

The system shall adapt to different screen sizes:

- Desktop optimized for tests/games/learning
- Mobile-responsive dashboards and reports
- Minimum supported resolution: 1280x720 (tests)
- Tablet-friendly for dashboard viewing

---

### NFR-6.4 Error Handling

The system shall provide clear error messages:

- User-friendly error descriptions
- Actionable guidance for resolution
- No technical jargon in user-facing errors
- Logging of technical details for debugging

---

### NFR-6.5 Loading States

The system shall indicate loading states:

- Visual loading indicators for async operations
- Skeleton screens for content loading
- Progress indicators for long operations

---

## 7. Compatibility Requirements

### NFR-7.1 Browser Support

The web application shall support modern browsers:

- Google Chrome (latest 2 versions)
- Mozilla Firefox (latest 2 versions)
- Microsoft Edge (latest 2 versions)
- Safari (latest 2 versions)

---

### NFR-7.2 Operating System Support

The Tobii helper application shall support:

- Windows 10/11
- macOS 12+ (Monterey and later)
- Linux (Ubuntu 20.04+, for advanced users)

---

### NFR-7.3 Webcam Compatibility

Webcam mode shall work with:

- Built-in laptop webcams
- External USB webcams
- Minimum resolution: 720p
- Browser WebRTC support required

---

### NFR-7.4 Screen Resolution

The system shall support various resolutions:

- Minimum for tests: 1280x720
- Recommended: 1920x1080
- Support for high-DPI displays

---

## 8. Maintainability Requirements

### NFR-8.1 Code Quality

The codebase shall maintain quality standards:

- Linting and formatting enforcement (ESLint, Prettier, Ruff)
- Automated testing (unit, integration)
- Code review required for all changes
- Documentation for complex logic

---

### NFR-8.2 Deployment

The system shall support automated deployment:

- CI/CD pipeline for all services
- Containerized deployments (Docker)
- Environment parity (dev, staging, production)
- Rollback capability

---

### NFR-8.3 Monitoring

The system shall provide observability:

- Application logging (structured logs)
- Error tracking and alerting
- Performance monitoring
- Health check endpoints

---

### NFR-8.4 Configuration Management

The system shall use externalized configuration:

- Environment variables for configuration
- No secrets in codebase
- Configuration validation on startup

---

## 9. Data Requirements

### NFR-9.1 Data Retention

The system shall retain data appropriately:

- Test data: Retained indefinitely (required for ML retraining)
- Session data: Retained indefinitely
- Logs: Retained for 90 days
- Audit logs: Retained for 1 year
- Claim request PII: Deleted 30 days after resolution (approved or rejected)

---

### NFR-9.2 Data Export

The system shall support data export:

- Test reports exportable as PDF
- Guardian can request data export (GDPR consideration)

---

### NFR-9.3 Data Deletion

The system shall support data deletion:

- Account deletion removes personal data
- Child profile deletion removes child data
- Anonymization option for ML training data
- Claim request PII purged on parent request or automatically after retention period

---

## 10. Localization Requirements

### NFR-10.1 Language Support

The system shall support multiple languages:

- User interface: Arabic and English
- Content: Arabic and English
- Right-to-left (RTL) layout for Arabic

---

### NFR-10.2 Text-to-Speech

Audio features shall support both languages:

- Arabic text-to-speech
- English text-to-speech
- Natural-sounding voice quality

---

### NFR-10.3 Date and Number Formatting

The system shall format data appropriately:

- Date format based on user locale
- Number format based on user locale
