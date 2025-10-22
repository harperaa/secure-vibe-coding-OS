# Payment Security Assessment (Clerk Billing + Stripe)

**Category**: Threat Modeling  
**When to Use**: If using Clerk Billing + Stripe for payments  
**Module**: 3.5  
**Time to Implement**: 30 minutes

## Security Coverage

- ✅ PCI-DSS concepts compliance
- ✅ No card data on server
- ✅ Webhook security
- ✅ Stripe integration security
- ✅ Common pitfalls avoided

## The Prompt

```
Assess the security of my payment implementation using Clerk Billing and Stripe.

**Payment Implementation Context**:
- Payment Provider: Clerk Billing + Stripe
- Features: [e.g., subscriptions, one-time payments, usage-based billing]
- Architecture: Secure Vibe Coding OS
- Reference: @docs/security/SECURITY_ARCHITECTURE.md

**PCI-DSS Concepts Assessment**:

Important: You are NOT handling credit cards directly (Stripe does), so full PCI-DSS compliance is not required. However, verify these security concepts:

**1. Card Data Handling**:
Critical Questions:
- Does any cardholder data ever touch my server? [MUST BE NO]
- Are payment forms hosted by Stripe Checkout? [MUST BE YES]
- Is card data collected client-side and sent directly to Stripe? [MUST BE YES]
- Do server logs ever contain card numbers? [MUST BE NO]
- Is card data ever stored in my database? [MUST BE NO]

**2. Webhook Security**:
Stripe sends webhooks for payment events. Verify:
- Are webhook signatures validated using Stripe's library?
- Are webhook endpoints protected from replay attacks?
- Is webhook processing idempotent (handle duplicates)?
- Are webhook secrets stored securely (env variables)?
- Are failed webhooks logged and alerted?

**3. HTTPS Everywhere**:
- Is HTTPS enforced on all pages?
- Are cookies Secure and HttpOnly?
- Is HSTS header present?
- Are API calls to Stripe over HTTPS?

**4. Subscription Security**:
- Can users only cancel their own subscriptions?
- Are subscription changes authorized?
- Are subscription status checks server-side?
- Is subscription data in sync with Stripe?

**5. API Key Security**:
- Are Stripe API keys in environment variables?
- Are publishable and secret keys used correctly?
- Are test and live keys separated?
- Are keys never exposed client-side (except publishable key)?
- Is key rotation planned?

**6. Error Handling**:
- Do payment errors leak sensitive information?
- Are Stripe error messages sanitized for users?
- Are payment failures logged securely?
- Are declined cards handled gracefully?

**7. Access Control**:
- Can users only access their own payment history?
- Are admin payment operations logged?
- Is payment data properly authorized?

**Common Payment Implementation Pitfalls**:

Check for these mistakes:
- ❌ Collecting card data on your own forms
- ❌ Storing CVV codes (NEVER allowed)
- ❌ Not validating webhook signatures
- ❌ Exposing secret API keys client-side
- ❌ Using test keys in production
- ❌ Not handling webhook retries
- ❌ Trusting client-side payment status
- ❌ Missing HTTPS on payment pages
- ❌ Logging card numbers
- ❌ No idempotency for webhooks

**Security Checklist**:

Verify each item:
- [ ] NO card data touches our server
- [ ] All payment forms use Stripe Checkout or Elements
- [ ] Webhook signatures validated
- [ ] HTTPS enforced everywhere
- [ ] API keys in environment variables
- [ ] Publishable key used client-side only
- [ ] Secret key used server-side only
- [ ] Webhook processing is idempotent
- [ ] Failed payments logged
- [ ] Users can only access own payment data
- [ ] Payment errors don't leak info
- [ ] Subscription changes authorized
- [ ] Test keys not in production
- [ ] Key rotation process exists

**Assessment Output**:

Provide:
1. Security Score (0-100)
2. Critical Issues (must fix before launch)
3. High Priority Issues (fix soon)
4. Medium Priority Issues (improve over time)
5. Best Practices Followed
6. Recommendations

Generate complete payment security assessment.

Reference:
@docs/security/SECURITY_ARCHITECTURE.md
[Your Clerk Billing integration code]
[Your webhook handlers]
```

## Red Flags

**Immediate Action Required**:
- 🚨 Card data on your server
- 🚨 Unvalidated webhooks
- 🚨 Secret keys exposed
- 🚨 No HTTPS on payment pages

## Deliverables

- [ ] Payment security assessment complete
- [ ] PCI-DSS concepts verified
- [ ] Webhook security confirmed
- [ ] Critical issues identified
- [ ] Recommendations provided
- [ ] Save to: `docs/security/PAYMENT_SECURITY_ASSESSMENT.md`

## Best Practices

**Do**:
- ✅ Use Stripe Checkout (easiest, most secure)
- ✅ Validate all webhook signatures
- ✅ Handle webhook retries with idempotency
- ✅ Store only Stripe IDs, not card data
- ✅ Use different keys for test and production
- ✅ Log payment events for debugging

**Don't**:
- ❌ Touch card data ever
- ❌ Store CVV codes (illegal)
- ❌ Trust client-side payment status
- ❌ Use test keys in production
- ❌ Expose secret keys client-side
- ❌ Log sensitive payment details

## Testing Payment Security

```bash
# Test webhook signature validation
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: fake_signature" \
  -d '{"type": "payment_intent.succeeded"}'
# Expected: 400 Bad Request (invalid signature)

# Test with valid signature (use Stripe CLI)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
# Expected: 200 OK, webhook processed
```

## Related Prompts

- **OWASP check**: `threat-modeling/06_owasp_check.md`
- **Code review**: `threat-modeling/04_code_review.md`

## Version History

**v1.0** (2025-10-21): Initial version
