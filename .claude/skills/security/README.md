# 🔒 Secure Claude Skills

**Defense-in-depth security skills for Claude Code projects**

A collection of specialized security skills that implement enterprise-grade security controls for Next.js applications using Clerk authentication and Convex database. These skills help Claude Code generate secure, production-ready code that follows OWASP best practices.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/secure-claude-skills.svg)](https://www.npmjs.com/package/secure-claude-skills)

## 🎯 What Is This?

This package is the core security engine of the [Secure Vibe Coding OS](https://github.com/harperaa/secure-vibe-coding-OS), but was separated into its own package for ease of use and distribution.  

Also, this package and the Secure Vibe Coding OS are part of the [Secure Vibe Coding Masterclass](https://allenharper.com) by [Dr. Allen Harper](https://www.linkedin.com/in/drallenharper/). 

This package provides specialized Claude Code skills that teach Claude how to implement:

- **CSRF Protection** - Cross-Site Request Forgery prevention
- **Rate Limiting** - Brute force and abuse prevention
- **Input Validation** - XSS and injection attack prevention
- **Security Headers** - Browser-level security controls
- **Error Handling** - Information leakage prevention
- **Authentication Security** - Clerk integration best practices
- **Payment Security** - Clerk Billing and Stripe security
- **Dependency Security** - Supply chain protection
- **Security Testing** - Automated security verification

**Plus Security Awareness Skills:**

In addition to implementation skills, this package includes comprehensive **Security Awareness** skills that help Claude understand *why* AI-generated code is insecure:

- **Awareness Overview** - Statistics, research, and real-world breach examples
- **Injection Vulnerabilities** - SQL injection, command injection, XSS with real attack scenarios
- **Auth Vulnerabilities** - Broken authentication patterns and credential storage risks
- **Information Leakage** - Error message exposure and logging vulnerabilities
- **Supply Chain Risks** - Dependency confusion and malicious packages
- **Business Logic Flaws** - Race conditions and integer overflow examples
- **Resource Exhaustion** - DoS vulnerabilities and resource abuse

These awareness skills educate Claude about the **45% vulnerability rate in AI-generated code** (Veracode 2024), helping it understand security risks before implementing solutions.

Each skill provides Claude with deep knowledge of security patterns, common vulnerabilities, and secure implementation approaches specific to the Next.js + Clerk + Convex stack.

## 🚀 Why This Exists

According to Veracode's 2024 State of Software Security Report, **AI-generated code picks insecure patterns 45% of the time**. When developers use AI assistants like Claude Code without security guidance, they often generate code with:

- Missing CSRF protection
- No rate limiting
- Insufficient input validation
- Hardcoded credentials
- Information leakage through errors
- Weak authentication patterns

These skills solve this by providing Claude with expert security knowledge, resulting in **secure-by-default code generation**.

## 📦 Installation

### Quick Start (Recommended)

Install security skills with one command:

```bash
npx secure-claude-skills init
```

This creates `.claude/skills/security/` in your project with all security skills.

### Installation Methods

#### Method 1: Copy Installation (No Sync)

Best for: One-time setup, you'll customize the skills for your needs

```bash
npx secure-claude-skills init
```

**Pros:**
- ✅ Simple one-command install
- ✅ No git complexity
- ✅ Customize freely

**Cons:**
- ❌ No automatic updates
- ❌ To update, re-run command

---

#### Method 2: Subtree Installation (Stay Synced)

Best for: Get ongoing security improvements as skills are enhanced

```bash
# First-time installation
npx secure-claude-skills init --sync subtree

# Get updates later
npx secure-claude-skills update
```

**Pros:**
- ✅ Automatic sync with updates
- ✅ One-command updates
- ✅ Two-way sync (contribute back)

**Cons:**
- ❌ Requires git repository
- ❌ Slightly more complex

**Requirements:**
- Git repository initialized
- No uncommitted changes (commit first)

---

#### Method 3: Submodule Installation (Versioned Updates)

Best for: Control exactly which version you use

```bash
# First-time installation
npx secure-claude-skills init --sync submodule

# Update to latest
cd .claude/skills/security && git pull
cd ../../.. && git add .claude/skills/security
git commit -m "Update security skills"
```

**Pros:**
- ✅ Version control
- ✅ Explicit updates
- ✅ Easy rollback

**Cons:**
- ❌ Manual update process
- ❌ Team needs submodule knowledge

**Requirements:**
- Git repository initialized

---

### Alternative: Install Directly from GitHub

Don't want to use npm? Install directly from GitHub:

#### Method A: Git Subtree (Stay Synced)

```bash
# Install skills with sync
git subtree add --prefix=.claude/skills/security \
  https://github.com/harperaa/secure-claude-skills.git main --squash

# Update later
git subtree pull --prefix=.claude/skills/security \
  https://github.com/harperaa/secure-claude-skills.git main --squash
```

#### Method B: Git Submodule (Versioned)

```bash
# Install as submodule
git submodule add https://github.com/harperaa/secure-claude-skills.git \
  .claude/skills/security

# Update later
cd .claude/skills/security && git pull origin main
```

#### Method C: Simple Clone (No Sync)

```bash
# Clone directly
git clone https://github.com/harperaa/secure-claude-skills.git \
  .claude/skills/security

# Remove git history (optional)
rm -rf .claude/skills/security/.git
```

#### Method D: Download ZIP

1. Go to https://github.com/harperaa/secure-claude-skills
2. Click "Code" → "Download ZIP"
3. Extract to `.claude/skills/security/`

---

### Updating Skills

If you installed with sync enabled:

```bash
# For subtree installations
npx secure-claude-skills update

# For submodule installations
cd .claude/skills/security && git pull origin main
```

If you installed as copy:

```bash
# Re-run to get latest
npx secure-claude-skills init --force
```

## 🎓 How to Use

Once installed, use skills in your Claude Code conversations:

### Example: Implementing CSRF Protection

```
You: I need to add CSRF protection to my API routes

Claude Code: I'll help you implement CSRF protection using the
csrf-protection skill.

[Claude reads .claude/skills/security/csrf-protection/skill.md]
[Claude implements withCsrf middleware following the skill's guidance]
```

### Example: Adding Rate Limiting

```
You: Add rate limiting to prevent API abuse

Claude Code: I'll implement rate limiting using the rate-limiting skill.

[Claude reads .claude/skills/security/rate-limiting/skill.md]
[Claude implements withRateLimit middleware following OWASP guidelines]
```

### Available Skills

| Skill | Use Case | Claude Code Trigger |
|-------|----------|---------------------|
| **security-overview** | Understanding security architecture | "security architecture", "defense in depth" |
| **csrf-protection** | Prevent cross-site forgery | "CSRF", "protect form", "token validation" |
| **rate-limiting** | Prevent brute force/abuse | "rate limit", "prevent spam", "brute force" |
| **input-validation** | Prevent XSS/injection | "validate input", "XSS", "sanitize" |
| **security-headers** | Browser-level security | "security headers", "CSP", "XSS protection" |
| **error-handling** | Prevent info leakage | "error handling", "hide errors", "generic errors" |
| **auth-security** | Clerk authentication | "authentication", "Clerk security", "sessions" |
| **payment-security** | Clerk Billing/Stripe | "payment security", "PCI compliance", "Stripe" |
| **dependency-security** | Supply chain protection | "dependencies", "npm audit", "vulnerabilities" |
| **security-testing** | Automated verification | "security testing", "test security", "verify" |
| **security-operations** | Deployment & monitoring | "when to use middleware", "environment variables", "deployment checklist" |
| **security-awareness** | Understanding AI code security risks | "vibe coding security", "AI vulnerabilities", "why AI insecure" |

### Triggering Skills

Skills are automatically triggered when you use relevant keywords in your prompts. You can also explicitly invoke them:

```
You: Use the csrf-protection skill to secure my contact form
```

## 🛡️ What You Get

### Defense-in-Depth Architecture

Each skill implements multiple layers of security:

```
Request → Middleware → Rate Limit → CSRF → Validation → Auth → Business Logic
   ↓          ↓            ↓          ↓         ↓         ↓          ↓
Headers   Security     5 req/min   Token    Sanitize   Verify   Safe Code
Applied   Headers      Limit       Check    Input      User     Execution
```

### OWASP Top 10 Coverage

These skills help achieve **90/100 OWASP score** by addressing:

- ✅ **A01:2021 – Broken Access Control** (auth-security, csrf-protection)
- ✅ **A02:2021 – Cryptographic Failures** (payment-security, csrf-protection)
- ✅ **A03:2021 – Injection** (input-validation, rate-limiting)
- ✅ **A04:2021 – Insecure Design** (security-overview, all skills)
- ✅ **A05:2021 – Security Misconfiguration** (security-headers, error-handling)
- ✅ **A06:2021 – Vulnerable Components** (dependency-security)
- ✅ **A07:2021 – Authentication Failures** (auth-security, rate-limiting)
- ✅ **A08:2021 – Data Integrity Failures** (csrf-protection, input-validation)
- ✅ **A09:2021 – Logging Failures** (error-handling)
- ✅ **A10:2021 – SSRF** (input-validation)

## 📋 Prerequisites

These skills are designed for projects using:

- **Next.js 15+** (App Router)
- **Clerk** (Authentication)
- **Convex** (Database)
- **TypeScript** (Type safety)

The skills can be adapted for other stacks, but examples assume this architecture.

## 🗂️ File Structure

After installation, your project will have:

```
your-project/
├── .claude/
│   ├── commands/                  (Your custom commands - untouched)
│   └── skills/
│       ├── security/              ← Installed here
│       │   ├── security-overview/
│       │   ├── csrf-protection/
│       │   ├── rate-limiting/
│       │   ├── input-validation/
│       │   ├── security-headers/
│       │   ├── error-handling/
│       │   ├── auth-security/
│       │   ├── payment-security/
│       │   ├── dependency-security/
│       │   ├── security-testing/
│       │   ├── security-operations/
│       │   └── security-awareness/  (7 awareness sub-skills)
│       │       ├── awareness-overview/
│       │       ├── injection-vulnerabilities/
│       │       ├── auth-vulnerabilities/
│       │       ├── information-leakage/
│       │       ├── supply-chain-risks/
│       │       ├── business-logic-flaws/
│       │       └── resource-exhaustion/
│       └── your-custom-skill.md   (Your skills - untouched)
```

**No conflicts!** Security skills install to `.claude/skills/security/`, leaving your existing `.claude/` content untouched.

## 🤝 Contributing

Found a security issue or want to improve a skill?

1. Fork the repository
2. Create a feature branch: `git checkout -b improve-csrf-skill`
3. Make your changes
4. Submit a pull request

**Security Disclosures:** For security vulnerabilities, email security@example.com instead of opening a public issue.

## 📚 Documentation

- **Installation Guide**: You're reading it!
- **Skills Reference**: See `examples/skills-reference.md`
- **Architecture Deep-Dive**: See `examples/architecture.md`
- **Security Principles**: See `examples/security-principles.md`

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Security patterns based on [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- Inspired by [Secure Vibe Coding Whitepaper](https://github.com/derick6/secure-vibe-coding-whitepaper)
- Built for [Claude Code](https://claude.com/claude-code) by Anthropic

## 🔗 Links

- **GitHub**: https://github.com/harperaa/secure-claude-skills
- **npm**: https://www.npmjs.com/package/secure-claude-skills
- **Issues**: https://github.com/harperaa/secure-claude-skills/issues
- **Main Project**: https://github.com/harperaa/secure-vibe-coding-OS

## ⚡ Quick Reference

### npm Installation
```bash
# Install (copy mode)
npx secure-claude-skills init

# Install with sync (subtree)
npx secure-claude-skills init --sync subtree

# Install with sync (submodule)
npx secure-claude-skills init --sync submodule

# Update (if synced)
npx secure-claude-skills update

# Force reinstall
npx secure-claude-skills init --force

# Help
npx secure-claude-skills --help
```

### GitHub Direct Installation
```bash
# Subtree (stay synced)
git subtree add --prefix=.claude/skills/security \
  https://github.com/harperaa/secure-claude-skills.git main --squash

# Submodule (versioned)
git submodule add https://github.com/harperaa/secure-claude-skills.git \
  .claude/skills/security

# Clone (no sync)
git clone https://github.com/harperaa/secure-claude-skills.git \
  .claude/skills/security
```

---

**Built with 🔒 by [Dr. Allen Harper](https://github.com/harperaa)**

*Making AI-generated code secure by default*
