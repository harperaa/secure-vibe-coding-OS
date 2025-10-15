# Deployment Guide: 3-Environment Setup

This guide covers deploying your application with a professional 3-environment strategy: **Development**, **Preview/Testing**, and **Production**.

**Last Updated:** October 15, 2025
**For:** Secure Vibe Coding OS / More Secure Starter

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Details](#environment-details)
3. [Configuration Options](#configuration-options)
4. [Setup Guide](#setup-guide)
5. [Workflow](#workflow)
6. [Data Management](#data-management)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### The 3-Environment Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ DEVELOPMENT (Local)                                         │
│ ────────────────────────────────────────────────────────    │
│ Git Branch: dev / feature branches                          │
│ Running: npm run dev + npx convex dev                       │
│ Clerk: pk_test_... (Development instance)                   │
│ Convex: dev:your-deployment                                 │
│ Stripe: Test mode                                           │
│ Purpose: Experiments, breaking changes, new features        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    git push origin test
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PREVIEW/TESTING (Vercel Preview)                            │
│ ────────────────────────────────────────────────────────    │
│ Git Branch: test / staging                                  │
│ URL: https://your-app-git-test.vercel.app                   │
│ Clerk: pk_test_... OR separate staging instance            │
│ Convex: dev:deployment OR separate staging project          │
│ Stripe: Test mode                                           │
│ Purpose: QA, user testing, pre-production validation        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    merge test → main
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION (Vercel Production)                              │
│ ────────────────────────────────────────────────────────    │
│ Git Branch: main                                            │
│ URL: https://your-app.vercel.app                            │
│ Clerk: pk_live_... (Production instance)                    │
│ Convex: prod:your-deployment                                │
│ Stripe: Live mode (real payments)                           │
│ Purpose: Real users, real data, real revenue                │
└─────────────────────────────────────────────────────────────┘
```

### Why 3 Environments?

**Development:**
- Fast iteration
- Break things without consequences
- Test experimental features
- No user impact

**Preview/Testing:**
- Catch bugs before production
- QA testing with prod-like conditions
- Reproduce user-reported issues
- Final validation gate

**Production:**
- Real users and revenue
- Maximum stability
- Battle-tested code only
- Rollback-ready

---

## Environment Details

### Environment 1: Development (Local)

**Configuration:**
```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CONVEX_DEPLOYMENT=dev:polite-bulldog-532
NEXT_PUBLIC_CONVEX_URL=https://polite-bulldog-532.convex.cloud
```

**Commands:**
```bash
npm run dev          # Next.js on localhost:3000
npx convex dev       # Convex dev deployment
```

**Characteristics:**
- Running on: `http://localhost:3000`
- Database: Personal dev database
- Users: Test accounts only
- Payments: Stripe test cards only
- Risk level: ZERO (isolated environment)

**Use for:**
- New feature development
- Schema changes
- Breaking changes
- Experimental code
- Learning and testing

---

### Environment 2: Preview/Testing (Vercel Preview)

**Git Setup:**
```bash
# Create and use test branch
git checkout -b test
git push origin test
```

**Vercel Configuration:**
- Automatically creates preview deployment
- URL: `https://your-app-git-test-username.vercel.app`
- Updates on every push to test branch

**Two Configuration Options:**

#### Option A: Share Dev Instance (Simpler)

**Vercel Preview Environment Variables:**
```bash
# Use same dev instances as local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CONVEX_DEPLOY_KEY=<same-dev-deploy-key>
# Other vars same as dev
```

**Pros:**
- ✅ Simple setup
- ✅ One less instance to manage
- ✅ Shares dev database (easy data access)

**Cons:**
- ⚠️ Could conflict with local dev work
- ⚠️ Not production-like data

#### Option B: Separate Staging Instances (Professional)

**Vercel Preview Environment Variables:**
```bash
# Separate staging instances
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_staging_...
CLERK_SECRET_KEY=sk_test_staging_...
CONVEX_DEPLOY_KEY=prod:staging-project|xxx
# Separate staging Convex project
```

**Pros:**
- ✅ Complete isolation from dev
- ✅ Can clone production data for testing
- ✅ Production-like environment
- ✅ No conflicts with local dev

**Cons:**
- Requires separate Convex project (staging-project)
- Requires separate Clerk instance (optional but recommended)

**Characteristics:**
- Running on: `https://your-app-git-test.vercel.app`
- Database: Staging database (optional clone of prod)
- Users: Test accounts OR cloned prod data
- Payments: Stripe test mode
- Risk level: LOW (can reset if needed)

**Use for:**
- QA testing
- Reproducing production bugs
- User acceptance testing
- Pre-production validation
- Testing with prod-like data

---

### Environment 3: Production (Vercel Production)

**Git Branch:** `main`

**Vercel Production Environment Variables:**
```bash
CONVEX_DEPLOY_KEY=prod:your-main-project|xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-prod.clerk.accounts.dev
CSRF_SECRET=<production-secret>
SESSION_SECRET=<production-secret>
# etc.
```

**Characteristics:**
- Running on: `https://your-app.vercel.app`
- Database: Production database (backed up regularly)
- Users: Real users
- Payments: Real money (Stripe live mode)
- Risk level: HIGH (affects revenue and users)

**Use for:**
- Serving real users
- Processing real payments
- Battle-tested code only

---

## Configuration Options

### Simple 2-Instance Setup

**For small teams or solo developers:**

```
Clerk:
  ├─ Development (local + preview)
  └─ Production

Convex:
  ├─ dev:deployment (local + preview)
  └─ prod:deployment (production)

Vercel:
  ├─ Preview Deployments → Uses dev instances
  └─ Production Deployment → Uses prod instances
```

**Environment Variables:**

| Environment | Clerk Keys | Convex Deployment |
|-------------|------------|-------------------|
| Local | pk_test_ | dev:deployment |
| Preview | pk_test_ (same) | dev:deployment (same) |
| Production | pk_live_ | prod:deployment |

---

### Professional 3-Instance Setup

**For production apps with QA requirements:**

```
Clerk:
  ├─ Development (local only)
  ├─ Staging (preview only) - Optional separate app
  └─ Production

Convex:
  ├─ dev:main-project (local)
  ├─ prod:staging-project (preview) - Separate project!
  └─ prod:main-project (production)

Vercel:
  ├─ Preview Deployments → Uses staging instances
  └─ Production Deployment → Uses prod instances
```

**Environment Variables:**

| Environment | Clerk Keys | Convex Deployment |
|-------------|------------|-------------------|
| Local | pk_test_main | dev:main-project |
| Preview | pk_test_staging | prod:staging-project |
| Production | pk_live_main | prod:main-project |

---

## Setup Guide

### Simple Setup (2 Instances)

#### 1. Configure Vercel Preview Environment

1. **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **For "Preview" environment**, add same variables as development:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # Same as dev
   CLERK_SECRET_KEY=sk_test_... # Same as dev
   # Copy all other vars from .env.local
   ```

3. **Create test branch:**
   ```bash
   git checkout -b test
   git push origin test
   ```

4. **Vercel automatically creates preview deployment**

**Done!** Preview shares dev instances.

---

### Professional Setup (3 Instances)

#### 1. Create Staging Convex Project

1. **Convex Dashboard** → **Create New Project** → Name it "your-app-staging"
2. **Generate production deploy key** for staging project
3. **Save the key:** `prod:staging-project|xxx...`

#### 2. (Optional) Create Staging Clerk Instance

**If you want separate staging Clerk:**

1. **Clerk Dashboard** → **Create new application** → Name it "YourApp Staging"
2. Configure same as your dev instance
3. Get test keys for staging

**OR use existing dev Clerk instance** (simpler)

#### 3. Configure Vercel Preview Environment

**Vercel → Settings → Environment Variables:**

**Add for "Preview" environment:**
```bash
# Staging Convex
CONVEX_DEPLOY_KEY=prod:staging-project|xxx

# Clerk (use dev instance or separate staging)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://....clerk.accounts.dev

# Site config
NEXT_PUBLIC_SITE_NAME=Secure Vibe Coding OS (Staging)

# CSRF (same as dev)
CSRF_SECRET=<same-as-dev>
SESSION_SECRET=<same-as-dev>

# Redirects (same)
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
# ... etc
```

#### 4. Set Up Staging Webhooks

**In Clerk (dev or staging instance):**
1. **Webhooks** → **Add Endpoint**
2. **URL:** `https://your-staging-deployment.convex.site/clerk-users-webhook`
3. **Events:** user.created, user.updated, user.deleted, paymentAttempt.updated
4. **Copy secret**

**In Convex Staging Project:**
1. **Environment Variables** → Add:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_staging_secret
   NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://...clerk.accounts.dev
   ```

#### 5. Clone Production Data to Staging (Optional)

**To test with prod-like data:**

```bash
# Export from production
npx convex export --deployment prod:main-project

# Import to staging
npx convex import --deployment prod:staging-project --table users --table paymentAttempts
```

**Note:** Sanitize sensitive data before importing:
- Remove real email addresses
- Clear payment information
- Anonymize user data

---

## Workflow

### Daily Development Workflow

#### Step 1: Local Development

```bash
# Work on dev branch
git checkout dev

# Start dev servers
npm run dev          # Terminal 1
npx convex dev       # Terminal 2

# Make changes, test locally
# Uses dev Clerk + Convex instances
```

#### Step 2: Push to Testing/Preview

```bash
# When feature is ready for testing
git checkout test
git merge dev
git push origin test
```

**What happens:**
- Vercel auto-deploys to Preview URL
- Preview uses test/staging instances
- QA team can test on `https://your-app-git-test.vercel.app`
- Safe environment for user testing

#### Step 3: Production Deployment

```bash
# After QA approval
git checkout main
git merge test  # OR create PR: test → main
git push origin main
```

**What happens:**
- Vercel auto-deploys to Production URL
- Production uses prod instances (pk_live_, prod:deployment)
- Real users see changes
- Stripe processes real payments

### Emergency Hotfix Workflow

```bash
# Critical bug in production
git checkout main
git checkout -b hotfix/critical-bug

# Fix the bug
# Test locally (uses dev instances)

# Push directly to main (skip preview)
git checkout main
git merge hotfix/critical-bug
git push origin main

# Vercel deploys immediately
```

### Rollback Workflow

**If deployment breaks production:**

```bash
# Option 1: Revert via Vercel Dashboard
# Vercel → Deployments → Previous deployment → Promote to Production

# Option 2: Git revert
git revert HEAD
git push origin main
# Vercel auto-deploys reverted version
```

---

## Data Management

### Database Snapshots

**Regular backup schedule:**

```bash
# Export production data (run weekly or daily)
npx convex export --deployment prod:main-project --format jsonl

# Save export with timestamp
mv export-*.jsonl backups/prod-backup-$(date +%Y%m%d).jsonl
```

**Automate with cron or GitHub Actions:**

```yaml
# .github/workflows/backup-convex.yml
name: Backup Convex Production
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - run: npx convex export --deployment ${{ secrets.PROD_DEPLOYMENT }}
      - # Upload to S3, Google Cloud Storage, etc.
```

### Data Cloning for Testing

**Clone production data to staging:**

```bash
# 1. Export from production
npx convex export --deployment prod:main-project

# 2. Sanitize sensitive data (IMPORTANT!)
# Edit the export file:
# - Replace real emails with test emails
# - Remove payment card info
# - Anonymize PII

# 3. Import to staging
npx convex import --deployment prod:staging-project --replace-all

# 4. Verify in Convex Dashboard
# Staging should now have prod-like data (sanitized)
```

**When to clone:**
- Before major migrations
- When reproducing production bugs
- For performance testing with realistic data volumes
- User acceptance testing

### Rollback Strategy

**Database rollback:**

1. **If schema migration fails:**
   ```bash
   # Revert code deployment (via Vercel or git)
   # Restore database from backup
   npx convex import --deployment prod:main-project backup.jsonl
   ```

2. **Use Convex snapshots:**
   - Convex automatically snapshots before migrations
   - Contact Convex support for emergency restore

**Application rollback:**

1. **Vercel Dashboard:**
   - Deployments tab
   - Find last working deployment
   - Click "Promote to Production"

2. **OR via git:**
   ```bash
   git revert <bad-commit>
   git push origin main
   ```

**Best Practice:**
- Always test migrations on staging first
- Keep recent backups
- Monitor production after deploys
- Have rollback plan ready

---

## Vercel Environment Configuration

### Branch-Based Deployment Configuration

**In Vercel Dashboard → Settings → Git:**

1. **Production Branch:** `main`
2. **Automatic deployments from:** ✅ All branches (creates previews)
3. **Enable preview deployments:** ✅ Yes

### Environment Variables by Environment

**Critical: Use Vercel's environment selector when adding each variable!**

#### Preview Environment Variables

**Select "Preview" when adding these:**

```bash
# Option A: Simple (share dev instances)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_dev_key
CLERK_SECRET_KEY=sk_test_your_dev_key
CONVEX_DEPLOY_KEY=<dev-deploy-key>
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-dev.clerk.accounts.dev

# Option B: Professional (separate staging)
CONVEX_DEPLOY_KEY=prod:staging-project|xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_staging_key
CLERK_SECRET_KEY=sk_test_staging_key
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-staging.clerk.accounts.dev

# Common to both options
NEXT_PUBLIC_SITE_NAME=Secure Vibe Coding OS (Preview)
CSRF_SECRET=<your-csrf-secret>
SESSION_SECRET=<your-session-secret>
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

#### Production Environment Variables

**Select "Production" when adding these:**

```bash
# Production instances only
CONVEX_DEPLOY_KEY=prod:main-project|xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-prod.clerk.accounts.dev

# Site config
NEXT_PUBLIC_SITE_NAME=Secure Vibe Coding OS

# CSRF secrets (keep same as dev for simplicity, or use separate prod secrets)
CSRF_SECRET=<your-csrf-secret>
SESSION_SECRET=<your-session-secret>

# Redirects (same)
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

---

## Complete Setup Guide (Professional 3-Environment)

### Phase 1: Clerk Setup

#### Create Development Instance (Already Done)

You already have this from initial setup.

#### Create Staging Clerk Instance (Optional)

1. **Clerk Dashboard** → **Create new application**
2. **Name:** "YourApp Staging"
3. **Configure:** Same settings as dev instance
4. **Get keys:** Save pk_test_staging and sk_test_staging
5. **OAuth:** Can use Clerk's shared credentials (it's still development)
6. **Billing:** Connect Stripe in test mode (or skip if not testing payments)

#### Create Production Instance

**Follow README production setup guide** (already documented)

**Result: You now have:**
- Development instance (for local dev)
- Staging instance (for preview) - Optional
- Production instance (for live users)

---

### Phase 2: Convex Setup

#### Keep Development Deployment (Already Done)

Your `dev:polite-bulldog-532` deployment.

#### Create Staging Convex Project

1. **Convex Dashboard** → **Create New Project**
2. **Name:** "your-app-staging"
3. **Initialize:** Run `npx convex deploy` once to create prod deployment in this project
4. **Generate deploy key:** Settings → Deploy Keys → Generate production key
5. **Save key:** `prod:staging-project|xxx...`

#### Create Production Deployment (Main Project)

**In your original project:**

1. **Settings** → **Deploy Keys** → **Generate production deploy key**
2. **Save:** `prod:main-project|xxx...`

**Result: You now have:**
- `dev:main-project` (local dev)
- `prod:staging-project` (preview/testing) - In separate Convex project
- `prod:main-project` (production) - In main Convex project

---

### Phase 3: Vercel Setup

#### Configure Build Command

**Vercel → Settings → General → Build & Development Settings:**

```bash
Build Command: npx convex deploy --cmd 'npm run build'
```

#### Add Environment Variables

**Follow tables above** - add variables for both Preview and Production environments.

**Critical:**
- Use environment selector dropdown for each variable
- Preview environment = test branch deployments
- Production environment = main branch deployments

---

### Phase 4: Webhook Setup

#### Local Development Webhooks (Already Configured)

Uses ngrok or Convex's built-in dev webhook forwarding.

#### Preview/Staging Webhooks

**In Clerk (dev or staging instance):**
1. Add webhook: `https://staging-deployment.convex.site/clerk-users-webhook`
2. Copy secret
3. Add to Convex staging environment variables

#### Production Webhooks

**In Clerk (production instance):**
1. Add webhook: `https://prod-deployment.convex.site/clerk-users-webhook`
2. Copy secret
3. Add to Convex production environment variables

---

## Workflow Reference

### Feature Development Flow

```bash
# 1. Start on dev branch
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Develop locally
npm run dev
npx convex dev
# Make changes, test

# 4. Commit and merge to dev
git add .
git commit -m "Add new feature"
git checkout dev
git merge feature/new-feature
git push origin dev

# 5. Merge to test branch for QA
git checkout test
git merge dev
git push origin test
# → Vercel deploys to Preview
# → QA team tests on preview URL

# 6. After QA approval, merge to main
git checkout main
git merge test  # OR create PR
git push origin main
# → Vercel deploys to Production
# → Users see new feature
```

### Schema Migration Flow

```bash
# 1. Develop schema change locally
# Edit convex/schema.ts

# 2. Test migration locally
npx convex dev
# Verify migration works

# 3. Push to test branch
git checkout test
git merge dev
git push origin test
# → Preview deploys with new schema
# → Test migration on preview

# 4. Clone prod data to staging (optional)
npx convex export --deployment prod:main-project
# Sanitize data
npx convex import --deployment prod:staging-project --replace-all
# → Staging now has prod-like data
# → Test migration against realistic data

# 5. If migration successful, deploy to prod
git checkout main
git merge test
git push origin main
# → Production deploys with migration
# → Convex automatically migrates schema
```

**Safety Net:**
- Convex automatically backs up before migrations
- Test on preview/staging first
- Monitor production after deploy
- Have backup ready for rollback

---

## Best Practices

### Development

✅ **DO:**
- Use dev branch for all development
- Run `npx convex dev` locally
- Test with Stripe test cards
- Break things freely

❌ **DON'T:**
- Point local .env.local to production
- Run `npx convex dev` with prod credentials
- Test risky features on prod

### Preview/Testing

✅ **DO:**
- Test every feature on preview before production
- Use for QA and user acceptance testing
- Reproduce production bugs here
- Test schema migrations

❌ **DON'T:**
- Skip testing phase (always test before prod)
- Use real payment cards on preview
- Assume preview = production

### Production

✅ **DO:**
- Monitor after every deployment
- Keep database backups
- Use Stripe test mode first, then switch to live
- Have rollback plan ready
- Test yourself before announcing to users

❌ **DON'T:**
- Deploy untested code to main
- Make schema changes without staging test
- Ignore warning messages
- Skip backups

---

## Monitoring and Observability

### What to Monitor

**Vercel:**
- Deployment status and logs
- Build failures
- Runtime errors
- Performance metrics

**Convex:**
- Function execution logs
- Database query performance
- Webhook delivery status
- Error rates

**Clerk:**
- User sign-ups
- Authentication failures
- Billing events
- Webhook delivery

**Stripe:**
- Payment success/failure rates
- Revenue tracking
- Subscription churn
- Failed charges

### Setting Up Alerts

**Recommended integrations:**
- Vercel → Enable deployment notifications
- Sentry → Error tracking and alerts
- Convex → Monitor function logs
- Clerk → Enable email notifications for critical events

---

## Troubleshooting

### Preview Deployment Issues

**Problem: Preview deployment failing**

**Solution:**
1. Check Vercel deployment logs
2. Verify Preview environment variables are set
3. Ensure `CONVEX_DEPLOY_KEY` is correct
4. Check if Convex staging deployment exists

**Problem: Preview shows old code**

**Solution:**
```bash
# Force redeploy
git commit --allow-empty -m "Trigger redeploy"
git push origin test
```

### Production Deployment Issues

**Problem: Production deployment failing**

**Solution:**
1. Check Vercel build logs for errors
2. Verify `CONVEX_DEPLOY_KEY` is set for Production
3. Ensure all required env vars present
4. Test build locally: `npm run build`

**Problem: Webhooks not firing in production**

**Solution:**
1. Verify webhook URL is correct (prod Convex URL)
2. Check webhook secret matches in Convex env vars
3. Test webhook in Clerk Dashboard (Send Test Event)
4. Check Convex function logs for errors

**Problem: Users can't subscribe in production**

**Solution:**
1. Verify Stripe is connected in Clerk production instance
2. Check CSP allows Stripe domains (middleware.ts)
3. Verify Stripe mode (test vs live)
4. Check browser console for CSP errors

### Database Issues

**Problem: Data not syncing between environments**

**Solution:**
- Each environment has separate database (this is intentional)
- To sync, manually export/import
- Don't expect automatic sync across environments

**Problem: Lost production data**

**Solution:**
1. Check Convex automatic snapshots (before migrations)
2. Restore from your manual backups
3. Contact Convex support for emergency restore

---

## Environment Summary Table

| Aspect | Development | Preview/Testing | Production |
|--------|-------------|-----------------|------------|
| **Git Branch** | dev/feature | test/staging | main |
| **URL** | localhost:3000 | git-test.vercel.app | your-app.vercel.app |
| **Clerk Keys** | pk_test_ | pk_test_ (or staging) | pk_live_ |
| **Convex** | dev:deployment | dev: OR staging: | prod:deployment |
| **Stripe Mode** | Test | Test | Live (after validation) |
| **Users** | Test accounts | Test accounts | Real users |
| **Payments** | Fake | Fake | Real money |
| **Risk** | ZERO | LOW | HIGH |
| **Purpose** | Experimentation | QA/Validation | Live users |
| **Database** | Personal dev DB | Staging DB | Production DB |
| **Backups** | Not needed | Optional | CRITICAL |
| **Monitoring** | Optional | Recommended | REQUIRED |

---

## Recommendations

### For Solo Developers / Small Projects

**Use Simple 2-Instance Setup:**
- Development (local + preview)
- Production

**Rationale:**
- Easier to manage
- Lower cost (fewer instances)
- Preview shares dev database (fine for small teams)
- Still provides QA gate before production

### For Teams / Production Apps

**Use Professional 3-Instance Setup:**
- Development (local only)
- Staging (preview with separate instances)
- Production

**Rationale:**
- Complete isolation
- Can test with prod-like data safely
- Prevents local dev conflicts with QA
- Industry-standard approach
- Better for compliance (SOC 2, etc.)

### For Your Current Use Case

**Based on your workflow (dev → test → main with snapshots and rollback):**

**Recommended: Professional 3-Instance Setup**

**Why:**
- ✅ You already have the discipline (test branch, careful merging)
- ✅ You understand risk management (snapshots, rollback)
- ✅ You want to troubleshoot user issues safely
- ✅ Preview with prod-like data = better testing

**Setup:**
1. Create separate staging Convex project
2. Use dev Clerk instance for both local and preview (simpler)
3. Configure Vercel preview environment
4. Clone prod data to staging periodically
5. Test everything on preview before main

---

## Quick Start Commands

### Development
```bash
git checkout dev
npm run dev
npx convex dev
```

### Deploy to Preview
```bash
git checkout test
git merge dev
git push origin test
# Visit: https://your-app-git-test.vercel.app
```

### Deploy to Production
```bash
git checkout main
git merge test
git push origin main
# Visit: https://your-app.vercel.app
```

### Backup Production
```bash
npx convex export --deployment prod:main-project
```

### Clone Prod to Staging
```bash
npx convex export --deployment prod:main-project
# Sanitize data in export file
npx convex import --deployment prod:staging-project --replace-all
```

---

## Security Considerations

### Environment Isolation

**Critical:**
- Never share secrets across environments inappropriately
- Production secrets should be different from dev
- Use separate deploy keys for each Convex deployment
- Monitor who has access to production credentials

### CSRF Secrets

**Options:**

**Option 1: Same secrets (simpler):**
```bash
# Same CSRF_SECRET and SESSION_SECRET in all environments
```
- Simpler to manage
- Fine for most use cases

**Option 2: Different secrets (more secure):**
```bash
# Dev
CSRF_SECRET=dev-secret-xxx

# Staging
CSRF_SECRET=staging-secret-xxx

# Production
CSRF_SECRET=prod-secret-xxx
```
- Maximum isolation
- Better for compliance
- More complex to manage

### Webhook Secrets

**Must be different for each environment:**
```bash
# Preview
CLERK_WEBHOOK_SECRET=whsec_preview_xxx

# Production
CLERK_WEBHOOK_SECRET=whsec_prod_xxx
```

This ensures webhooks go to correct environment.

---

## Maintenance Schedule

### Daily
- Monitor production error rates
- Check deployment status
- Review user sign-ups

### Weekly
- Export production database backup
- Review Preview/QA test results
- Check for dependency updates (`npm audit`)

### Monthly
- Update dependencies (`npm update`)
- Review security audit (`bash scripts/security-check.sh`)
- Test disaster recovery (restore from backup to staging)

### Quarterly
- Review and rotate secrets
- Audit user access to production
- Performance optimization review
- Security posture review (OWASP assessment)

---

## Additional Resources

**Official Documentation:**
- Clerk Deployments: https://clerk.com/docs/deployments/overview
- Convex Production: https://docs.convex.dev/production/
- Vercel Deployment: https://vercel.com/docs/deployments/overview

**Project Documentation:**
- `README.md` - Setup and features
- `docs/security/SECURITY_IMPLEMENTATION.md` - Security controls
- `docs/security/OWASP_TOP_10_ASSESSMENT.md` - Security audit
- `.cursor/rules/security_rules.mdc` - Security coding rules

**Testing:**
- `scripts/test-rate-limit.js` - Rate limiting tests
- `scripts/security-check.sh` - Security audit

---

## Summary

Your 3-environment workflow is **industry best practice** and provides:

✅ **Safety:** Test everything before production
✅ **Isolation:** Environments don't interfere
✅ **Flexibility:** Reproduce prod bugs safely in staging
✅ **Risk Management:** Snapshots and rollback capability
✅ **User Protection:** Production changes are pre-validated

**Key Takeaways:**
1. **Never** point local dev to production
2. **Always** test on preview/staging first
3. **Regular** database backups
4. **Monitor** production after deploys
5. **Have** rollback plan ready

**Your workflow (dev → test → main) with the professional 3-instance setup is the gold standard for SaaS deployment.** 🏆
