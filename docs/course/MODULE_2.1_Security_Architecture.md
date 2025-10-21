# 2.1: Security Architecture Fundamentals

**Designing Security from the Ground Up**

### Learning Objectives:

- Understand what security architecture is and why it matters
- Learn the key components of a secure application architecture
- Identify security boundaries and trust zones
- Recognize how architecture decisions impact security posture

---

### Content:

### What Is Security Architecture?

Security architecture is the blueprint for how your application protects data, authenticates users, and prevents attacks. It's the set of design decisions you make before writing any code that determines whether your application will be secure or vulnerable.

Think of it like building a house. You don't start hammering nails and hope it turns out secure. You design the foundation, the locks, the alarm system, and the fire exits first. Security architecture is your application's blueprint.

---

### Why Architecture Comes First

Security cannot be retrofitted. Here's why:

**Architectural decisions are expensive to change.** Once you've built an authentication system using one approach, switching to a different approach means rewriting potentially hundreds of files.

**Security vulnerabilities are often architectural.** You can't fix a fundamental architecture flaw with clever code. If your architecture allows users to access data they shouldn't see, no amount of input validation will fix it.

**Early decisions cascade.** The security decisions you make in week one affect every feature you build for years. If you start with weak authentication, every feature you add will inherit that weakness.

---

### The Core Components of Security Architecture

Every secure application has these components:

### 1. Authentication Layer

**What it does:** Proves users are who they claim to be

**Key decisions:**
- How will users prove their identity? (passwords, passwordless, social login, MFA)
- Where will authentication happen? (client-side, server-side, third-party service)
- How long will sessions last?
- How will you handle password resets and account recovery?

**Security consideration:** Weak authentication is the #1 cause of breaches. This layer must be rock solid.

---

### 2. Authorization Layer

**What it does:** Controls what authenticated users can access

**Key decisions:**
- How will you define permissions? (role-based, attribute-based, resource-based)
- Where will authorization checks happen? (database, application, API gateway)
- How will you prevent privilege escalation?
- How will you handle shared resources?

**Security consideration:** Authentication without proper authorization means users can access everything. Both layers are essential.

---

### 3. Data Layer

**What it does:** Stores and protects application data

**Key decisions:**
- What data needs encryption at rest?
- What data needs encryption in transit?
- How will you separate sensitive data from non-sensitive data?
- How will you handle data deletion and retention?
- What backups will you maintain and how will they be secured?

**Security consideration:** Data is what attackers want. Protect it with multiple layers of defense.

---

### 4. API Layer

**What it does:** Exposes application functionality to clients

**Key decisions:**
- What endpoints will be public vs authenticated?
- How will you validate input?
- How will you rate limit to prevent abuse?
- What error information will you expose?
- How will you version your API?

**Security consideration:** APIs are attack surfaces. Every endpoint is a potential vulnerability if not properly secured.

---

### 5. Infrastructure Layer

**What it does:** Hosts and delivers your application

**Key decisions:**
- Where will you host? (cloud provider, region, availability zones)
- What CDN will you use?
- How will you handle SSL/TLS?
- What firewalls and DDoS protection will you use?
- How will you deploy updates?

**Security consideration:** Even secure code can be compromised by insecure infrastructure.

---

### Understanding Security Boundaries

A security boundary is a line between trusted and untrusted zones. Your architecture needs clear boundaries:

### External Boundary: Internet → Your Application

This is where untrusted users and potential attackers interact with your system.

**Security controls needed:**
- Firewall
- DDoS protection
- Rate limiting
- Input validation
- SSL/TLS encryption

---

### Application Boundary: Client → Server

This is where user-controlled clients (browsers, mobile apps) communicate with your backend.

**Security controls needed:**
- Authentication verification
- Authorization checks
- API request validation
- CSRF protection
- CORS configuration

---

### Data Boundary: Application → Database

This is where your application accesses stored data.

**Security controls needed:**
- Parameterized queries (prevent SQL injection)
- Least-privilege database access
- Encrypted connections
- Query monitoring and logging

---

### Service Boundary: Your App → Third-Party Services

This is where you integrate with external services (payment processors, email providers, etc.).

**Security controls needed:**
- API key management
- Request signing
- Response validation
- Timeout handling
- Retry logic with backoff

---

### The Principle of Least Privilege

At every boundary and within every layer, apply the principle of least privilege: **Give users, services, and components only the minimum access they need to function.**

**Examples:**

**Bad:** The application uses a database user account with admin privileges
**Good:** The application uses a database user that can only read/write specific tables

**Bad:** All authenticated users can access all API endpoints
**Good:** Each API endpoint checks if the user has permission for that specific action

**Bad:** API keys have full account access
**Good:** API keys are scoped to specific operations (read-only reporting key, write-only webhook key)

---

### Defense in Depth

Never rely on a single security control. Use multiple overlapping layers so if one fails, others catch the attack.

**Example: Protecting User Data**

Layer 1: Firewall blocks unauthorized network access
Layer 2: Authentication requires valid credentials
Layer 3: Authorization checks if user can access specific data
Layer 4: Application validates input and prevents injection
Layer 5: Database enforces access controls
Layer 6: Data is encrypted at rest
Layer 7: Audit logs record all access

An attacker would need to bypass all seven layers to compromise data.

---

### Zero Trust Architecture

Modern security architecture follows the zero trust principle: **Never trust, always verify.**

**Traditional approach:** "If you're inside the network, you're trusted"
**Zero trust approach:** "Verify every request, regardless of where it comes from"

**How this applies to your apps:**
- Authenticate every request, even from internal services
- Verify authorization for every action
- Encrypt all communications, internal and external
- Log everything for audit trails
- Assume breach and limit blast radius

---

### Security Architecture Patterns for Common Scenarios

### Pattern 1: B2B SaaS with Tenancy

**Challenge:** Multiple customers sharing infrastructure while keeping data isolated

**Architecture:**
- Tenant ID in every database table
- Authorization checks always include tenant verification
- Separate encryption keys per tenant (enterprise tier)
- Tenant-level audit logging

**Security benefit:** One customer cannot access another's data, even if authorization fails

---

### Pattern 2: Consumer App with Social Features

**Challenge:** Users creating content and interacting while protecting privacy

**Architecture:**
- Content ownership clearly defined in database schema
- Visibility controls (public, private, friends-only) enforced at API layer
- User blocking and reporting built into authorization
- Content moderation hooks at data layer

**Security benefit:** Users control their privacy and cannot access blocked content

---

### Pattern 3: E-commerce with Payment Processing

**Challenge:** Handling payment data securely while remaining PCI compliant

**Architecture:**
- Never store payment card data—use Stripe or similar
- Tokenization for saved payment methods
- PCI-compliant third party handles all card data
- Order history separated from payment data
- Audit logs for all payment operations

**Security benefit:** You're not responsible for securing card data—the experts are

---

### Common Architecture Mistakes That Lead to Breaches

**Mistake 1: Client-Side Security Checks Only**

Never trust the client. Always validate on the server.

**Bad:** JavaScript checks if user is admin before showing admin panel
**Good:** Server verifies admin status on every admin API request

**Mistake 2: Mixing Authentication and Data Access**

Keep authentication separate from business logic.

**Bad:** Database queries include user ID from URL parameter
**Good:** Server extracts user ID from verified session, then uses it in queries

**Mistake 3: Forgetting to Secure All Endpoints**

One unsecured endpoint can compromise everything.

**Bad:** Most APIs require auth, but one "read-only" endpoint doesn't
**Good:** Every endpoint requires authentication; specific endpoints then check authorization

**Mistake 4: Storing Secrets in Code**

Environment-specific secrets must be in environment variables.

**Bad:** API key hardcoded in source code
**Good:** API key loaded from secure environment variable

**Mistake 5: No Rate Limiting**

Without rate limits, attackers can brute-force, scrape, or DDoS your app.

**Bad:** Login endpoint accepts unlimited attempts
**Good:** Login endpoint limited to 5 attempts per minute per IP/account

---

### Your Security Architecture Checklist

Before you start building, document:

☐ Authentication method and session management approach
☐ Authorization model (roles, permissions, how they're checked)
☐ Data classification (what's sensitive, what's public)
☐ Encryption strategy (at rest, in transit)
☐ API security controls (validation, rate limiting, auth)
☐ Infrastructure security (hosting, CDN, SSL)
☐ Third-party service integration security
☐ Logging and monitoring strategy
☐ Incident response plan basics
☐ Security boundary definitions

---

### Hands-On Practice:

**Challenge: Design a Complete Security Architecture**

Your task is to design a comprehensive security architecture Plan for a real application, documenting every layer and boundary.  This is just the plan, we will build the actual SECURITY_ARCHITECTURE.md file in module 2.6.  This exercise is just to get you thinking about security architecture and to help you prepare for the hands-on practice in module 2.6.

**Choose Your Application Type:**

Pick one of these to design (or use your own idea):

**Option A:** A project management tool for remote teams (like Trello/Asana)
- Features: Projects, tasks, comments, file attachments, team collaboration
- Users: Team members, project managers, administrators

**Option B:** A personal finance tracker (like Mint/YNAB)
- Features: Bank account linking, transaction tracking, budgets, goals
- Users: Individual users with highly sensitive financial data

**Option C:** A learning management system for online courses
- Features: Course content, student submissions, grading, discussions
- Users: Students, instructors, administrators

**Part 1: Define Your Application Context (20 minutes)**

Document:

**What problem does this solve?**
[2-3 sentences]

**Who are your users?**
- Primary user type: [description]
- Secondary user type: [description]
- Admin users: [description]

**What sensitive data will you handle?**
List specific data types:
- [Example: User passwords]
- [Example: Credit card information]
- [Example: Personal financial transactions]

**What are the top 3 security risks?**
1. [Example: Unauthorized access to financial data]
2. [Example: Data breach exposing user information]
3. [Example: Account takeover via weak authentication]

**Part 2: Design Your Five Core Layers (90 minutes)**

For each layer, document your architectural decisions:

### Layer 1: Authentication Architecture

**Authentication Method:**
- Primary: [Email/password, passwordless, social, etc.]
- MFA: [Required for all? Optional? Required for admins?]
- Session duration: [How long before re-authentication?]

**Technology choices:**
- Provider: [Clerk, Auth0, custom, etc.]
- Where handled: [Client SDK, server-side, hybrid]
- Session storage: [HTTP-only cookies, JWT, etc.]

**Security controls:**
- Password requirements: [Minimum length, complexity]
- Account lockout: [After how many failed attempts?]
- Password reset: [Email verification, security questions, etc.]
- Remember me: [Allowed? How long?]

**Prompt to validate this with Claude:**
"Review this authentication architecture for a [your app type]. Are there any security weaknesses? What improvements would you suggest?"

### Layer 2: Authorization Architecture

**Permission model:**
- Type: [Role-based, resource-based, attribute-based]
- Roles: [List all roles and what they can do]
- How permissions are checked: [Every API call, middleware, database-level]

**Example permission matrix:**
Create a table showing:
- What each role can do with each resource type
- Example: Students can read their own submissions, Instructors can read all submissions in their courses

**Authorization logic:**
- Where enforced: [API layer, database queries, both]
- Tenant isolation: [If applicable, how will you prevent data leaks between accounts?]
- Privilege escalation prevention: [How do you ensure users can't elevate their permissions?]

**Prompt to validate:**
"Review this authorization model for security flaws. Can you identify any ways a user might access resources they shouldn't? What authorization checks am I missing?"

### Layer 3: Data Architecture

**Data classification:**
Create a table with these columns:
- Data type
- Sensitivity level (Public, Internal, Confidential, Restricted)
- Encryption needed?
- Retention period

Example row:
- User passwords | Restricted | Yes (hashed) | Indefinite
- User email | Confidential | In transit only | Until account deletion

**Database security:**
- Database choice: [PostgreSQL, MongoDB, Convex, etc.]
- Connection security: [SSL, VPN, etc.]
- Database user privileges: [Read-only, read-write, admin—who uses which?]
- Backup strategy: [How often, where stored, encrypted?]

**Encryption strategy:**
- Data at rest: [What's encrypted? What key management?]
- Data in transit: [HTTPS everywhere? Database connections?]
- End-to-end encryption: [If applicable, what data?]

**Prompt to validate:**
"I'm storing [list your sensitive data types] in [database type]. What security measures should I implement? What encryption strategies do you recommend?"

### Layer 4: API Architecture

**API design:**
- Type: [REST, GraphQL, tRPC, etc.]
- Authentication on endpoints: [All? Specific public endpoints?]
- Authorization checks: [Per-endpoint? Per-resource?]

**Security controls per endpoint type:**

**Public endpoints (no auth required):**
- Rate limiting: [How strict?]
- Input validation: [What checks?]
- DDoS protection: [What strategy?]

**Authenticated endpoints:**
- Session verification: [On every request?]
- Authorization check: [What permissions needed?]
- Rate limiting: [Per user? Per IP?]

**Data modification endpoints:**
- CSRF protection: [Token-based?]
- Idempotency: [Prevent duplicate operations?]
- Audit logging: [What gets logged?]

**Input validation strategy:**
- Validation location: [Client and server? Server only?]
- Validation approach: [Schema validation? Custom functions?]
- Error messages: [How much detail to expose?]

**Prompt to validate:**
"I'm building these API endpoints: [list your main endpoints]. For each one, what security controls should I implement? What vulnerabilities should I watch for?"

### Layer 5: Infrastructure Architecture

Create a diagram (you can use text/ASCII art) showing:
````
[Users] 
   ↓
[CDN / DDoS Protection]
   ↓
[Firewall]
   ↓
[Load Balancer / Vercel Edge]
   ↓
[Application Server]
   ↓
[Database]
For each component, document:
CDN / Edge:
````

## Provider: [Cloudflare, Vercel, etc.]
What's cached: [Static assets? API responses?]
SSL/TLS: [Version, configuration]

### Hosting:

Platform: [Vercel, AWS, etc.]
Region: [Where hosted?]
Auto-scaling: [Enabled?]

### Firewall / WAF:

Provider: [Cloudflare WAF, AWS WAF, etc.]
Rules: [Block by geography? Known attack patterns?]

### Environment separation:

Development: [Where hosted? What data?]
Staging: [Where hosted? What data?]
Production: [Where hosted? What data?]
How are they isolated?

### Prompt to validate:
"I'm deploying to [your platform] with [your architecture]. What infrastructure security controls should I implement? What am I missing?"
Part 3: Map Your Security Boundaries (30 minutes)
Draw a diagram (text-based is fine) showing:

All the boundaries in your architecture
What security controls exist at each boundary
What could happen if each boundary was breached

Example format:
Boundary: Internet → Application

Security controls: Firewall, rate limiting, DDoS protection
If breached: Attacker could spam requests, but can't access data without authentication
Additional controls needed: [List any gaps]

Boundary: Client → Server

Security controls: Authentication, authorization, input validation
If breached: Attacker could call APIs, but can't access other users' data
Additional controls needed: [List any gaps]

### Repeat for:

Application → Database
Application → Third-party services
User → User (for multi-tenant/social features)

## Part 4: Identify Your Attack Vectors (30 minutes)
For your application, list the top 10 ways an attacker might try to compromise it:
Format:
Attack Vector 1: [Name of attack, e.g., "Brute force login attempts"]

How it works: [Brief description]
Architectural defense: [What in your architecture prevents this?]
If defense fails: [What happens? How contained?]

Create this for 10 different attack vectors. Consider:

Authentication attacks (brute force, credential stuffing)
Authorization attacks (privilege escalation, horizontal access)
Data attacks (SQL injection, data exfiltration)
API attacks (rate limiting bypass, parameter tampering)
Infrastructure attacks (DDoS, man-in-the-middle)

## Part 5: Document Your Architecture (30 minutes)
Create a final architectural document, called SECURITY_ARCHITECTURE.md, that includes:
1. Executive Summary

One paragraph describing your security architecture approach
Key security principles you're following
Main architectural decisions and why they were made

2. Architecture Diagrams

System architecture diagram showing all layers
Security boundary diagram
Data flow diagram showing where security controls are applied

3. Layer-by-Layer Documentation

All five layers with full details from Part 2

4. Security Controls Summary

Table listing every security control you're implementing
Where it's implemented
What it protects against

5. Risk Assessment

Your attack vector analysis from Part 4
Residual risks (what's not fully protected)
Future security enhancements planned

## Tips:

Be specific—"use encryption" isn't enough; specify what algorithm, where, and why
Think about what happens when controls fail—have fallbacks
Consider the user experience—security shouldn't make the app unusable
Document your reasoning—you'll refer back to this
Use Claude to validate each section as you complete it

## Common Mistakes to Avoid:

Designing security controls without understanding your threats
Over-engineering—don't add complexity that doesn't add security
Under-engineering—don't skip controls because they're inconvenient
Forgetting about insider threats (malicious admin users)
Not considering mobile clients vs web clients (different security needs)

## Resources:

OWASP Application Security Verification Standard: owasp.org/www-project-application-security-verification-standard
NIST Cybersecurity Framework: nist.gov/cyberframework
Cloud Security Alliance: cloudsecurityalliance.org
Your chosen tech stack's security documentation

## Deliverable:
A comprehensive security architecture document (8-15 pages) containing:

Application context and threat assessment
Five-layer architecture with full documentation
Security boundary analysis
Attack vector analysis (10 vectors)
Complete architectural documentation with diagrams

## Expected Time: 200 minutes (3+ hours)
Note: This is a substantial architectural exercise. It's meant to be challenging and comprehensive. Take breaks, use Claude to validate your thinking, and iterate on your design. This document becomes the foundation for everything you build.

## Summary:
Security architecture is the foundation of secure applications. It defines how authentication, authorization, data protection, API security, and infrastructure security work together to protect your application. Good architecture includes clear security boundaries, applies least privilege and defense in depth, and anticipates attack vectors. Designing architecture before building ensures security is embedded in every feature from day one.