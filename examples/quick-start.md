# Quick Start Guide

Get security skills working in your project in 5 minutes.

## Step 1: Install

Choose your installation method:

### Option A: Simple Copy (No Git Required)

```bash
npx secure-claude-skills init
```

### Option B: Stay Synced with Updates

```bash
npx secure-claude-skills init --sync subtree
```

## Step 2: Verify Installation

Check that skills were installed:

```bash
ls .claude/skills/security/
```

You should see:
```
auth-security/
csrf-protection/
dependency-security/
error-handling/
input-validation/
payment-security/
rate-limiting/
security-headers/
security-overview/
security-testing/
```

## Step 3: Use in Claude Code

Open Claude Code and try:

```
You: Add CSRF protection to my API routes
```

Claude will automatically use the `csrf-protection` skill to implement secure CSRF protection following OWASP guidelines.

## Step 4: Explore Skills

Each skill provides:
- **Overview** of what it protects against
- **Implementation** patterns and code examples
- **Testing** guidance
- **Common pitfalls** to avoid

Example skills to explore:

### Security Overview
```
You: Explain the security architecture
```

### CSRF Protection
```
You: Protect my contact form from CSRF attacks
```

### Rate Limiting
```
You: Add rate limiting to prevent API abuse
```

### Input Validation
```
You: Validate and sanitize user input to prevent XSS
```

## Step 5: Stay Updated (Optional)

If you installed with `--sync subtree`:

```bash
# Pull latest security improvements
npx secure-claude-skills update
```

## Next Steps

- Read [Skills Reference](./skills-reference.md) for complete skill list
- Review [Security Principles](./security-principles.md) for architecture overview
- Check [Architecture Guide](./architecture.md) for deep dive

## Troubleshooting

### Skills not triggering

Make sure Claude Code recognizes `.claude/skills/` folder. Try:
```
You: List available skills
```

### Installation conflicts

If you already have `.claude/skills/security/`:
```bash
# Force reinstall
npx secure-claude-skills init --force
```

### Can't install subtree

Subtree requires git repository with committed changes:
```bash
git init
git add .
git commit -m "Initial commit"
npx secure-claude-skills init --sync subtree
```

## Getting Help

- **Issues**: https://github.com/harperaa/secure-claude-skills/issues
- **Documentation**: https://github.com/harperaa/secure-claude-skills
- **Main Project**: https://github.com/harperaa/secure-vibe-coding-OS
