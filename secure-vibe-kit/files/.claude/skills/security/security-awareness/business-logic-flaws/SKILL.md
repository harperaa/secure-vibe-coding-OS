---
name: business-logic-flaws-ai-generated-code
description: Understand business logic vulnerabilities in AI code including race conditions, integer overflow, and calculation errors that pass functional tests but create security holes. Use this skill when you need to learn about race conditions in AI code, understand integer overflow vulnerabilities, recognize business logic security flaws, or identify calculation errors. Triggers include "race conditions", "business logic vulnerabilities", "integer overflow", "race condition AI", "flash sale security", "concurrent access", "negative totals", "calculation errors".
---

# Business Logic Vulnerabilities in AI-Generated Code

## The Subtlety of Logic Flaws

According to Contrast Security:

> "Business logic flaws in AI-generated code are particularly insidious because they **often pass all functional tests** while creating significant security vulnerabilities."

These vulnerabilities arise from the AI's **lack of understanding of business context** and security implications.

## 1.5.1 Race Conditions

### The Problem

Race conditions occur when multiple requests access shared resources simultaneously without proper synchronization. The AI generates "correct" code for single-user scenarios but fails to consider concurrent access.

### AI-Generated Vulnerable Code

```javascript
// Prompt: "Implement flash sale with limited quantity"
let availableStock = 100;

app.post('/api/purchase', async (req, res) => {
    const { userId, quantity } = req.body;

    // ❌ VULNERABLE: Race condition - multiple requests can pass this check
    if (availableStock >= quantity) {
        // Time window where multiple requests see stock as available
        availableStock -= quantity;

        // ❌ VULNERABLE: Database update happens after check
        await db.orders.create({
            userId,
            quantity,
            timestamp: Date.now()
        });

        await db.products.update(
            { id: 'flash-sale-item' },
            { stock: availableStock }
        );

        res.json({ success: true, remaining: availableStock });
    } else {
        res.status(400).json({ error: 'Insufficient stock' });
    }
});

// Attack: Send 100 concurrent requests for 1 item each
// Result: Could sell 200+ items when only 100 available
```

### Why This Is Vulnerable

**The Race Condition Timeline:**

```
Time    Request A            Request B            Stock
T0      Read stock: 100      Read stock: 100      100
T1      Check: 100 >= 1 ✓    Check: 100 >= 1 ✓    100
T2      stock = 99           stock = 99           100
T3      Update DB: 99        -                    99
T4      -                    Update DB: 99        99
Result: Both purchases succeed, but stock should be 98!
```

**With 100 concurrent requests:**
- All read stock = 100 at T0
- All pass check at T1
- All decrement to 99 at T2
- Final stock = 99 (should be 0)
- **Oversold by 99 items!**

### Real-World Impact

**Flash Sale Scenarios:**
- Limited edition product: 100 units
- 1000 customers try to purchase
- Race condition allows 200+ purchases
- Company must fulfill or refund
- Loss: product cost × oversold quantity
- Reputation damage

**Financial Services:**
- Account balance: $1000
- Concurrent withdrawals of $800 each
- Both succeed (race condition)
- Account balance: -$600
- Bank loses money

**Documented Incident:**
- Major retailer flash sale: 100 units
- 10,000 customers rushed to buy
- Race condition allowed **1,500 purchases**
- Loss: **$500,000** (product cost + shipping + reputation)

### Secure Implementation

#### Option 1: Database Transactions with Locking

```javascript
// ✅ SECURE: Using database transactions and locks
const { Sequelize, Transaction } = require('sequelize');

app.post('/api/purchase', async (req, res) => {
    const { userId, quantity } = req.body;

    // ✅ SECURE: Use database transaction with row locking
    const transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });

    try {
        // ✅ SECURE: Lock the product row during read
        const product = await Product.findOne({
            where: { id: 'flash-sale-item' },
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (product.stock >= quantity) {
            // ✅ SECURE: Atomic update
            await product.decrement('stock', {
                by: quantity,
                transaction
            });

            // Create order
            const order = await Order.create({
                userId,
                productId: product.id,
                quantity,
                price: product.price * quantity,
                timestamp: Date.now()
            }, { transaction });

            // ✅ SECURE: Commit only if all operations succeed
            await transaction.commit();

            res.json({
                success: true,
                orderId: order.id,
                remaining: product.stock - quantity
            });
        } else {
            await transaction.rollback();
            res.status(400).json({
                error: 'Insufficient stock',
                available: product.stock
            });
        }
    } catch (error) {
        await transaction.rollback();

        // ✅ SECURE: Log error securely
        logger.error('Purchase failed', {
            userId,
            error: error.code,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ error: 'Purchase failed' });
    }
});
```

#### Option 2: Redis Distributed Locking

```javascript
// ✅ SECURE: Alternative using Redis for distributed locking
const Redis = require('ioredis');
const Redlock = require('redlock');

const redis = new Redis();
const redlock = new Redlock([redis], {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200
});

app.post('/api/purchase-redis', async (req, res) => {
    const { userId, quantity } = req.body;
    const lockKey = 'lock:flash-sale-item';

    try {
        // ✅ SECURE: Acquire distributed lock
        const lock = await redlock.acquire([lockKey], 5000);

        try {
            const stock = await redis.get('stock:flash-sale-item');

            if (parseInt(stock) >= quantity) {
                // ✅ SECURE: Atomic decrement
                const newStock = await redis.decrby('stock:flash-sale-item', quantity);

                // Record order
                await saveOrder(userId, quantity);

                res.json({ success: true, remaining: newStock });
            } else {
                res.status(400).json({ error: 'Insufficient stock' });
            }
        } finally {
            // ✅ SECURE: Always release lock
            await lock.release();
        }
    } catch (error) {
        if (error.name === 'LockError') {
            res.status(503).json({ error: 'System busy, please retry' });
        } else {
            res.status(500).json({ error: 'Purchase failed' });
        }
    }
});
```

### Why AI Generates Race Conditions

**1. Single-Request Testing:**
- AI tests with one request at a time
- Functional test passes: "Can I purchase?" ✓
- Never tests concurrent requests
- Race condition invisible in single-threaded test

**2. Synchronous Thinking:**
- AI generates code as if sequential
- Doesn't reason about concurrent execution
- Treats database as instant (no time gap)

**3. Simplicity Over Correctness:**
- Simple check-then-update pattern
- No transactions (complex to generate)
- No locking (requires understanding concurrency)

---

## 1.5.2 Integer Overflow and Business Logic Flaws

### The Problem

AI generates calculations that work for normal inputs but fail (often catastrophically) with edge cases or malicious inputs.

### AI-Generated Vulnerable Code

```python
# Prompt: "Calculate shopping cart total with discounts"
def calculate_cart_total(items, discount_percent=0):
    total = 0

    for item in items:
        # ❌ VULNERABLE: No validation of negative quantities
        subtotal = item['price'] * item['quantity']
        total += subtotal

    # ❌ VULNERABLE: No validation of discount range
    discount_amount = total * (discount_percent / 100)
    final_total = total - discount_amount

    return final_total

# Attack vectors:
# 1. items = [{'price': 100, 'quantity': -10}]  # Negative total
# 2. discount_percent = 150  # Final total becomes negative
# 3. items = [{'price': 999999999, 'quantity': 999999999}]  # Integer overflow
```

### Attack Scenarios

**Attack 1: Negative Quantities**
```python
items = [
    {'price': 100, 'quantity': -10}
]
# Subtotal: 100 × -10 = -1000
# Final total: -1000 (customer gets paid $1000!)
```

**Attack 2: Excessive Discounts**
```python
items = [{'price': 100, 'quantity': 1}]  # Total: $100
discount_percent = 150                    # 150% discount

# Calculation:
# discount_amount = 100 × (150/100) = 150
# final_total = 100 - 150 = -50
# Customer gets paid $50 to buy item!
```

**Attack 3: Integer Overflow**
```python
items = [
    {'price': 999999999, 'quantity': 999999999}
]
# Subtotal: 999,999,998,000,000,001
# May overflow to negative or wrap around
# Unpredictable total
```

**Attack 4: Precision Manipulation**
```python
items = [
    {'price': 0.01, 'quantity': 1},
    {'price': 99.99, 'quantity': 1}
]
discount_percent = 99.99

# Due to float precision:
# Expected: $0.01
# Actual: May be $0.00 (free!) or negative
```

### Real-World Exploits

**Currency Conversion Exploit:**
- Payment system allowed negative quantities in refund flow
- Attacker discovered by accident (entered -1)
- System charged -$50 (credited $50 instead)
- Exploited for months before detection
- Loss: **$250,000** in fraudulent credits

**Coupon Stacking:**
- E-commerce site allowed stacking 100% discount coupons
- Attacker created multiple accounts, got welcome coupons
- Stacked 5 × 20% coupons = 100% discount
- Free products for weeks
- Loss: **$100,000** in products + detection costs

### Secure Implementation

```python
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict
import logging

class SecureCartCalculator:
    MAX_QUANTITY_PER_ITEM = 100
    MAX_ITEMS_PER_CART = 50
    MAX_PRICE_PER_ITEM = Decimal('10000.00')
    MAX_CART_TOTAL = Decimal('100000.00')
    MAX_DISCOUNT_PERCENT = Decimal('90')  # Maximum 90% discount

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def validate_item(self, item: Dict) -> None:
        """✅ SECURE: Comprehensive input validation"""
        # Check required fields
        if 'price' not in item or 'quantity' not in item:
            raise ValueError("Item missing required fields")

        # Convert to Decimal for precise calculations
        try:
            price = Decimal(str(item['price']))
            quantity = int(item['quantity'])
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid item data: {e}")

        # ✅ SECURE: Validate ranges
        if price <= 0 or price > self.MAX_PRICE_PER_ITEM:
            raise ValueError(f"Invalid price: {price}")

        if quantity <= 0 or quantity > self.MAX_QUANTITY_PER_ITEM:
            raise ValueError(f"Invalid quantity: {quantity}")

        # Check for precision issues
        if price.as_tuple().exponent < -2:
            raise ValueError("Price precision exceeds 2 decimal places")

    def calculate_cart_total(
        self,
        items: List[Dict],
        discount_percent: float = 0,
        user_id: str = None
    ) -> Dict:
        """✅ SECURE: Calculate total with comprehensive validation"""

        # ✅ SECURE: Validate cart size
        if not items:
            return {'total': Decimal('0.00'), 'items_count': 0}

        if len(items) > self.MAX_ITEMS_PER_CART:
            raise ValueError(f"Cart exceeds maximum {self.MAX_ITEMS_PER_CART} items")

        # ✅ SECURE: Validate discount
        try:
            discount = Decimal(str(discount_percent))
        except (ValueError, TypeError):
            discount = Decimal('0')

        if discount < 0 or discount > self.MAX_DISCOUNT_PERCENT:
            self.logger.warning(
                f"Invalid discount attempted: {discount_percent}% by user {user_id}"
            )
            discount = Decimal('0')

        # ✅ SECURE: Calculate with validation
        total = Decimal('0')
        items_validated = []

        for idx, item in enumerate(items):
            try:
                self.validate_item(item)

                price = Decimal(str(item['price']))
                quantity = int(item['quantity'])

                # ✅ SECURE: Prevent overflow
                subtotal = price * quantity

                if total + subtotal > self.MAX_CART_TOTAL:
                    raise ValueError("Cart total exceeds maximum allowed")

                total += subtotal
                items_validated.append({
                    'item_id': item.get('id', idx),
                    'price': price,
                    'quantity': quantity,
                    'subtotal': subtotal
                })

            except ValueError as e:
                self.logger.error(f"Invalid item at index {idx}: {e}")
                raise

        # ✅ SECURE: Apply discount safely
        discount_amount = (total * discount / 100).quantize(
            Decimal('0.01'),
            rounding=ROUND_HALF_UP
        )

        final_total = total - discount_amount

        # ✅ SECURE: Ensure final total is never negative
        if final_total < 0:
            self.logger.error(
                f"Negative total prevented: total={total}, discount={discount}%"
            )
            final_total = Decimal('0.01')  # Minimum charge

        # ✅ SECURE: Return detailed breakdown for audit
        return {
            'items': items_validated,
            'items_count': len(items_validated),
            'subtotal': total,
            'discount_percent': discount,
            'discount_amount': discount_amount,
            'total': final_total,
            'currency': 'USD',
            'calculated_at': datetime.utcnow().isoformat(),
            'calculation_version': '2.0.0'  # Track calculation logic version
        }

    def apply_coupon(self, cart_total: Decimal, coupon_code: str) -> Dict:
        """✅ SECURE: Apply coupon with anti-fraud measures"""
        # Validate coupon exists and is active
        coupon = self.validate_coupon(coupon_code)

        if not coupon:
            return {'valid': False, 'reason': 'Invalid coupon code'}

        # ✅ SECURE: Check coupon usage limits
        if self.is_coupon_exhausted(coupon):
            return {'valid': False, 'reason': 'Coupon usage limit reached'}

        # ✅ SECURE: Prevent stacking unless explicitly allowed
        if not coupon.get('stackable', False):
            if self.has_other_coupons_applied(cart_total):
                return {'valid': False, 'reason': 'Coupon cannot be combined'}

        # Apply discount with validation
        discount = Decimal(str(coupon['discount_value']))

        if coupon['type'] == 'percentage':
            discount = min(discount, self.MAX_DISCOUNT_PERCENT)
            new_total = cart_total * (1 - discount / 100)
        else:  # Fixed amount
            new_total = cart_total - discount

        # ✅ SECURE: Ensure total doesn't go negative
        new_total = max(new_total, Decimal('0.01'))

        return {
            'valid': True,
            'original_total': cart_total,
            'new_total': new_total,
            'discount_applied': cart_total - new_total,
            'coupon_code': coupon_code
        }
```

## Why AI Generates Business Logic Flaws

### 1. Functional Tests Pass

**AI's perspective:**
```javascript
// Test: "Can I purchase 1 item?"
test('purchase item', async () => {
    const response = await purchase({ userId: 1, quantity: 1 });
    expect(response.success).toBe(true);
});
// ✓ PASS - But doesn't test concurrent access!
```

**Missing tests:**
- Concurrent purchase attempts
- Boundary conditions (0, negative, overflow)
- Edge cases (discount > 100%, huge quantities)
- Malicious inputs

### 2. No Business Context

AI doesn't understand:
- Stock can't go negative
- Totals can't be negative
- Discounts shouldn't exceed 100%
- Quantities should be positive
- Concurrent access exists

### 3. Simplified Implementations

AI generates minimal code:
- No validation (adds complexity)
- No locking (requires understanding concurrency)
- No edge case handling (verbose)
- "Happy path" only

## Common Business Logic Vulnerabilities

### 1. Race Conditions

**Vulnerable Pattern:**
```javascript
// Check-Then-Act (VULNERABLE)
if (condition) {
    // Time gap here!
    takeAction();
}
```

**Secure Pattern:**
```javascript
// Atomic Operation (SECURE)
transaction.executeAtomically(() => {
    if (condition) takeAction();
});
```

### 2. Integer Overflow

**Vulnerable Pattern:**
```javascript
let total = 0;
items.forEach(item => {
    total += item.price * item.quantity;  // Can overflow
});
```

**Secure Pattern:**
```javascript
const MAX_TOTAL = 100000;
let total = 0;

for (const item of items) {
    const subtotal = item.price * item.quantity;
    if (total + subtotal > MAX_TOTAL) {
        throw new Error('Cart total exceeds maximum');
    }
    total += subtotal;
}
```

### 3. Negative Values

**Vulnerable Pattern:**
```python
quantity = request.json['quantity']  # Could be negative
total = price * quantity  # Negative total!
```

**Secure Pattern:**
```python
quantity = int(request.json['quantity'])
if quantity <= 0 or quantity > MAX_QUANTITY:
    raise ValueError("Invalid quantity")
total = price * quantity  # Always positive
```

### 4. Discount/Refund Abuse

**Vulnerable Pattern:**
```javascript
discount_percent = req.body.discount;  // Could be > 100%
discount = total * (discount_percent / 100);
final = total - discount;  // Could be negative!
```

**Secure Pattern:**
```javascript
discount_percent = Math.max(0, Math.min(req.body.discount, 90));  // Clamp 0-90%
discount = total * (discount_percent / 100);
final = Math.max(total - discount, 0.01);  // Never negative
```

### 5. Coupon Stacking

**Vulnerable Pattern:**
```javascript
// Apply all coupons
coupons.forEach(code => {
    total -= getCouponDiscount(code, total);
});
// Could reduce total to $0 or negative
```

**Secure Pattern:**
```javascript
// Limit coupons, prevent stacking
if (coupons.length > 1) throw new Error("Cannot combine coupons");
const discount = getCouponDiscount(coupons[0], total);
total = Math.max(total - discount, MIN_ORDER_TOTAL);
```

## Implementation for This Project

### Use Decimal for Money Calculations

```typescript
// ❌ Don't use Number for money
let total: number = 0;
items.forEach(item => {
    total += item.price * item.quantity;  // Float precision errors
});

// ✅ Use Decimal or integers (cents)
import { Decimal } from 'decimal.js';

let total = new Decimal(0);
items.forEach(item => {
    const subtotal = new Decimal(item.price).times(item.quantity);
    total = total.plus(subtotal);
});
```

**Or use cents:**
```typescript
// Store prices in cents (integers)
const priceInCents = 1999;  // $19.99
const total = priceInCents * quantity;  // Integer math = precise
const totalInDollars = total / 100;  // Convert for display
```

### Validate All Inputs

```typescript
import { z } from 'zod';

const purchaseSchema = z.object({
    userId: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
    productId: z.string().min(1)
});

const cartSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(100),
        price: z.number().positive().max(10000)
    })).max(50),  // Max 50 items
    discountCode: z.string().optional()
});
```

### Use Atomic Operations in Convex

For Convex (this project's database):

```typescript
// convex/purchases.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const purchase = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number()
  },
  handler: async (ctx, args) => {
    // Validate quantity
    if (args.quantity <= 0 || args.quantity > 100) {
      throw new Error("Invalid quantity");
    }

    // Get product
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // ✅ Convex mutations are transactional and atomic
    if (product.stock < args.quantity) {
      throw new Error("Insufficient stock");
    }

    // Atomic update
    await ctx.db.patch(args.productId, {
      stock: product.stock - args.quantity
    });

    // Create order
    await ctx.db.insert("orders", {
      userId: ctx.auth.userId,
      productId: args.productId,
      quantity: args.quantity,
      total: product.price * args.quantity,
      createdAt: Date.now()
    });
  }
});
```

**Key Point:** Convex mutations are **automatically transactional**. Multiple concurrent mutations are serialized, preventing race conditions.

## Testing for Logic Flaws

### Test Concurrent Requests

```javascript
// Test race condition
const promises = [];
for (let i = 0; i < 100; i++) {
    promises.push(
        fetch('/api/purchase', {
            method: 'POST',
            body: JSON.stringify({ productId: 'item', quantity: 1 })
        })
    );
}

const results = await Promise.all(promises);
const successes = results.filter(r => r.ok).length;

// Should succeed only for available stock quantity
// If 100 stock, only 100 should succeed
expect(successes).toBe(100);
```

### Test Boundary Conditions

```javascript
// Test negative quantity
const response = await purchase({ quantity: -10 });
expect(response.status).toBe(400);

// Test overflow
const response = await purchase({ quantity: 999999999 });
expect(response.status).toBe(400);

// Test excessive discount
const response = await applyDiscount({ discount: 150 });
expect(response.status).toBe(400);

// Test zero quantity
const response = await purchase({ quantity: 0 });
expect(response.status).toBe(400);
```

### Test Edge Cases

```javascript
// Test maximum values
const response = await purchase({ quantity: 100 });  // Max allowed
expect(response.status).toBe(200);

const response = await purchase({ quantity: 101 });  // Over max
expect(response.status).toBe(400);

// Test precision
const cart = {
    items: [{ price: 0.01, quantity: 1 }],
    discount: 99
};
const result = await calculateTotal(cart);
expect(result.total).toBeGreaterThan(0);  // Never negative or zero
```

## How to Recognize Vulnerable AI Code

### Red Flags - Race Conditions

❌ **Check-then-act pattern without locking:**
```javascript
if (availableStock >= quantity) {
    availableStock -= quantity;
    // Time gap - race condition!
}
```

❌ **In-memory state for critical resources:**
```javascript
let stock = 100;  // Multiple processes = separate memory
```

❌ **Multiple database operations without transaction:**
```javascript
const balance = await getBalance(userId);
if (balance >= amount) {
    await updateBalance(userId, balance - amount);
    // Race condition between get and update
}
```

### Red Flags - Integer/Calculation Errors

❌ **No input validation:**
```python
quantity = request.json['quantity']  # Could be anything!
total = price * quantity
```

❌ **No range checks:**
```javascript
discount = req.body.discount;  // Could be 1000%!
```

❌ **Using float for money:**
```javascript
let total = 0.0;  // Precision errors
```

❌ **No overflow protection:**
```python
total = item1 + item2 + item3  # Could overflow
```

## See Also

### Implementation Skills (How to Fix)

→ **`input-validation` skill** - Validate quantities, prices, discounts with Zod
→ **`rate-limiting` skill** - Slow down concurrent attack attempts
→ **`security-testing` skill** - Test concurrent access, boundary conditions

### Related Awareness Skills

→ **`resource-exhaustion` skill** - Related to overflow and limits
→ **`awareness-overview` skill** - Overall AI security risks

## Key Takeaways

✅ **Business logic flaws pass functional tests** but create security holes
✅ **Race conditions in flash sales** can oversell products by 2-10x
✅ **Negative quantities/discounts** can result in negative totals (paying customers)
✅ **Integer overflow** with large numbers causes unpredictable results
✅ **Float precision errors** in money calculations cause rounding exploits
✅ **AI generates check-then-act** instead of atomic operations
✅ **Solution:** Database transactions, input validation, Decimal for money, boundary testing
✅ **Convex advantage:** Mutations are automatically transactional and atomic

**Remember:** Logic flaws are **subtle and dangerous**—they work in tests, fail in production, and can cost hundreds of thousands in losses.

---

**Related References:**

[18] Contrast Security. (2025). "Business Logic Vulnerabilities in the Age of AI." Security Research Papers.
