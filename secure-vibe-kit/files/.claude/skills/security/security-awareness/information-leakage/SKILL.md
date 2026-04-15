---
name: information-leakage-hardcoded-secrets-ai-code
description: Understand how AI-generated code exposes sensitive information through hardcoded credentials and verbose logging. Use this skill when you need to learn about hardcoded secrets in AI code, understand logging vulnerabilities, recognize exposed API keys, or prevent information disclosure. Triggers include "hardcoded credentials", "hardcoded secrets", "API keys in code", "information leakage", "verbose logging", "exposed secrets", "AWS keys", "logging vulnerabilities", "sensitive data logs".
---

# Sensitive Information Exposure in AI-Generated Code

## The Pervasiveness of Hardcoded Secrets

A comprehensive analysis by WebProNews found:

> "AI models trained on public repositories frequently suggest hardcoding API keys and credentials, as these patterns appear millions of times in their training data."

The problem is exacerbated by the fact that many developers using vibe coding are non-technical and unaware of the security implications.

## 1.3.1 Hardcoded Credentials

### The Real-World Incident

Research from Analytics India Magazine documented a real-world incident:

> "A developer used Cursor to build a SaaS app and accidentally committed hardcoded AWS credentials. Within days, attackers had discovered the exposed keys and racked up **thousands of dollars in charges**."

This is not theoretical—it's happening regularly.

### AI-Generated Vulnerable Code

```python
# Prompt: "Connect to AWS S3 and upload files"
import boto3
import stripe
import requests

class CloudStorage:
    def __init__(self):
        # ❌ CRITICAL: Hardcoded AWS credentials
        self.aws_key = "AKIAIOSFODNN7EXAMPLE"
        self.aws_secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

        # ❌ CRITICAL: Hardcoded API keys
        self.stripe_key = "sk_live_EXAMPLE_DO_NOT_USE_HARDCODED_KEYS"
        self.sendgrid_key = "SG.EXAMPLE_KEY_DO_NOT_HARDCODE"

        # ❌ CRITICAL: Database credentials in code
        self.db_config = {
            'host': 'prod-db.company.com',
            'user': 'admin',
            'password': 'SuperSecretPass123!',
            'database': 'production'
        }

    def upload_to_s3(self, file_path, bucket_name):
        # ❌ VULNERABLE: Using hardcoded credentials
        s3 = boto3.client(
            's3',
            aws_access_key_id=self.aws_key,
            aws_secret_access_key=self.aws_secret
        )
        s3.upload_file(file_path, bucket_name, file_path)

# Prompt: "Send API request with authentication"
def fetch_user_data(user_id):
    # ❌ VULNERABLE: API key in URL
    response = requests.get(
        f"https://api.service.com/users/{user_id}?api_key=abc123def456"
    )
    return response.json()
```

### Why This Is Critically Dangerous

**1. Committed to Version Control:**
- Code pushed to GitHub/GitLab
- Secrets now in git history forever
- Even if removed in later commit, still in history
- Public repos = instant compromise
- Private repos = compromised if repo breached

**2. Bots Scan for Exposed Secrets:**
- Automated bots scan GitHub 24/7
- Find exposed AWS keys within **minutes**
- Immediately start using them
- Rack up charges before you notice

**3. Difficult to Rotate:**
- Once exposed, must rotate all keys
- May require updating multiple services
- Downtime during rotation
- Some keys can't be rotated easily

### Secure Implementation

```python
import os
import boto3
import stripe
from dotenv import load_dotenv
from aws_secretsmanager import get_secret
import logging

# ✅ SECURE: Load environment variables from .env file (not in version control)
load_dotenv()

class CloudStorageSecure:
    def __init__(self):
        # ✅ SECURE: Retrieve credentials from environment variables
        self.aws_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')

        # ✅ SECURE: Use AWS Secrets Manager for production
        if os.getenv('ENVIRONMENT') == 'production':
            secrets = self._get_secrets_from_aws()
            self.stripe_key = secrets['stripe_key']
            self.sendgrid_key = secrets['sendgrid_key']
        else:
            self.stripe_key = os.getenv('STRIPE_KEY')
            self.sendgrid_key = os.getenv('SENDGRID_KEY')

        # ✅ SECURE: Database connection from environment
        self.db_config = {
            'host': os.getenv('DB_HOST'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_NAME'),
            'ssl_ca': os.getenv('DB_SSL_CA'),  # SSL for production
            'ssl_verify_cert': True
        }

        # ✅ SECURE: Validate all credentials are present
        self._validate_configuration()

    def _get_secrets_from_aws(self):
        """Retrieve secrets from AWS Secrets Manager"""
        session = boto3.session.Session()
        client = session.client(service_name='secretsmanager')

        try:
            response = client.get_secret_value(SecretId='prod/api-keys')
            return json.loads(response['SecretString'])
        except Exception as e:
            logging.error(f"Failed to retrieve secrets: {e}")
            raise

    def _validate_configuration(self):
        """Ensure all required configuration is present"""
        required_vars = [
            'aws_key', 'aws_secret', 'stripe_key',
            'sendgrid_key', 'db_config'
        ]

        for var in required_vars:
            if not getattr(self, var, None):
                raise ValueError(f"Missing required configuration: {var}")

    def upload_to_s3(self, file_path, bucket_name):
        # ✅ SECURE: Use IAM roles in production instead of keys
        if os.getenv('ENVIRONMENT') == 'production':
            s3 = boto3.client('s3')  # Uses IAM role
        else:
            s3 = boto3.client(
                's3',
                aws_access_key_id=self.aws_key,
                aws_secret_access_key=self.aws_secret
            )

        # ✅ SECURE: Add encryption and access logging
        s3.upload_file(
            file_path,
            bucket_name,
            file_path,
            ExtraArgs={
                'ServerSideEncryption': 'AES256',
                'Metadata': {
                    'uploaded_by': os.getenv('APP_NAME', 'unknown'),
                    'upload_time': str(datetime.utcnow())
                }
            }
        )

def fetch_user_data_secure(user_id):
    # ✅ SECURE: Use headers for API authentication
    headers = {
        'Authorization': f"Bearer {os.getenv('API_TOKEN')}",
        'X-API-Key': os.getenv('API_KEY'),
        'X-Request-ID': str(uuid.uuid4())  # For tracking
    }

    # ✅ SECURE: Never put secrets in URLs
    response = requests.get(
        f"https://api.service.com/users/{user_id}",
        headers=headers,
        timeout=10  # Always set timeouts
    )

    # ✅ SECURE: Log requests without exposing secrets
    logging.info(f"API request to /users/{user_id} - Status: {response.status_code}")

    return response.json()
```

### Why AI Hardcodes Credentials

**1. Prevalence in Training Data:**
- Millions of code examples on GitHub with hardcoded keys
- Tutorial code uses placeholder keys for simplicity
- AI learns this as "normal" pattern

**2. Simplicity:**
- Hardcoding is fewer lines of code
- No need to explain environment variables
- "Works" immediately in example

**3. Context Blindness:**
- AI doesn't distinguish between:
  - Example/tutorial code (hardcoded OK)
  - Production code (hardcoded NEVER OK)
- Treats all prompts the same way

### Where AI Hardcodes Secrets

**1. Direct Variable Assignment:**
```python
API_KEY = "sk_live_abc123def456"
AWS_SECRET = "wJalrXUtn..."
DATABASE_PASSWORD = "SuperSecret123!"
```

**2. In Configuration Objects:**
```javascript
const config = {
  stripeKey: 'sk_live_...',
  dbPassword: 'password123'
};
```

**3. In URLs:**
```javascript
fetch(`https://api.example.com/data?key=abc123def456`)
```

**4. In Connection Strings:**
```python
conn = mysql.connector.connect(
    host='prod.db.com',
    user='admin',
    password='SuperSecret123!'
)
```

### Attack Timeline

**T+0 minutes:** Developer commits code with hardcoded AWS keys
**T+5 minutes:** Bots detect exposed keys, begin using
**T+30 minutes:** $500 in unauthorized EC2 instances spun up
**T+2 hours:** Developer notices unusual AWS bill
**T+4 hours:** $10,000 in charges, keys finally rotated
**T+1 week:** Final bill: $50,000+

**This is a real timeline from documented incidents.**

### How to Find Hardcoded Secrets

**Scan your code:**
```bash
# Search for common secret patterns
grep -r "sk_live_" .
grep -r "AKIA" .  # AWS access keys
grep -r "api_key.*=" .
grep -r "password.*=" .
grep -r "secret.*=" .

# Use automated tools
npx secretlint "**/*"
truffleHog --regex --entropy=True .
git-secrets --scan
```

---

## 1.3.2 Information Leakage Through Logging

### The Problem

According to a report from Aikido Security:

> "Verbose logging in AI-generated code frequently exposes sensitive data, creating audit trails that become goldmines for attackers."

### AI-Generated Vulnerable Code

```javascript
// Prompt: "Add logging to payment processing"
const winston = require('winston');
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'app.log' }),
        new winston.transports.Console()
    ]
});

async function processPayment(paymentData) {
    // ❌ VULNERABLE: Logging sensitive payment information
    logger.info('Processing payment:', {
        cardNumber: paymentData.cardNumber,
        cvv: paymentData.cvv,
        expiryDate: paymentData.expiryDate,
        amount: paymentData.amount,
        customerName: paymentData.customerName,
        billingAddress: paymentData.billingAddress
    });

    try {
        const result = await paymentGateway.charge(paymentData);

        // ❌ VULNERABLE: Logging full response including tokens
        logger.info('Payment successful:', result);

        return result;
    } catch (error) {
        // ❌ VULNERABLE: Logging full error with stack trace
        logger.error('Payment failed:', {
            error: error.message,
            stack: error.stack,
            paymentData: paymentData,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                env: process.env  // This could expose ALL environment variables!
            }
        });
        throw error;
    }
}
```

### What's Wrong With This Logging

**1. Logging Full Payment Card Data:**
```javascript
cardNumber: paymentData.cardNumber,  // Full card number in logs
cvv: paymentData.cvv,                // CVV in logs
expiryDate: paymentData.expiryDate   // Expiry in logs
```

**Consequences:**
- **PCI-DSS violation** (cannot store CVV ever)
- Log files now contain full card details
- If logs leaked/hacked, cards compromised
- Massive fines under PCI-DSS

**2. Logging process.env:**
```javascript
env: process.env  // ALL environment variables
```

**Consequences:**
- Exposes ALL secrets (AWS keys, DB passwords, API tokens)
- One log file leak = complete compromise
- Environment variables should NEVER be logged

**3. Logging Stack Traces:**
```javascript
stack: error.stack
```

**Consequences:**
- Reveals file paths, internal structure
- Shows technology stack
- Helps attackers understand system

**4. Logging Full API Responses:**
```javascript
logger.info('Payment successful:', result);
```

**Consequences:**
- May contain tokens, sensitive user data
- Full response may have internal IDs
- Excessive data retention

### Secure Implementation

```javascript
const winston = require('winston');
const crypto = require('crypto');

// ✅ SECURE: Configure logging with security in mind
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: false }), // Don't log stack traces in production
        winston.format.json()
    ),
    defaultMeta: { service: 'payment-service' },
    transports: [
        new winston.transports.File({
            filename: 'error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: 'combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// ✅ SECURE: Add console logging only in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// ✅ SECURE: Utility functions for data sanitization
function maskCardNumber(cardNumber) {
    if (!cardNumber) return 'N/A';
    const cleaned = cardNumber.replace(/\D/g, '');
    return `${cleaned.slice(0, 4)}****${cleaned.slice(-4)}`;
}

function generateTransactionId() {
    return crypto.randomBytes(16).toString('hex');
}

function sanitizeError(error) {
    return {
        code: error.code || 'UNKNOWN',
        message: error.message?.replace(/[0-9]{4,}/g, '****') || 'An error occurred',
        type: error.constructor.name
    };
}

async function processPaymentSecure(paymentData) {
    const transactionId = generateTransactionId();

    // ✅ SECURE: Log only non-sensitive information
    logger.info('Payment initiated', {
        transactionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        cardType: detectCardType(paymentData.cardNumber),
        cardLast4: paymentData.cardNumber.slice(-4),
        timestamp: new Date().toISOString()
    });

    try {
        const result = await paymentGateway.charge(paymentData);

        // ✅ SECURE: Log only transaction metadata
        logger.info('Payment processed', {
            transactionId,
            status: 'success',
            processorTransactionId: result.transactionId,
            processingTime: result.processingTime
        });

        // ✅ SECURE: Never return sensitive data in response
        return {
            success: true,
            transactionId,
            maskedCard: maskCardNumber(paymentData.cardNumber),
            amount: paymentData.amount
        };

    } catch (error) {
        // ✅ SECURE: Log sanitized error information
        logger.error('Payment failed', {
            transactionId,
            errorCode: error.code,
            errorType: sanitizeError(error).type,
            cardLast4: paymentData.cardNumber.slice(-4),
            amount: paymentData.amount
        });

        // ✅ SECURE: Store detailed error in secure audit log
        if (process.env.AUDIT_LOG_ENABLED === 'true') {
            await secureAuditLog.write({
                transactionId,
                error: sanitizeError(error),
                timestamp: new Date().toISOString(),
                userId: paymentData.userId
            });
        }

        // ✅ SECURE: Return generic error to client
        throw new Error('Payment processing failed. Please try again or contact support.');
    }
}

// ✅ SECURE: Implement structured audit logging
class SecureAuditLog {
    async write(entry) {
        const encrypted = this.encrypt(JSON.stringify(entry));
        await this.storage.save({
            id: crypto.randomUUID(),
            data: encrypted,
            timestamp: new Date().toISOString(),
            checksum: this.generateChecksum(encrypted)
        });
    }

    encrypt(data) {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(process.env.AUDIT_LOG_KEY, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    generateChecksum(data) {
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }
}
```

### Why AI Generates Verbose Logging

**1. Debugging Habit:**
- Training data includes debug logging
- Developers log everything during development
- AI assumes this is good practice

**2. "More is Better" Assumption:**
- Detailed logs seem helpful
- AI doesn't understand sensitive vs non-sensitive data
- Logs everything for "completeness"

**3. No Security Classification:**
- AI can't identify PII (Personally Identifiable Information)
- Doesn't know PCI-DSS rules (no CVV storage)
- Can't distinguish between safe and unsafe to log

### What Should NEVER Be Logged

**❌ Never Log:**
- Passwords (even hashed ones)
- Credit card numbers
- CVV codes
- API keys, secrets, tokens
- Social security numbers
- Full addresses
- Full error stack traces (in production)
- Request/response bodies (may contain above)
- Environment variables
- Session tokens
- Encryption keys

**✅ Safe to Log:**
- User IDs (internal identifiers)
- Timestamps
- Error codes (not messages)
- HTTP status codes
- Request paths (not parameters)
- Transaction IDs
- Last 4 digits of card (for reference)
- IP addresses (for security monitoring)
- Operation names

### Logging Best Practices

**1. Use Log Levels Appropriately:**
```javascript
logger.error()  // Production errors only
logger.warn()   // Warnings in production
logger.info()   // Important events (redacted)
logger.debug()  // Development only (never in production)
```

**2. Redact Sensitive Fields:**
```javascript
const SENSITIVE_FIELDS = [
    'password', 'token', 'secret', 'apiKey',
    'ssn', 'creditCard', 'cvv', 'cardNumber'
];

function redactSensitive(data) {
    const redacted = { ...data };
    SENSITIVE_FIELDS.forEach(field => {
        if (field in redacted) {
            redacted[field] = '[REDACTED]';
        }
    });
    return redacted;
}

logger.info('User action', redactSensitive(userData));
```

**3. Mask Partial Data:**
```javascript
// Show last 4 digits only
cardLast4: card.slice(-4)

// Mask email
email: email.replace(/(.{2}).*(@.*)/, '$1***$2')
// john.doe@example.com → jo***@example.com
```

**4. Use Structured Audit Logs:**
```javascript
// Separate audit log for security events
// Encrypted, access-controlled, immutable
await auditLog.write({
    event: 'PAYMENT_PROCESSED',
    userId: user.id,
    transactionId: tx.id,
    amount: amount,
    // No sensitive card data
});
```

## Implementation for This Project

### Environment Variables Pattern

```bash
# .env.local (NEVER commit this file)

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://...
CONVEX_DEPLOYMENT=...

# CSRF & Sessions
CSRF_SECRET=<generate-32-bytes>
SESSION_SECRET=<generate-32-bytes>

# Stripe (if using direct Stripe, not Clerk Billing)
STRIPE_SECRET_KEY=sk_test_...

# Generate secrets:
# node -p "require('crypto').randomBytes(32).toString('base64url')"
```

**Using Environment Variables:**
```typescript
// app/api/example/route.ts
const apiKey = process.env.API_KEY;  // ✅ From environment
const dbPassword = process.env.DB_PASSWORD;  // ✅ From environment

// ❌ Never do this:
const apiKey = "sk_live_abc123";
```

### Secure Logging Pattern

```typescript
// lib/logger.ts
export function logSecurityEvent(event: {
  type: string;
  userId?: string;
  details?: Record<string, any>;
}) {
  const log = {
    type: event.type,
    userId: event.userId,
    // Redact sensitive fields from details
    details: redactSensitive(event.details || {}),
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(log));
}

// Usage
logSecurityEvent({
  type: 'LOGIN_SUCCESS',
  userId: user.id,
  details: {
    ip: request.ip,
    userAgent: request.headers.get('user-agent')
    // No passwords, no tokens
  }
});
```

## Real-World Cost of Information Leakage

### AWS Credentials Exposure

**Incident Pattern:**
1. Developer asks AI: "Connect to AWS S3"
2. AI generates code with hardcoded keys
3. Developer commits to GitHub (public or private)
4. Bots find keys within minutes
5. Attackers spin up EC2 instances for cryptocurrency mining
6. Charges accumulate: $1,000/hour typical
7. Developer notices days later
8. Final bill: $50,000-$200,000

**Real documented case:**
- Developer posted code with AWS keys on GitHub
- **Within 12 hours: $40,000 in charges**
- Used for Bitcoin mining on EC2
- Developer's startup nearly bankrupt

### Logging Exposure Examples

**Incident 1: Full Request Logging:**
```javascript
// Vulnerable logging
app.post('/api/login', (req, res) => {
    logger.info('Login attempt:', req.body);
    // Logs: {username: "john", password: "secret123"}
});
```

**Result:**
- Passwords in log files
- Log breach = credential theft
- No encryption on logs = plaintext passwords

**Incident 2: Environment Variable Logging:**
```javascript
// During debugging
console.log('Config:', process.env);
```

**Result:**
- All secrets in console output
- Console saved to log files
- Developers copy-paste logs (with secrets) into Slack/email

## How to Prevent Information Leakage

### 1. Never Hardcode Secrets

**Always use environment variables:**
```typescript
// ✅ Correct
const apiKey = process.env.API_KEY;

// ❌ Wrong
const apiKey = "sk_live_abc123";
```

### 2. Use .env.local (Not Committed)

```bash
# Add to .gitignore
.env.local
.env.*.local
```

### 3. Validate Configuration on Startup

```typescript
// lib/config.ts
const requiredEnvVars = [
  'CLERK_SECRET_KEY',
  'CSRF_SECRET',
  'SESSION_SECRET',
  'NEXT_PUBLIC_CONVEX_URL'
];

export function validateConfig() {
  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// In app startup
validateConfig();
```

### 4. Never Log Sensitive Data

**Create logging utilities:**
```typescript
// lib/safe-logger.ts
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /apikey/i,
  /creditcard/i,
  /cvv/i,
  /ssn/i
];

export function safeLog(message: string, data?: any) {
  if (!data) {
    console.log(message);
    return;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 16) {
      // Mask long strings (could be tokens)
      sanitized[key] = value.slice(0, 4) + '****';
    } else {
      sanitized[key] = value;
    }
  }

  console.log(message, sanitized);
}
```

## See Also

### Implementation Skills (How to Fix)

→ **`error-handling` skill** - Prevent information leakage in error messages
→ **`payment-security` skill** - Never log payment data (use Clerk Billing)
→ **`security-testing` skill** - Scan for hardcoded secrets

### Related Awareness Skills

→ **`auth-vulnerabilities` skill** - Credentials in authentication code
→ **`supply-chain-risks` skill** - Secrets in dependencies
→ **`awareness-overview` skill** - Overall AI security risks

## Key Takeaways

✅ **Millions of examples in AI training data** show hardcoded credentials
✅ **Bots find exposed secrets within minutes** of GitHub commits
✅ **Real costs: $40,000-$200,000** in unauthorized AWS charges
✅ **Verbose logging exposes** passwords, cards, tokens, full environment
✅ **Solution:** Environment variables + redacted logging + secret scanning
✅ **Never log:** Passwords, cards, CVV, tokens, API keys, process.env

**Remember:** Hardcoded secrets and verbose logging are **silent killers**—code works fine until attackers find the goldmine in your logs or git history.

---

**Related References:**

[13] WebProNews. (2025). "Vibe Coding AI: Speed vs Risks, No-Code Alternatives for 2025."
[14] Analytics India Magazine. (2025). "Real-World Vibe Coding Security Incidents."
[15] Aikido Security. (2025). "The State of AI Code Security 2025."
