# Setup Guide for secure-claude-skills Package

This guide walks you through setting up the GitHub repository, npm package, and integrating it with your main project using git subtree.

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository settings:
   - **Name**: `secure-claude-skills`
   - **Description**: "Defense-in-depth security skills for Claude Code - CSRF protection, rate limiting, input validation, and more"
   - **Visibility**: Public (so others can use it)
   - **Initialize**: Leave all checkboxes UNCHECKED (we have files already)

3. Click "Create repository"

## Step 2: Push Package to GitHub

You have the package ready at `/Users/allenharper/Dropbox/code/secure-claude-skills-package/`

```bash
# Navigate to the package directory
cd /Users/allenharper/Dropbox/code/secure-claude-skills-package

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Secure Claude Skills package with CLI installer

- Defense-in-depth security skills for Claude Code
- 10 security skills covering OWASP Top 10
- CLI installer with 3 installation modes (copy, subtree, submodule)
- Comprehensive documentation and examples
- Ready for npm publishing"

# Add GitHub as remote (replace with your actual URL)
git remote add origin https://github.com/harperaa/secure-claude-skills.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Set Up npm Package

### 3.1 Verify package.json

The package.json is already configured. Verify these fields are correct:

```json
{
  "name": "secure-claude-skills",
  "version": "1.0.0",
  "author": "Allen Harper",
  "repository": {
    "type": "git",
    "url": "https://github.com/harperaa/secure-claude-skills.git"
  }
}
```

### 3.2 Make CLI executable

```bash
chmod +x bin/cli.js
```

### 3.3 Test package locally

```bash
# Install dependencies (none currently, but good to verify)
npm install

# Test CLI locally
node bin/cli.js --help
```

You should see the help output with installation instructions.

### 3.4 Create npm account (if you don't have one)

```bash
npm login
# Enter your npm credentials
```

If you don't have an npm account:
1. Go to https://www.npmjs.com/signup
2. Create account
3. Verify email
4. Run `npm login`

### 3.5 Publish to npm

```bash
# Dry run to see what will be published
npm publish --dry-run

# If everything looks good, publish
npm publish

# You should see:
# + secure-claude-skills@1.0.0
```

**Note**: npm package names must be unique. If `secure-claude-skills` is taken, you might need to:
- Use a scoped package: `@harperaa/secure-claude-skills`
- Choose different name: `secure-claude-code-skills`

To publish scoped package:
```bash
# Update package.json name to "@harperaa/secure-claude-skills"
npm publish --access public
```

## Step 4: Integrate with Main Project Using Subtree

Now we'll set up git subtree in your main project (`secure-vibe-coding-OS`).

### 4.1 Verify main repo structure

Your main repo has already been restructured:
```
.claude/
└── skills/
    └── security/
        ├── security-overview/
        ├── csrf-protection/
        └── ... (all skills)
```

### 4.2 Remove security folder (temporarily)

We need to remove the local security folder so subtree can add it:

```bash
cd /Users/allenharper/Dropbox/code/secure-vibe-coding-OS

# Make sure you're on main branch with no uncommitted changes
git status

# If you have uncommitted changes, commit them first
git add .
git commit -m "Restructure skills to .claude/skills/security/"

# Remove the security directory (don't worry, it's backed up in the package repo)
rm -rf .claude/skills/security

# Commit the removal
git add .
git commit -m "Prepare for subtree: Remove security skills directory"
```

### 4.3 Add subtree

```bash
# Add the skills repo as a subtree
git subtree add --prefix=.claude/skills/security \
  https://github.com/harperaa/secure-claude-skills.git main --squash

# This creates a commit that adds all skills to .claude/skills/security/
```

**What happened:**
- Git pulled all files from `secure-claude-skills` repo
- Placed them in `.claude/skills/security/` directory
- Created a merge commit linking the subtree

### 4.4 Verify subtree setup

```bash
# Check that skills are back
ls .claude/skills/security/

# You should see:
# auth-security/
# csrf-protection/
# dependency-security/
# ... etc
```

### 4.5 Push changes

```bash
git push origin main
```

## Step 5: Verify Everything Works

### 5.1 Test npm installation (in a test directory)

```bash
# Create a test Next.js project
cd /tmp
npx create-next-app test-skills-install
cd test-skills-install

# Test your package
npx secure-claude-skills init

# Check installation
ls .claude/skills/security/

# You should see all skills installed!
```

### 5.2 Test subtree updates (in main repo)

Make a small change to test the update workflow:

```bash
# Go to package repo
cd /Users/allenharper/Dropbox/code/secure-claude-skills-package

# Make a small change (e.g., update README)
echo "Test update" >> README.md
git add README.md
git commit -m "Test: Add update note to README"
git push

# Go to main repo
cd /Users/allenharper/Dropbox/code/secure-vibe-coding-OS

# Pull updates from subtree
git subtree pull --prefix=.claude/skills/security \
  https://github.com/harperaa/secure-claude-skills.git main --squash

# You should see the README change reflected in .claude/skills/security/README.md
```

## Step 6: Update Main Project README

Add a note to your main project README about the skills being managed as a separate package:

```markdown
## Security Skills

Security architecture is implemented through specialized Claude Code skills managed as a separate package:

- **Package**: [secure-claude-skills](https://github.com/harperaa/secure-claude-skills)
- **npm**: `npx secure-claude-skills init`
- **Location**: `.claude/skills/security/` (managed as git subtree)

The skills are synchronized with the main package using git subtree. To update:

\`\`\`bash
git subtree pull --prefix=.claude/skills/security \\
  https://github.com/harperaa/secure-claude-skills.git main --squash
\`\`\`
```

## Step 7: Optional - Add Convenience Script

Create a script to make subtree updates easier:

```bash
# In main repo root
cat > scripts/update-security-skills.sh << 'EOF'
#!/bin/bash
echo "Updating security skills from secure-claude-skills repo..."
git subtree pull --prefix=.claude/skills/security \
  https://github.com/harperaa/secure-claude-skills.git main --squash
echo "✅ Security skills updated!"
EOF

chmod +x scripts/update-security-skills.sh
```

Now you can update with:
```bash
bash scripts/update-security-skills.sh
```

## Workflow Summary

### For package updates:

1. **Edit skills** in package repo (`/secure-claude-skills-package/`)
2. **Commit and push** to GitHub
3. **Update npm** (bump version, `npm publish`)
4. **Pull into main project** via subtree

### For contributing from main project:

1. **Make changes** in main repo (`.claude/skills/security/`)
2. **Push to subtree repo**:
   ```bash
   git subtree push --prefix=.claude/skills/security \
     https://github.com/harperaa/secure-claude-skills.git main
   ```
3. **Update npm** from package repo

### For other users:

```bash
# Install skills in their project
npx secure-claude-skills init --sync subtree

# Later, get updates
npx secure-claude-skills update
```

## Troubleshooting

### npm publish fails with "package already exists"

- Package name is taken
- Use scoped package: `@harperaa/secure-claude-skills`
- Update package.json name and republish

### Subtree conflicts during pull

```bash
# If you get merge conflicts during subtree pull:
git status  # See conflicting files
# Resolve conflicts manually
git add .
git commit -m "Resolve subtree merge conflicts"
```

### Subtree push fails

- Make sure you have push access to the GitHub repo
- Check that remote URL is correct
- Ensure you're on main branch with committed changes

### CLI not working after npm install

```bash
# Verify bin script is executable
chmod +x bin/cli.js

# Test locally
node bin/cli.js --help
```

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Push package to GitHub
3. ✅ Publish to npm
4. ✅ Set up subtree in main project
5. ✅ Test installation
6. ✅ Update main project documentation
7. 🎉 Share with others!

## Publishing Updates (Future)

When you improve skills:

1. **Update skills in either repo**
2. **Sync repos**:
   ```bash
   # From main → package
   git subtree push --prefix=.claude/skills/security \
     https://github.com/harperaa/secure-claude-skills.git main

   # From package → main
   git subtree pull --prefix=.claude/skills/security \
     https://github.com/harperaa/secure-claude-skills.git main --squash
   ```
3. **Bump version** in package.json
4. **Publish to npm**: `npm publish`
5. **Users get updates**: `npx secure-claude-skills update`

## Support

- **Issues**: https://github.com/harperaa/secure-claude-skills/issues
- **Main Project**: https://github.com/harperaa/secure-vibe-coding-OS
- **npm**: https://www.npmjs.com/package/secure-claude-skills
