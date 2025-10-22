---
name: resource-exhaustion-dos-ai-generated-code
description: Understand resource exhaustion and denial of service vulnerabilities in AI code including unbounded loops, missing rate limits, and uncontrolled resource consumption. Use this skill when you need to learn about DoS vulnerabilities in AI code, understand resource limits, recognize unbounded operations, or prevent resource exhaustion. Triggers include "resource exhaustion", "DoS vulnerabilities", "denial of service", "unbounded resources", "API cost protection", "memory exhaustion", "uncontrolled consumption", "rate limiting DoS".
---

# Resource Exhaustion and Denial of Service in AI-Generated Code

## The Performance Security Nexus

Research from Databricks highlights:

> "Vibe coding often produces functionally correct but resource-inefficient code that can be exploited for denial of service attacks."

The AI's focus on **functionality over performance** creates multiple attack vectors.

## 1.6.1 Uncontrolled Resource Consumption

### The Problem

AI generates code that works perfectly for normal use but has no limits on resource consumption. This creates two major risks:

1. **Denial of Service (DoS):** Attackers overwhelm server, making it unavailable
2. **Cost Explosion:** Attackers abuse expensive operations (AI APIs, compute)

### AI-Generated Vulnerable Code

```javascript
// Prompt: "Create image processing endpoint"
app.post('/process-image', async (req, res) => {
    const { imageUrl, operations } = req.body;

    // ❌ VULNERABLE: No size or quantity limits
    const imageBuffer = await downloadImage(imageUrl);

    let processedImage = imageBuffer;

    // ❌ VULNERABLE: Unbounded loop
    for (const operation of operations) {
        processedImage = await applyOperation(processedImage, operation);
    }

    res.send(processedImage);
});

// Attack: Send huge image or hundreds of operations
// Result: Server memory exhaustion and crash
```

### Multiple Vulnerabilities in This Code

**1. No Image Size Limit:**
```javascript
const imageBuffer = await downloadImage(imageUrl);
```

**Attack:**
- Upload 500MB image
- Server downloads entire image to memory
- Multiple concurrent requests
- Server runs out of memory → crash

**2. No Operation Count Limit:**
```javascript
for (const operation of operations) {
    processedImage = await applyOperation(processedImage, operation);
}
```

**Attack:**
- Send 1000 operations
- Each operation processes image
- Server CPU at 100% for minutes
- Legitimate requests time out

**3. No Rate Limiting:**
```javascript
app.post('/process-image', async (req, res) => {
```

**Attack:**
- Send 10,000 requests simultaneously
- Server processes all (no queue)
- Server crashes or becomes unresponsive

**4. No Timeout:**
- Long-running operations never cancelled
- Malicious requests occupy resources forever
- Server capacity exhausted

**5. No Validation:**
- imageUrl could be anything
- Could point to 10GB file
- Could be internal URL (SSRF attack)

### The $200,000 AI Cost Attack (Real Story)

One startup built a "summarize any article" AI feature without rate limiting:

**Timeline:**
- **T+0:** Feature launches (no rate limiting)
- **T+10 min:** Malicious user scripts 10,000 requests
- **T+10 min:** 10,000 OpenAI API calls made ($0.96 per call average)
- **T+10 min:** **$9,600 in charges**
- **T+4 hours:** Attack still running, unnoticed
- **T+4 hours:** **Total cost exceeds $200,000**
- **T+5 hours:** Startup notices, shuts down endpoint
- **Outcome:** Near bankruptcy, scramble for emergency funding

**What went wrong:**
- No rate limiting (unlimited requests)
- No request queuing (all processed immediately)
- No cost monitoring alerts
- No maximum spend limits on OpenAI API

### Secure Implementation

```javascript
const rateLimit = require('express-rate-limit');
const sharp = require('sharp');

// ✅ SECURE: Rate limiting
const imageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ SECURE: Request size limiting
app.use(express.json({ limit: '1mb' }));

// ✅ SECURE: Resource limits configuration
const LIMITS = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_IMAGE_DIMENSION: 4000, // pixels
    MAX_OPERATIONS: 5,
    DOWNLOAD_TIMEOUT: 5000, // 5 seconds
    PROCESSING_TIMEOUT: 30000, // 30 seconds
    MAX_CONCURRENT_JOBS: 3
};

// ✅ SECURE: Job queue for controlled concurrency
const Queue = require('bull');
const imageQueue = new Queue('image-processing', {
    redis: {
        port: 6379,
        host: '127.0.0.1',
    },
    defaultJobOptions: {
        timeout: LIMITS.PROCESSING_TIMEOUT,
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: true
    }
});

// ✅ SECURE: Controlled image download
async function downloadImageSecure(url, limits) {
    // Validate URL
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/;
    if (!urlPattern.test(url)) {
        throw new Error('Invalid URL');
    }

    // ✅ SECURE: Prevent SSRF by checking against internal IPs
    const parsed = new URL(url);
    if (isInternalIP(parsed.hostname)) {
        throw new Error('Access to internal resources not allowed');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), limits.DOWNLOAD_TIMEOUT);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            size: limits.MAX_IMAGE_SIZE, // Limit response size
            headers: {
                'User-Agent': 'ImageProcessor/1.0'
            }
        });

        clearTimeout(timeout);

        // ✅ SECURE: Validate content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('Invalid content type');
        }

        // ✅ SECURE: Check content length
        const contentLength = parseInt(response.headers.get('content-length'));
        if (contentLength > limits.MAX_IMAGE_SIZE) {
            throw new Error('Image too large');
        }

        return await response.buffer();
    } finally {
        clearTimeout(timeout);
    }
}

app.post('/process-image', imageLimiter, async (req, res) => {
    const { imageUrl, operations } = req.body;

    // ✅ SECURE: Validate operations count
    if (!Array.isArray(operations) || operations.length > LIMITS.MAX_OPERATIONS) {
        return res.status(400).json({
            error: `Maximum ${LIMITS.MAX_OPERATIONS} operations allowed`
        });
    }

    // ✅ SECURE: Queue job instead of processing directly
    const job = await imageQueue.add('process', {
        imageUrl,
        operations,
        userId: req.user?.id,
        ip: req.ip
    });

    res.json({
        jobId: job.id,
        status: 'queued',
        estimatedTime: await imageQueue.getJobCounts()
    });
});

// ✅ SECURE: Process jobs with resource controls
imageQueue.process('process', LIMITS.MAX_CONCURRENT_JOBS, async (job) => {
    const { imageUrl, operations } = job.data;

    // Download with limits
    const imageBuffer = await downloadImageSecure(imageUrl, LIMITS);

    // ✅ SECURE: Use sharp with resource limits
    let pipeline = sharp(imageBuffer, {
        limitInputPixels: LIMITS.MAX_IMAGE_DIMENSION ** 2,
        sequentialRead: true, // Lower memory usage
    });

    // Get image metadata to validate
    const metadata = await pipeline.metadata();

    if (metadata.width > LIMITS.MAX_IMAGE_DIMENSION ||
        metadata.height > LIMITS.MAX_IMAGE_DIMENSION) {
        throw new Error('Image dimensions exceed limits');
    }

    // ✅ SECURE: Apply operations with validation
    for (const op of operations) {
        pipeline = applyOperationSecure(pipeline, op, LIMITS);
    }

    // ✅ SECURE: Output with format restrictions
    const output = await pipeline
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

    // Store result temporarily
    await storeResult(job.id, output);

    return {
        success: true,
        resultId: job.id,
        size: output.length
    };
});

function applyOperationSecure(pipeline, operation, limits) {
    const { type, params } = operation;

    // ✅ SECURE: Whitelist allowed operations
    const allowedOps = ['resize', 'rotate', 'blur', 'sharpen', 'grayscale'];

    if (!allowedOps.includes(type)) {
        throw new Error(`Operation '${type}' not allowed`);
    }

    switch(type) {
        case 'resize':
            // ✅ SECURE: Validate dimensions
            const { width, height } = params;
            if (width > limits.MAX_IMAGE_DIMENSION ||
                height > limits.MAX_IMAGE_DIMENSION) {
                throw new Error('Resize dimensions exceed limits');
            }
            return pipeline.resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            });

        case 'rotate':
            // ✅ SECURE: Validate angle
            const angle = parseInt(params.angle);
            if (isNaN(angle) || angle < -360 || angle > 360) {
                throw new Error('Invalid rotation angle');
            }
            return pipeline.rotate(angle);

        case 'blur':
            // ✅ SECURE: Limit blur sigma
            const sigma = Math.min(params.sigma || 1, 10);
            return pipeline.blur(sigma);

        default:
            return pipeline;
    }
}
```

## Why AI Generates Resource Exhaustion Vulnerabilities

### 1. Focus on Functionality

**AI thinks:**
- "Download image" → `await downloadImage(url)` ✓
- "Process operations" → `for (op of ops) process(op)` ✓
- Works for normal inputs ✓

**AI doesn't think:**
- What if image is 1GB?
- What if 1000 operations?
- What if 1000 concurrent requests?

### 2. No Resource Awareness

AI doesn't understand:
- Memory is finite
- CPU is limited
- Bandwidth costs money
- API calls cost money

### 3. Training on Simple Examples

**Tutorial code:**
```javascript
// Simple example (no limits)
app.post('/api/process', async (req, res) => {
    const result = await expensiveOperation(req.body);
    res.json(result);
});
```

**AI learns:** This is the pattern
**AI misses:** Production needs limits, queues, rate limiting

## Common Resource Exhaustion Patterns

### 1. Unbounded Loops

**Vulnerable:**
```javascript
// Process all items (could be millions)
for (const item of userItems) {
    await processItem(item);
}
```

**Secure:**
```javascript
// Limit processing
const MAX_ITEMS = 100;
if (userItems.length > MAX_ITEMS) {
    throw new Error(`Maximum ${MAX_ITEMS} items allowed`);
}

for (const item of userItems.slice(0, MAX_ITEMS)) {
    await processItem(item);
}
```

### 2. Unlimited File Uploads

**Vulnerable:**
```javascript
app.post('/upload', async (req, res) => {
    const file = req.file;  // No size check
    await processFile(file);
});
```

**Secure:**
```javascript
app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;

    // Check size
    if (file.size > 10 * 1024 * 1024) {  // 10MB
        return res.status(413).json({ error: 'File too large' });
    }

    // Check type
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type' });
    }

    await processFile(file);
});
```

### 3. Expensive AI/API Operations

**Vulnerable:**
```javascript
// No limits on expensive OpenAI calls
app.post('/summarize', async (req, res) => {
    const { text } = req.body;

    const summary = await openai.chat.completions.create({
        model: 'gpt-4',  // Expensive!
        messages: [{ role: 'user', content: text }]
    });

    res.json({ summary });
});
```

**Secure:**
```javascript
import { withRateLimit } from '@/lib/withRateLimit';
import { auth } from '@clerk/nextjs/server';

async function summarizeHandler(req: NextRequest) {
    // Require authentication
    const { userId } = await auth();
    if (!userId) return handleUnauthorizedError();

    const { text } = await req.json();

    // Limit text length
    if (text.length > 10000) {
        return NextResponse.json(
            { error: 'Text too long (max 10,000 characters)' },
            { status: 400 }
        );
    }

    // Track usage per user
    const usage = await getUserUsage(userId);
    if (usage.summarizations >= DAILY_LIMIT) {
        return NextResponse.json(
            { error: 'Daily limit reached' },
            { status: 429 }
        );
    }

    // Make API call with timeout
    const summary = await Promise.race([
        openai.chat.completions.create({
            model: 'gpt-4-turbo',  // Cheaper model
            messages: [{ role: 'user', content: text }],
            max_tokens: 150  // Limit response
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 30000)
        )
    ]);

    // Track usage
    await incrementUserUsage(userId, 'summarizations');

    return NextResponse.json({ summary });
}

export const POST = withRateLimit(summarizeHandler);
```

### 4. Database Query Without Limits

**Vulnerable:**
```javascript
app.get('/api/users', async (req, res) => {
    // ❌ Returns ALL users (could be millions)
    const users = await db.users.find();
    res.json(users);
});
```

**Secure:**
```javascript
app.get('/api/users', async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Paginated query
    const users = await db.users
        .find()
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

    const total = await db.users.countDocuments();

    res.json({
        users,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});
```

### 5. Unbounded Recursion

**Vulnerable:**
```javascript
// Process nested comments (unlimited depth)
function renderComments(comment) {
    let html = `<div>${comment.text}</div>`;

    // ❌ No depth limit - stack overflow possible
    if (comment.replies) {
        comment.replies.forEach(reply => {
            html += renderComments(reply);  // Recursive
        });
    }

    return html;
}
```

**Secure:**
```javascript
function renderComments(comment, depth = 0) {
    // ✅ Limit recursion depth
    const MAX_DEPTH = 10;

    if (depth > MAX_DEPTH) {
        return '<div>[Maximum nesting reached]</div>';
    }

    let html = `<div class="comment-level-${depth}">${escapeHtml(comment.text)}</div>`;

    if (comment.replies && comment.replies.length > 0) {
        // Limit replies shown
        const MAX_REPLIES = 50;
        const replies = comment.replies.slice(0, MAX_REPLIES);

        replies.forEach(reply => {
            html += renderComments(reply, depth + 1);
        });

        if (comment.replies.length > MAX_REPLIES) {
            html += `<div>... ${comment.replies.length - MAX_REPLIES} more replies</div>`;
        }
    }

    return html;
}
```

## Real-World Cost Examples

### AI API Abuse

**OpenAI GPT-4 Pricing (example):**
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens
- Average request: ~$0.50-$1.00

**Attack scenario:**
- Attacker sends 10,000 requests
- Cost: $5,000-$10,000
- If runs for hours: $50,000-$200,000+

**Real incident from rate-limiting skill:**
> Built a "summarize any article" AI feature without rate limiting. A malicious user scripted 10,000 requests in minutes. At AI API costs, this generated **$9,600 in charges in 10 minutes**. The attack ran 4 hours unnoticed—total cost over **$200,000**.

### Cloud Infrastructure Abuse

**AWS/Cloud Costs:**
- Compute: $0.10-$1.00 per hour per instance
- Storage: $0.023 per GB per month
- Bandwidth: $0.09 per GB

**Attack scenario:**
- Abuse image processing endpoint
- Generate 100GB of processed images
- Store on S3: $2.30/month (minimal)
- Bandwidth to serve: 100GB × $0.09 = **$9 per abuse**
- 1000 attackers: **$9,000 in bandwidth**

### Database Overload

**Attack:**
```javascript
// Request all records repeatedly
for (let i = 0; i < 1000; i++) {
    fetch('/api/users');  // Returns all users
}
```

**Result:**
- Database CPU at 100%
- Slow queries for legitimate users
- Server becomes unresponsive
- May trigger auto-scaling → cost explosion

## Implementation for This Project

### Use Built-In Rate Limiting

```typescript
import { withRateLimit } from '@/lib/withRateLimit';

export const POST = withRateLimit(handler);
```

**Protects against:**
- Spam (5 req/min per IP)
- Brute force
- Resource abuse
- Cost explosion

→ **See `rate-limiting` skill** for implementation details

### Validate Input Sizes

```typescript
import { validateRequest } from '@/lib/validateRequest';
import { safeLongTextSchema } from '@/lib/validation';

// safeLongTextSchema has max 5000 characters built-in
const validation = validateRequest(safeLongTextSchema, userInput);
```

### Set Request Body Limits

Already configured in this project:
```typescript
// Next.js automatically limits body size
// Default: 4MB
// Configure in next.config.js if needed
```

### Use Timeouts

```typescript
// Set timeout for external API calls
const response = await Promise.race([
    fetch('https://external-api.com/data'),
    new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
    )
]);
```

### For Expensive Operations, Require Authentication

```typescript
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
    // Expensive operation - require auth
    const { userId } = await auth();
    if (!userId) {
        return handleUnauthorizedError();
    }

    // Track usage per user
    const usage = await checkUserQuota(userId);
    if (usage.exceeded) {
        return NextResponse.json(
            { error: 'Quota exceeded' },
            { status: 429 }
        );
    }

    // Proceed with expensive operation
}
```

## Testing for Resource Exhaustion

### Test Large Inputs

```bash
# Test with large payload
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$(printf 'A%.0s' {1..100000})\"}"

# Should return 400 (input too large)
```

### Test Many Operations

```bash
# Test with many operations
curl -X POST http://localhost:3000/api/process \
  -d '{"operations": ["op1","op2",...,"op1000"]}'

# Should return 400 (too many operations)
```

### Test Concurrent Requests

```bash
# Send 100 concurrent requests
for i in {1..100}; do
    curl http://localhost:3000/api/expensive-endpoint &
done
wait

# First 5 should succeed, rest get 429 (rate limited)
```

### Test Timeout

```bash
# If endpoint has 30s timeout
curl --max-time 35 http://localhost:3000/api/slow-endpoint

# Should timeout at 30s (or return earlier)
```

## Common Mistakes to Avoid

### Vulnerable Patterns

❌ **No input size limits:**
```javascript
const { data } = req.body;  // Could be GB of data
```

❌ **Unbounded loops:**
```javascript
for (const item of userItems) {  // Could be millions
    await process(item);
}
```

❌ **No rate limiting on expensive operations:**
```javascript
app.post('/ai-generate', async (req, res) => {
    await openai.createCompletion(req.body);  // Costs $ per call
});
```

❌ **Synchronous processing:**
```javascript
app.post('/process', async (req, res) => {
    const result = await heavyProcessing();  // Blocks server
    res.json(result);
});
```

❌ **No timeout on external calls:**
```javascript
const data = await fetch(url);  // Could hang forever
```

### Secure Patterns

✅ **Validate input sizes:**
```typescript
if (text.length > MAX_LENGTH) throw new Error('Too long');
```

✅ **Limit loops:**
```typescript
const items = userItems.slice(0, MAX_ITEMS);
```

✅ **Rate limit expensive operations:**
```typescript
export const POST = withRateLimit(expensiveHandler);
```

✅ **Queue background jobs:**
```typescript
const job = await queue.add('process', data);
res.json({ jobId: job.id });
```

✅ **Set timeouts:**
```typescript
const response = await fetchWithTimeout(url, 10000);
```

## Resource Limits Checklist

When creating new endpoints, ensure:

- [ ] Rate limiting applied (`withRateLimit`)
- [ ] Input size validated (max length, max items)
- [ ] File upload size limited
- [ ] Operation count limited
- [ ] Timeouts on external API calls
- [ ] Pagination on list endpoints
- [ ] Authentication required for expensive operations
- [ ] Usage quotas tracked per user
- [ ] Background queue for long-running tasks
- [ ] Memory limits considered
- [ ] Concurrent request limits

## See Also

### Implementation Skills (How to Fix)

→ **`rate-limiting` skill** - Prevent abuse with request limits
→ **`input-validation` skill** - Validate input sizes and counts
→ **`security-testing` skill** - Test resource limits

### Related Awareness Skills

→ **`business-logic-flaws` skill** - Integer overflow (related)
→ **`awareness-overview` skill** - Overall AI security risks

## Key Takeaways

✅ **AI generates functionally correct** but resource-unlimited code
✅ **Real cost:** $200,000 in 4 hours from uncontrolled AI API abuse
✅ **No size limits** on images, text, operations = DoS vulnerability
✅ **Unbounded loops** with user data = memory exhaustion
✅ **No rate limiting** on expensive operations = cost explosion
✅ **Solution:** Rate limits, input validation, timeouts, job queues, quotas
✅ **This project:** Built-in rate limiting (5 req/min), input validation (max lengths)

**Remember:** Resource exhaustion is **silent and expensive**—code works fine in dev, causes bankruptcy in production.

---

**Related References:**

[19] Databricks. (2025). "Performance and Security: The Hidden Cost of Vibe Coding." Technical Report.

**Additional Resource:**
- Story of $200K AI cost attack: See `rate-limiting` skill, section "The Cost of Resource Abuse"
