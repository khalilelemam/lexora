# Anticipated Risks and Challenges

## Lexora - Dyslexia Screening and Learning Support Platform

**Document Purpose:** This document identifies potential risks, challenges, and obstacles that may impact the successful completion of Senior Project 2, along with detailed mitigation and contingency plans.

**Last Updated:** January 17, 2026

---

## Risk Assessment Framework

### Risk Levels

| Level | Likelihood | Impact | Priority |
|-------|-----------|--------|----------|
| **Critical** | High probability, severe impact | Project failure or major delay | Immediate attention |
| **High** | Moderate-high probability, significant impact | Feature cuts or delays | Weekly monitoring |
| **Medium** | Moderate probability, moderate impact | Minor delays or workarounds | Bi-weekly review |
| **Low** | Low probability, minimal impact | Negligible effect | Monitor only |

---

## 1. Technical Risks

### 1.1 ML Service Integration Failures

**Risk Level:** 🔴 **Critical**

**Description:**  
The ML prediction service may fail to integrate properly with the web application, causing test results to be unavailable or inaccurate.

**Likelihood:** High (60%)  
**Impact:** Severe - Core functionality blocked

**Potential Issues:**
- ML service API changes or instability
- Network latency causing timeouts
- Incompatible data formats between web app and ML service
- ML model accuracy below acceptable threshold
- Service crashes under load

**Mitigation Plans:**

1. **Early Integration (Week 5-6)**
   - Begin integration testing immediately in Week 5
   - Don't wait until later phases to test ML connectivity
   - Run daily integration tests during development

2. **API Contract Definition**
   - Document exact request/response formats in Week 4
   - Create OpenAPI/Swagger spec for ML service
   - Use TypeScript types generated from API spec
   - Version the API (v1) to allow future changes

3. **Comprehensive Error Handling**
   - Implement retry logic with exponential backoff
   - Circuit breaker pattern for ML service calls
   - Graceful degradation if ML service is down
   - User-friendly error messages

4. **Monitoring & Logging**
   - Log all ML service requests/responses
   - Track success rates and response times
   - Set up alerts for failure rate > 5%

**Contingency Plans:**

- **Plan A:** If ML service is unstable, create a mock service for development
- **Plan B:** If integration fails, store test data and process asynchronously
- **Plan C:** If accuracy is poor, flag results as "preliminary" and allow manual review
- **Plan D:** Worst case - launch with Tobii-only mode (higher accuracy) and delay webcam mode

**Buffer Time:** +3 days in Week 6

---

### 1.2 Tobii Hardware Integration Issues

**Risk Level:** 🟠 **High**

**Description:**  
WebSocket connection to Tobii helper service may be unreliable, or fixation data may be corrupted/incomplete.

**Likelihood:** Moderate (40%)  
**Impact:** High - Limits test functionality

**Potential Issues:**
- WebSocket connection drops randomly
- Tobii service not detected on user's machine
- Fixation data format inconsistencies
- Cross-origin issues with WebSocket
- Tobii SDK compatibility issues (Windows/Mac)

**Mitigation Plans:**

1. **Robust Connection Handling**
   - Auto-reconnect logic for WebSocket drops
   - Heartbeat/ping mechanism to detect connection loss
   - Connection state visualization for users
   - Clear error messages when connection fails

2. **Data Validation**
   - Validate fixation data structure on receipt
   - Check for missing or malformed data points
   - Timestamp validation (monotonically increasing)
   - Reject invalid data and request retake

3. **User Guidance**
   - Step-by-step Tobii service installation guide
   - Troubleshooting documentation
   - Video tutorial for setting up Tobii service
   - Support contact for hardware issues

4. **Testing**
   - Test on multiple machines (Windows/Mac)
   - Test with actual Tobii hardware early (Week 5)
   - Simulate network issues and connection drops

**Contingency Plans:**

- **Plan A:** If WebSocket is unreliable, implement polling as backup
- **Plan B:** If Tobii detection fails, provide manual connection override
- **Plan C:** Always offer webcam mode as alternative
- **Plan D:** Partner with local schools that have Tobii devices for testing

**Buffer Time:** +2 days in Week 5

---

### 1.3 Real-Time Gaze Tracking Performance

**Risk Level:** 🟠 **High**

**Description:**  
Browser-based webcam gaze tracking may have poor performance, high latency, or low accuracy.

**Likelihood:** Moderate (50%)  
**Impact:** High - Affects test quality

**Potential Issues:**
- Low frame rate (< 30 FPS) on older devices
- High CPU usage causing browser slowdown
- Poor accuracy in suboptimal lighting
- Calibration drift over time
- Cross-browser compatibility (Safari, Firefox)

**Mitigation Plans:**

1. **Performance Optimization**
   - Use Web Workers for gaze processing
   - Implement frame skipping if CPU overloaded
   - Optimize video processing pipeline
   - Set minimum device requirements

2. **Quality Checks**
   - Display real-time FPS counter during test
   - Show calibration quality score
   - Warn users if performance degrades
   - Auto-pause test if quality drops below threshold

3. **Environmental Guidance**
   - Lighting requirement checklist
   - Face positioning guide with live preview
   - Environmental setup instructions
   - Pre-test quality check

4. **Browser Testing**
   - Test on Chrome, Firefox, Safari, Edge
   - Document browser compatibility
   - Recommend Chrome for best performance

**Contingency Plans:**

- **Plan A:** If accuracy is poor, increase confidence threshold for "reliable" results
- **Plan B:** Provide "practice mode" to help users optimize setup
- **Plan C:** Mark webcam results as "screening only" vs Tobii "diagnostic"
- **Plan D:** Extend calibration phase with more checkpoints

**Buffer Time:** +2 days in Week 6

---

### 1.4 Database Performance & Scalability

**Risk Level:** 🟡 **Medium**

**Description:**  
Database queries may be slow, especially for complex analytics or with large datasets.

**Likelihood:** Low (30%)  
**Impact:** Moderate - Affects user experience

**Potential Issues:**
- Slow dashboard loading (>3 seconds)
- Test history queries timing out
- Analytics queries blocking other operations
- Database connection pool exhaustion
- Migration failures

**Mitigation Plans:**

1. **Query Optimization**
   - Add appropriate indexes from the start
   - Use Prisma query profiling
   - Implement pagination for large lists
   - Use database views for complex queries
   - Cache frequently accessed data (Redis)

2. **Connection Management**
   - Configure connection pooling properly
   - Monitor active connections
   - Set connection timeouts
   - Use read replicas for analytics (if needed)

3. **Data Archival Strategy**
   - Archive old test data after 2 years
   - Soft delete instead of hard delete
   - Partition large tables by date

4. **Load Testing**
   - Run load tests in Week 13
   - Simulate 100+ concurrent users
   - Test with realistic data volumes

**Contingency Plans:**

- **Plan A:** Implement Redis caching for dashboards
- **Plan B:** Use database query queue for heavy operations
- **Plan C:** Upgrade database tier if performance issues persist
- **Plan D:** Optimize specific slow queries case-by-case

**Buffer Time:** +1 day in Week 13

---

### 1.5 File Storage & Object Storage Issues

**Risk Level:** 🟡 **Medium**

**Description:**  
Object storage (S3/MinIO) for fixation data may have upload failures, slow retrieval, or cost overruns.

**Likelihood:** Low (25%)  
**Impact:** Moderate - Test data loss risk

**Potential Issues:**
- Failed uploads due to network issues
- Slow presigned URL generation
- Storage costs exceeding budget
- Data not retrievable for reports
- CORS issues with presigned URLs

**Mitigation Plans:**

1. **Reliable Upload Strategy**
   - Retry failed uploads (3 attempts)
   - Verify upload with checksum
   - Store upload status in database
   - Background job for retry queue

2. **Cost Management**
   - Use lifecycle policies (archive after 1 year)
   - Compress fixation data before upload
   - Monitor storage usage weekly
   - Set budget alerts in AWS

3. **Access Optimization**
   - Cache presigned URLs (1-hour expiry)
   - Use CDN for frequently accessed files
   - Lazy load fixation data (only when needed)

4. **Backup Strategy**
   - Enable versioning in S3
   - Daily backup of metadata
   - Test restore process

**Contingency Plans:**

- **Plan A:** If S3 is too expensive, use MinIO (self-hosted)
- **Plan B:** If uploads fail repeatedly, store data temporarily in database
- **Plan C:** Compress fixation data more aggressively
- **Plan D:** Store only summary statistics instead of raw fixation data

**Buffer Time:** +1 day in Week 7

---

## 2. Integration & Third-Party Risks

### 2.1 Stripe Payment Integration Issues

**Risk Level:** 🟠 **High**

**Description:**  
Payment processing may fail, webhooks may be unreliable, or subscription logic may have bugs.

**Likelihood:** Moderate (45%)  
**Impact:** High - Affects revenue and access control

**Potential Issues:**
- Webhook events not received
- Payment failures not handled gracefully
- Subscription status out of sync
- Testing environment vs production differences
- Currency/pricing configuration errors

**Mitigation Plans:**

1. **Webhook Reliability**
   - Use webhook signing verification
   - Implement idempotent webhook handlers
   - Retry webhook processing on failure
   - Log all webhook events
   - Manual reconciliation dashboard

2. **Subscription State Management**
   - Single source of truth (Stripe)
   - Sync subscription status on login
   - Grace period for failed payments
   - Clear user communication about payment status

3. **Thorough Testing**
   - Test all Stripe test cards in Week 3
   - Test webhook scenarios (success, failure, cancellation)
   - Test subscription edge cases (upgrade, downgrade, cancel)
   - Staging environment with Stripe test mode

4. **User Experience**
   - Clear error messages for payment failures
   - Retry payment option
   - Contact support link
   - Email notifications for payment issues

**Contingency Plans:**

- **Plan A:** If webhooks are unreliable, implement polling fallback
- **Plan B:** Manual subscription management dashboard for admin
- **Plan C:** Temporary "honor system" for beta users during testing
- **Plan D:** Delay payment integration and launch with free tier only

**Buffer Time:** +2 days in Week 3

---

### 2.2 Email Service Reliability

**Risk Level:** 🟡 **Medium**

**Description:**  
Email notifications may not be delivered, end up in spam, or have formatting issues.

**Likelihood:** Moderate (40%)  
**Impact:** Medium - Affects communication

**Potential Issues:**
- Emails marked as spam
- Delivery delays
- Email service rate limits
- Formatting broken in some email clients
- Email verification links expiring

**Mitigation Plans:**

1. **Email Deliverability**
   - Use reputable service (Resend, SendGrid)
   - Configure SPF, DKIM, DMARC records
   - Warm up sending domain gradually
   - Monitor bounce rates and spam complaints
   - Test with multiple email providers (Gmail, Outlook, etc.)

2. **Rate Limiting**
   - Implement email queue
   - Batch notification emails
   - Respect service provider limits
   - Upgrade plan if volume exceeds limits

3. **Email Design**
   - Use email-safe HTML templates
   - Test on multiple email clients
   - Plain text fallback
   - Responsive design for mobile

4. **Backup Channel**
   - In-app notifications as primary
   - Email as secondary
   - SMS for critical notifications (future)

**Contingency Plans:**

- **Plan A:** If deliverability is poor, switch email provider
- **Plan B:** Provide "resend email" option
- **Plan C:** Extend verification link expiry to 7 days
- **Plan D:** Rely more on in-app notifications

**Buffer Time:** +1 day in Week 8

---

### 2.3 Text-to-Speech Quality Issues

**Risk Level:** 🟡 **Medium**

**Description:**  
TTS engines may have poor pronunciation, especially for Arabic text, or high latency.

**Likelihood:** Moderate (50%)  
**Impact:** Medium - Affects learning experience

**Potential Issues:**
- Poor Arabic pronunciation/diacritics
- Unnatural voice quality
- High latency (> 2 seconds)
- TTS service costs
- Limited voice options

**Mitigation Plans:**

1. **Multi-Provider Testing**
   - Test Google Cloud TTS
   - Test Amazon Polly
   - Test Azure Speech Services
   - Compare quality and pricing
   - Choose best option by language

2. **Audio Caching**
   - Cache generated audio files
   - Pre-generate for common content
   - Store in object storage or CDN
   - Reduce API calls by 90%

3. **Pronunciation Improvements**
   - Use SSML for better control
   - Test with native speakers
   - Allow manual audio upload for problematic words
   - Pronunciation correction dictionary

4. **User Controls**
   - Voice selection option
   - Speed controls (0.5x - 2x)
   - Pitch adjustment (optional)

**Contingency Plans:**

- **Plan A:** If quality is poor, pre-record common paragraphs with human voice
- **Plan B:** Allow teachers to upload custom audio
- **Plan C:** Use multiple TTS providers (best for each language)
- **Plan D:** Launch with English only, add Arabic in update

**Buffer Time:** +2 days in Week 10

---

### 2.4 Authentication Provider Issues

**Risk Level:** 🟡 **Medium**

**Description:**  
Google OAuth may have downtime, rate limiting, or configuration issues.

**Likelihood:** Low (20%)  
**Impact:** High - Blocks user login

**Potential Issues:**
- OAuth service downtime
- Rate limit exceeded
- Misconfigured redirect URIs
- Token refresh failures
- User email not provided by Google

**Mitigation Plans:**

1. **Multi-Provider Strategy**
   - Implement Google OAuth (primary)
   - Add email/password as backup (Week 2)
   - Plan for additional providers (Microsoft, Apple)
   - Users can link multiple auth methods

2. **Error Handling**
   - Graceful fallback to email/password
   - Clear error messages
   - Retry mechanism for transient failures
   - Contact support option

3. **Configuration Management**
   - Document all OAuth settings
   - Test redirect URIs in staging
   - Separate dev/staging/prod OAuth apps
   - Monitor OAuth error rates

4. **Session Management**
   - Long session duration (30 days)
   - Automatic token refresh
   - Offline access consideration

**Contingency Plans:**

- **Plan A:** If Google OAuth fails, use email/password temporarily
- **Plan B:** Manual account creation by admin during outage
- **Plan C:** Queue auth requests and process when service recovers
- **Plan D:** Emergency "maintenance mode" with admin-only access

**Buffer Time:** +1 day in Week 2

---

## 3. User Experience & Accessibility Risks

### 3.1 Poor Test-Taking Experience for Children

**Risk Level:** 🟠 **High**

**Description:**  
Children may struggle with the test interface, become frustrated, or not complete tests. 

**Likelihood:** Moderate (45%)  
**Impact:** High - Invalid test results

**Potential Issues:**
- Confusing instructions
- Test too long or boring
- Technical issues during test
- Child loses focus
- Stressful test environment

**Mitigation Plans:**

1. **Child-Centered Design**
   - Use simple, clear language
   - Visual instructions with animations
   - Large, touchable UI elements
   - Friendly, encouraging tone
   - Progress indicators

2. **Engagement Features**
   - Animated transitions
   - Encouraging audio feedback
   - Reward animations after completion
   - Break option between tasks
   - Practice mode before real test

3. **User Testing**
   - Test with actual children (Week 8)
   - Observe test-taking sessions
   - Gather feedback from parents/teachers
   - Iterate on confusing elements

4. **Guardian Support**
   - Guardian present during test
   - Ability to pause/resume
   - Retake option if child distracted
   - Clear guardian instructions

**Contingency Plans:**

- **Plan A:** Simplify test flow based on user testing feedback
- **Plan B:** Add more breaks between tasks
- **Plan C:** Create "easy mode" with simpler content
- **Plan D:** Provide paper-based alternative for very young children

**Buffer Time:** +2 days in Week 8

---

### 3.2 Arabic Language Support Challenges

**Risk Level:** 🟠 **High**

**Description:**  
Right-to-left (RTL) layout, Arabic fonts, and text rendering may have issues.

**Likelihood:** Moderate (55%)  
**Impact:** High - Unusable for Arabic users

**Potential Issues:**
- RTL layout breaking UI components
- Mixed LTR/RTL text alignment issues
- Arabic fonts not loading
- Diacritics rendering incorrectly
- Number/date formatting issues
- TTS pronunciation issues (covered above)

**Mitigation Plans:**

1. **RTL-First Design**
   - Use Tailwind RTL utilities from start
   - Test every component in both directions
   - Use logical properties (start/end vs left/right)
   - Mirror layouts correctly

2. **Font Selection**
   - Choose Arabic-optimized web fonts
   - Ensure diacritics render correctly
   - Test font loading on slow connections
   - Fallback fonts for unsupported browsers

3. **Content Testing**
   - Native Arabic speaker on team or consultant
   - Test all Arabic content for correctness
   - Grammar and spelling checks
   - Cultural appropriateness review

4. **Internationalization (i18n)**
   - Use next-intl or react-i18next
   - Separate content from code
   - Locale-aware date/number formatting
   - Translation files for all UI strings

**Contingency Plans:**

- **Plan A:** If RTL is too complex, launch English-only first
- **Plan B:** Hire Arabic language consultant for critical review
- **Plan C:** Use pre-built RTL component library
- **Plan D:** Create separate Arabic-specific pages if layout issues persist

**Buffer Time:** +3 days across Weeks 10-11

---

### 3.3 Accessibility Compliance Issues

**Risk Level:** 🟡 **Medium**

**Description:**  
Platform may not be accessible to users with disabilities, violating WCAG standards.

**Likelihood:** Moderate (40%)  
**Impact:** Medium - Legal/ethical concerns

**Potential Issues:**
- Screen reader incompatibility
- Poor keyboard navigation
- Insufficient color contrast
- Missing ARIA labels
- Inaccessible forms
- Video/audio without captions/transcripts

**Mitigation Plans:**

1. **Accessibility from Start**
   - Use semantic HTML
   - ARIA labels on all interactive elements
   - Keyboard navigation support
   - Focus indicators visible
   - Use shadcn/ui (accessibility-first components)

2. **Color & Contrast**
   - Meet WCAG AA standards (4.5:1 contrast)
   - Don't rely on color alone for information
   - Test with color blindness simulators
   - High contrast mode option

3. **Testing**
   - Use automated tools (axe DevTools, Lighthouse)
   - Manual keyboard navigation testing
   - Screen reader testing (NVDA, VoiceOver)
   - User testing with disabled users (if possible)

4. **Documentation**
   - Accessibility statement page
   - Alternative contact methods
   - Keyboard shortcut documentation

**Contingency Plans:**

- **Plan A:** Fix critical issues first (keyboard nav, screen readers)
- **Plan B:** Progressive enhancement for accessibility features
- **Plan C:** Provide alternative accessible formats (PDF reports, etc.)
- **Plan D:** Accessibility improvements in v1.1 update

**Buffer Time:** +2 days in Week 13

---

## 4. Infrastructure & Deployment Risks

### 4.1 Production Deployment Failures

**Risk Level:** 🔴 **Critical**

**Description:**  
Deployment to production may fail due to configuration issues, service incompatibilities, or unexpected errors.

**Likelihood:** High (50%)  
**Impact:** Severe - Delays launch

**Potential Issues:**
- Environment variable misconfigurations
- Database migration failures
- SSL certificate issues
- CORS errors
- Service connectivity issues (ML, Tobii)
- Build failures in production
- Memory/CPU limits exceeded

**Mitigation Plans:**

1. **Staging Environment**
   - Create production-like staging environment
   - Deploy to staging first (Week 12)
   - Run full test suite on staging
   - Test with production-like data volumes

2. **Deployment Checklist**
   - Document all environment variables
   - Database migration rollback plan
   - Service health checks
   - Smoke test after deployment
   - Monitoring dashboard ready

3. **Gradual Rollout**
   - Deploy to staging in Week 12
   - Deploy to production in Week 13
   - Canary deployment if possible
   - Blue-green deployment for zero downtime

4. **Rollback Plan**
   - Database backup before migration
   - Previous version ready to redeploy
   - Feature flags for new features
   - Quick rollback procedure documented

**Contingency Plans:**

- **Plan A:** If production deployment fails, fix issues and redeploy next day
- **Plan B:** Use staging environment for demo if production not ready
- **Plan C:** Deploy only critical features, delay non-essential ones
- **Plan D:** Manual deployment if CI/CD pipeline fails

**Buffer Time:** +3 days in Week 13

---

### 4.2 Performance Issues in Production

**Risk Level:** 🟠 **High**

**Description:**  
Application may be slow or unresponsive under real-world load.

**Likelihood:** Moderate (40%)  
**Impact:** High - Poor user experience

**Potential Issues:**
- Slow page load times (>3 seconds)
- API timeouts
- Database connection exhaustion
- Memory leaks
- Unoptimized images/assets
- No caching strategy

**Mitigation Plans:**

1. **Performance Optimization**
   - Implement code splitting
   - Lazy load components and routes
   - Optimize images (next/image)
   - Minimize bundle size
   - Tree shaking unused code

2. **Caching Strategy**
   - Browser caching for static assets
   - CDN for media files
   - Redis for session data
   - API response caching (SWR/React Query)

3. **Monitoring**
   - Set up performance monitoring (Vercel Analytics, Web Vitals)
   - Track Core Web Vitals (LCP, FID, CLS)
   - Alert on performance degradation
   - Real user monitoring (RUM)

4. **Load Testing**
   - Load test with realistic user scenarios
   - Test with 100+ concurrent users
   - Identify bottlenecks
   - Optimize before launch

**Contingency Plans:**

- **Plan A:** If slow, implement aggressive caching
- **Plan B:** Upgrade server resources (vertical scaling)
- **Plan C:** Add CDN for all static assets
- **Plan D:** Optimize specific slow queries/pages case-by-case

**Buffer Time:** +2 days in Week 13

---

### 4.3 Service Downtime & Reliability

**Risk Level:** 🟡 **Medium**

**Description:**  
Production services may experience unexpected downtime or outages.

**Likelihood:** Low (25%)  
**Impact:** High - Service unavailable

**Potential Issues:**
- Database crashes
- ML service downtime
- Hosting provider outages
- DDoS attacks
- Certificate expiration
- Dependency service failures

**Mitigation Plans:**

1. **High Availability Setup**
   - Use managed services (Vercel, Railway, Supabase)
   - Database with automatic failover
   - Multi-region deployment (if budget allows)
   - Load balancer for ML service

2. **Monitoring & Alerts**
   - Uptime monitoring (UptimeRobot, Pingdom)
   - Error rate alerts
   - Disk space monitoring
   - SSL certificate expiry alerts
   - Alert channels (email, Slack)

3. **Incident Response**
   - On-call rotation (if team available)
   - Incident response playbook
   - Status page for users
   - Communication plan for outages

4. **Graceful Degradation**
   - Cache recent data for offline viewing
   - Queue operations when services down
   - Clear user messaging during outages

**Contingency Plans:**

- **Plan A:** If database down, switch to read replica
- **Plan B:** If ML service down, queue predictions for later processing
- **Plan C:** If hosting provider down, manual failover to backup
- **Plan D:** Maintenance mode with ETA if major outage

**Buffer Time:** N/A (reactive)

---

## 5. Timeline & Resource Risks

### 5.1 Feature Scope Creep

**Risk Level:** 🟠 **High**

**Description:**  
Additional features or changes requested mid-project, delaying core functionality.

**Likelihood:** High (60%)  
**Impact:** High - Timeline delays

**Potential Issues:**
- Stakeholder requesting new features
- Team wanting to add "nice to have" features
- Requirement changes mid-development
- Over-engineering solutions
- Perfectionism delaying completion

**Mitigation Plans:**

1. **Clear Scope Definition**
   - Lock functional requirements in Week 1
   - Document MVP vs nice-to-have features
   - Get stakeholder sign-off on scope
   - Change request process

2. **Agile Prioritization**
   - MoSCoW method (Must/Should/Could/Won't)
   - Focus on "Must have" first
   - Park new ideas in backlog for v1.1
   - Regular scope review meetings

3. **Time Boxing**
   - Strict deadlines for each phase
   - No new features after Week 11
   - Weeks 12-14 for testing/polish only
   - Feature freeze enforced

4. **Communication**
   - Weekly status updates to stakeholders
   - Transparent about trade-offs
   - "No" is an acceptable answer
   - Focus on graduation requirements

**Contingency Plans:**

- **Plan A:** If new features requested, add to v1.1 roadmap
- **Plan B:** Cut low-priority features to accommodate critical changes
- **Plan C:** Extend timeline only for graduation-critical features
- **Plan D:** Deliver MVP first, add features post-graduation

**Buffer Time:** Built into Weeks 8, 11, 13

---

### 5.2 Team Member Availability Issues

**Risk Level:** 🟠 **High**

**Description:**  
Team members may be unavailable due to illness, other commitments, or burnout.

**Likelihood:** Moderate (50%)  
**Impact:** High - Reduced velocity

**Potential Issues:**
- Team member sick for 1+ weeks
- Other course deadlines conflicting
- Job interviews/offers
- Personal emergencies
- Burnout from overwork
- Team member drops out

**Mitigation Plans:**

1. **Knowledge Sharing**
   - Pair programming for complex features
   - Code reviews for all PRs
   - Documentation as you go
   - Weekly knowledge sharing sessions
   - No single point of failure

2. **Cross-Training**
   - All team members know basics of all areas
   - Rotate through different parts of codebase
   - Avoid strict specialization
   - Bus factor > 1 for critical components

3. **Workload Management**
   - Realistic task estimates
   - Avoid overcommitment
   - Build in rest periods
   - Recognize burnout signs early
   - Adjust scope if needed

4. **Communication**
   - Daily standups (async okay)
   - Transparency about availability
   - Early warning if conflicts arise
   - Support each other

**Contingency Plans:**

- **Plan A:** If someone sick, redistribute tasks immediately
- **Plan B:** If sustained absence, cut low-priority features
- **Plan C:** If team member drops out, recruit replacement or reduce scope
- **Plan D:** Extend working hours temporarily (avoid burnout)

**Buffer Time:** Distributed across all phases

---

### 5.3 Technical Debt Accumulation

**Risk Level:** 🟡 **Medium**

**Description:**  
Rushing to meet deadlines may create technical debt that slows future development.

**Likelihood:** Moderate (55%)  
**Impact:** Medium - Slower velocity over time

**Potential Issues:**
- Skipping tests to save time
- Copy-paste code instead of refactoring
- Poor documentation
- Hardcoded values
- No error handling
- Unmaintainable code

**Mitigation Plans:**

1. **Quality Standards**
   - Enforce linting and formatting
   - Require code reviews
   - Minimum test coverage (70%)
   - TypeScript strict mode
   - No commented-out code in main branch

2. **Refactoring Time**
   - Schedule refactoring in Week 11
   - "Leave it better than you found it" rule
   - Continuous small refactors
   - Technical debt tracking (GitHub issues)

3. **Documentation**
   - README for each major component
   - API documentation (Swagger)
   - Inline comments for complex logic
   - Architecture decision records (ADRs)

4. **Balance**
   - Pragmatic vs perfect approach
   - Acceptable tech debt for MVP
   - Plan to address debt in v1.1
   - Don't over-engineer

**Contingency Plans:**

- **Plan A:** If tech debt slowing development, schedule debt sprint
- **Plan B:** Tag debt with "// TODO" and track in issues
- **Plan C:** Accept some debt for MVP, address post-launch
- **Plan D:** Rewrite problematic modules if cheaper than maintaining

**Buffer Time:** +1 day in Week 11

---

## 6. Security & Compliance Risks

### 6.1 Data Breach or Security Vulnerability

**Risk Level:** 🔴 **Critical**

**Description:**  
Platform may have security vulnerabilities exposing user data or allowing unauthorized access.

**Likelihood:** Low (15%)  
**Impact:** Severe - Legal/reputational damage

**Potential Issues:**
- SQL injection vulnerabilities
- XSS attacks
- CSRF attacks
- Weak authentication
- Exposed API keys
- Unencrypted sensitive data
- Session hijacking

**Mitigation Plans:**

1. **Secure Coding Practices**
   - Use ORM (Prisma) to prevent SQL injection
   - Input validation on all endpoints
   - Output encoding to prevent XSS
   - CSRF protection (built into Next.js)
   - Content Security Policy headers

2. **Authentication & Authorization**
   - Strong password requirements
   - Password hashing (bcrypt)
   - JWT token security
   - Role-based access control
   - Session timeout after inactivity

3. **Data Protection**
   - HTTPS everywhere (TLS 1.2+)
   - Encrypt sensitive data at rest (PII)
   - Secure environment variable management
   - No secrets in code or logs
   - Regular dependency updates

4. **Security Audits**
   - Automated security scanning (Snyk, Dependabot)
   - Manual code review for security issues
   - Penetration testing (if budget allows)
   - OWASP Top 10 checklist

**Contingency Plans:**

- **Plan A:** If vulnerability found, patch immediately
- **Plan B:** Security incident response plan
- **Plan C:** Notify affected users within 72 hours
- **Plan D:** Take service offline if critical vulnerability

**Buffer Time:** N/A (immediate response required)

---

### 6.2 COPPA & Child Data Privacy Compliance

**Risk Level:** 🟠 **High**

**Description:**  
Platform handles child data and must comply with child privacy regulations (COPPA, GDPR for children).

**Likelihood:** Low (20%)  
**Impact:** Severe - Legal consequences

**Potential Issues:**
- Collecting data from children under 13
- Missing parental consent
- Inadequate data protection
- Data retention violations
- Third-party data sharing
- Non-compliant data practices

**Mitigation Plans:**

1. **Guardian-Only Accounts**
   - Children cannot create accounts
   - All child data controlled by guardians
   - Guardian consent for all data collection
   - Clear privacy policy

2. **Data Minimization**
   - Collect only necessary data
   - No child PII beyond name and age
   - No cookies or tracking for children
   - No advertising or profiling

3. **Data Protection**
   - Encrypt child data at rest
   - Access controls (only guardian can access)
   - Secure deletion when account closed
   - Data export capability for guardians

4. **Legal Review**
   - Consult with legal advisor (if available)
   - Privacy policy reviewed by expert
   - Terms of service compliant
   - COPPA compliance checklist

**Contingency Plans:**

- **Plan A:** If compliance issue found, fix immediately
- **Plan B:** Add age verification for guardian accounts
- **Plan C:** Implement parental consent flow if required
- **Plan D:** Consult legal expert before launch

**Buffer Time:** +2 days in Week 13

---

### 6.3 API Rate Limiting & Abuse

**Risk Level:** 🟡 **Medium**

**Description:**  
APIs may be abused through excessive requests, DDoS attacks, or scraping.

**Likelihood:** Moderate (30%)  
**Impact:** Medium - Service degradation

**Potential Issues:**
- Excessive API calls from single user
- Automated scraping
- DDoS attacks
- Subscription bypass attempts
- ML service overload
- Database connection exhaustion

**Mitigation Plans:**

1. **Rate Limiting**
   - Implement per-user rate limits
   - API-level rate limiting (100 req/min)
   - ML service rate limiting (10 predictions/hour/user)
   - Subscription-based limits

2. **Authentication Required**
   - All APIs require authentication
   - API keys for internal services
   - CAPTCHA for sensitive operations
   - Suspicious activity detection

3. **Monitoring**
   - Track API usage per user
   - Alert on unusual patterns
   - Automatically block abusive IPs
   - Logs for forensic analysis

4. **Infrastructure Protection**
   - Cloudflare or similar DDoS protection
   - WAF (Web Application Firewall)
   - IP whitelisting for admin endpoints
   - Automatic scaling for traffic spikes

**Contingency Plans:**

- **Plan A:** If DDoS detected, enable Cloudflare "Under Attack" mode
- **Plan B:** Temporarily block suspicious IPs
- **Plan C:** Reduce rate limits if service degraded
- **Plan D:** Contact hosting provider for DDoS mitigation

**Buffer Time:** +1 day in Week 13

---

## 7. External Dependency Risks

### 7.1 Third-Party Service Outages

**Risk Level:** 🟡 **Medium**

**Description:**  
External services (Stripe, email, hosting) may experience outages.

**Likelihood:** Low (20%)  
**Impact:** High - Service disruption

**External Dependencies:**
- Vercel (hosting)
- Stripe (payments)
- Resend/SendGrid (email)
- Google (OAuth)
- AWS S3 (storage)
- ML service (self-hosted)
- TTS provider

**Mitigation Plans:**

1. **Service Selection**
   - Choose reliable providers (99.9%+ SLA)
   - Review service status pages
   - Understand SLA terms
   - Disaster recovery options

2. **Fallback Strategies**
   - Email:  In-app notifications as backup
   - Storage: Multi-region replication
   - OAuth: Email/password backup
   - Payments: Manual processing option

3. **Monitoring**
   - Subscribe to service status updates
   - Monitor third-party uptime
   - Alternative provider ready
   - Dependencies documented

4. **Communication**
   - Status page for users
   - Notify users of third-party outages
   - Estimated recovery time
   - Workarounds if available

**Contingency Plans:**

- **Plan A:** If service down, use backup/alternative
- **Plan B:** Display maintenance message with ETA
- **Plan C:** Queue operations for when service recovers
- **Plan D:** Manual workaround if critical

**Buffer Time:** N/A (reactive)

---

### 7.2 Breaking Changes in Dependencies

**Risk Level:** 🟡 **Medium**

**Description:**  
NPM packages or APIs may introduce breaking changes or security vulnerabilities.

**Likelihood:** Low (25%)  
**Impact:** Medium - Build failures

**Potential Issues:**
- Major version updates breaking code
- Deprecated APIs
- Security vulnerabilities in dependencies
- Incompatible package versions
- Build tool changes (Next.js, Prisma)

**Mitigation Plans:**

1. **Version Pinning**
   - Pin dependency versions in package.json
   - Use lock files (package-lock.json)
   - Test updates in staging first
   - Gradual updates, not all at once

2. **Dependency Management**
   - Automated security updates (Dependabot)
   - Review updates weekly
   - Separate security patches from feature updates
   - Keep dependencies reasonably up-to-date

3. **Testing**
   - Run tests before merging dependency updates
   - CI pipeline catches breaking changes
   - Rollback if tests fail

4. **Documentation**
   - Document critical dependencies
   - Note version constraints
   - Upgrade guides for major versions

**Contingency Plans:**

- **Plan A:** If update breaks build, rollback immediately
- **Plan B:** Pin problematic package to previous version
- **Plan C:** Find alternative package if unsupported
- **Plan D:** Fork package and maintain if necessary

**Buffer Time:** +1 day across project

---

## 8. Project-Specific Risks

### 8.1 ML Model Accuracy Below Threshold

**Risk Level:** 🟠 **High**

**Description:**  
ML models may not achieve acceptable accuracy for dyslexia prediction.

**Likelihood:** Moderate (35%)  
**Impact:** High - Core value proposition compromised

**Potential Issues:**
- Model accuracy < 80%
- High false positive/negative rate
- Poor performance on edge cases
- Bias toward certain demographics
- Overfitting to training data

**Mitigation Plans:**

1. **Accuracy Transparency**
   - Display confidence score with results
   - Show "preliminary screening" disclaimer
   - Recommend professional evaluation
   - Don't claim diagnostic capability

2. **Model Improvement**
   - Collect more training data
   - Retrain model with augmented data
   - Ensemble multiple models
   - Adjust decision thresholds

3. **Validation**
   - Test with real users (Week 8-10)
   - Compare with known diagnoses
   - Track false positives/negatives
   - Continuous monitoring

4. **User Education**
   - Clear communication about limitations
   - Not a replacement for professional diagnosis
   - Screening tool, not diagnostic tool
   - Encourage professional follow-up

**Contingency Plans:**

- **Plan A:** If accuracy poor, adjust confidence thresholds
- **Plan B:** Mark all results as "preliminary screening"
- **Plan C:** Focus on trend detection (multiple tests over time)
- **Plan D:** Position as "early warning system" not diagnosis

**Buffer Time:** +2 days in Week 6 (evaluation)

---

### 8.2 Insufficient Test Content

**Risk Level:** 🟡 **Medium**

**Description:**  
Not enough test paragraphs, exercises, or game content for variety.

**Likelihood:** Low (30%)  
**Impact:** Medium - Repetitive experience

**Potential Issues:**
- Only 1-2 paragraphs per difficulty/language
- Children seeing same content repeatedly
- Content not age-appropriate
- Translation quality issues (Arabic)
- No content for certain difficulty levels

**Mitigation Plans:**

1. **Content Creation Plan**
   - Create 20+ paragraphs per language
   - Multiple difficulty levels
   - Varied topics and themes
   - Review by native speakers

2. **LLM Generation (Optional)**
   - Use ChatGPT/Gemini for content generation
   - Human review and editing
   - Quality control process
   - If time permits in Week 12

3. **Content Rotation**
   - Randomize content selection
   - Track which content child has seen
   - Avoid repeats within 10 tests
   - Refresh content regularly

4. **Community Contribution**
   - Allow teachers to submit content
   - Moderation and approval process
   - Credit contributors

**Contingency Plans:**

- **Plan A:** If content limited, create "content packs" post-launch
- **Plan B:** Use LLM generation with human review
- **Plan C:** Partner with educators to create content
- **Plan D:** Launch with limited content, add more over time

**Buffer Time:** +2 days in Week 4

---

## Risk Monitoring & Review

### Weekly Risk Review

Every Friday during the weekly retrospective: 

1. **Review risk register**
2. **Update likelihood/impact**
3. **Assess mitigation effectiveness**
4. **Add new risks**
5. **Escalate critical risks**

### Risk Escalation

| Risk Level | Escalation | Response Time |
|------------|-----------|---------------|
| **Critical** | Immediate team meeting | Same day |
| **High** | Discuss in daily standup | 1-2 days |
| **Medium** | Discuss in weekly meeting | 1 week |
| **Low** | Monitor passively | 2 weeks |

### Risk Dashboard

Track in project management tool:

- **Total Risks:** 28 identified
- **Critical:** 3
- **High:** 11
- **Medium:** 12
- **Low:** 2

---

## Top 10 Risks by Priority

| Rank | Risk | Level | Mitigation Priority |
|------|------|-------|---------------------|
| 1 | ML Service Integration Failures | 🔴 Critical | Week 5-6 |
| 2 | Production Deployment Failures | 🔴 Critical | Week 13 |
| 3 | Data Breach/Security Vulnerability | 🔴 Critical | Ongoing |
| 4 | Tobii Hardware Integration Issues | 🟠 High | Week 5 |
| 5 | Arabic Language Support Challenges | 🟠 High | Week 10-11 |
| 6 | Stripe Payment Integration Issues | 🟠 High | Week 3 |
| 7 | Feature Scope Creep | 🟠 High | Week 1 |
| 8 | Team Member Availability Issues | 🟠 High | Ongoing |
| 9 | ML Model Accuracy Below Threshold | 🟠 High | Week 6 |
| 10 | Real-Time Gaze Tracking Performance | 🟠 High | Week 6 |

---

## Conclusion

This risk assessment document identifies **28 potential risks** across 8 categories that could impact the successful completion of the Lexora platform during Senior Project 2.

### Key Takeaways:

1. **3 Critical Risks** require immediate attention and proactive mitigation
2. **11 High Risks** need weekly monitoring and active management
3. **Early integration testing** is crucial for ML and Tobii services
4. **Buffer time** is built into the timeline for high-risk areas
5. **Contingency plans** exist for all major risks

### Success Strategies: 

✅ **Start with highest-risk items first** (ML integration, Tobii)  
✅ **Test early and often** (don't wait until Week 13)  
✅ **Build in flexibility** (buffer time, feature prioritization)  
✅ **Monitor continuously** (weekly risk reviews)  
✅ **Communicate transparently** (stakeholder updates)

By proactively identifying and mitigating these risks, the team can navigate challenges effectively and deliver a successful Senior Project 2.

---

**Document Version:** 1.0  
**Last Updated:** January 17, 2026  
**Next Review:** End of Week 3 (February 9, 2026)