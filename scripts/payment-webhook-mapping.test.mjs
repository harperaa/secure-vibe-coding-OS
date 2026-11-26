import { test } from "node:test";
import assert from "node:assert/strict";

const { transformWebhookData, paymentAttemptDataValidator } = await import(
  "../convex/paymentAttemptTypes.ts"
);

/**
 * Checks a value against a Convex validator the way the server does for the
 * kinds this validator uses: required/optional fields, no unknown fields.
 * Returns a list of problems (empty when the value is accepted).
 */
function problems(validator, value, at = "data") {
  switch (validator.kind) {
    case "string":
      return typeof value === "string" ? [] : [`${at}: expected string`];
    case "float64":
      return typeof value === "number" ? [] : [`${at}: expected number`];
    case "array":
      if (!Array.isArray(value)) return [`${at}: expected array`];
      return value.flatMap((item, i) => problems(validator.element, item, `${at}[${i}]`));
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return [`${at}: expected object`];
      }
      const found = [];
      for (const [key, field] of Object.entries(validator.fields)) {
        if (value[key] === undefined) {
          if (field.isOptional !== "optional") found.push(`${at}.${key}: missing`);
        } else {
          found.push(...problems(field, value[key], `${at}.${key}`));
        }
      }
      for (const key of Object.keys(value)) {
        if (!(key in validator.fields) && value[key] !== undefined) {
          found.push(`${at}.${key}: unknown field`);
        }
      }
      return found;
    }
    default:
      throw new Error(`${at}: validator kind "${validator.kind}" is not handled by this test`);
  }
}

const money = (amount) => ({
  amount,
  amount_formatted: (amount / 100).toFixed(2),
  currency: "USD",
  currency_symbol: "$",
  extra_money_field: "dropped",
});

/** The `data` object of a Clerk `paymentAttempt.updated` event, with extra fields. */
function clerkPayload(overrides = {}) {
  return {
    object: "commerce_payment_attempt",
    id: "evt-only-field",
    instance_id: "ins_123",
    billing_date: 1764000000000,
    charge_type: "recurring",
    created_at: 1764000000001,
    failed_at: 1764000000002,
    failed_reason: { code: "card_declined", decline_code: "insufficient_funds" },
    invoice_id: "inv_123",
    paid_at: 1764000000003,
    payment_id: "pay_123",
    statement_id: "stmt_123",
    status: "paid",
    updated_at: 1764000000004,
    payer: {
      email: "ada@example.com",
      first_name: "Ada",
      last_name: "Lovelace",
      user_id: "user_123",
      image_url: "https://example.com/a.png",
    },
    payment_source: { card_type: "visa", last4: "4242", expiry_year: 2030 },
    subscription_items: [
      {
        id: "subi_123",
        amount: money(1900),
        plan: {
          id: "plan_123",
          name: "Pro",
          slug: "pro",
          amount: 1900,
          currency: "USD",
          period: "month",
          interval: 1,
          is_recurring: true,
        },
        status: "active",
        period_start: 1764000000000,
        period_end: 1766592000000,
        proration_date: "",
      },
    ],
    totals: { grand_total: money(2052), subtotal: money(1900), tax_total: money(152) },
    ...overrides,
  };
}

test("the validator check used here rejects bad data", () => {
  const good = transformWebhookData(clerkPayload());
  assert.deepEqual(problems(paymentAttemptDataValidator, { ...good, id: "x" }), ["data.id: unknown field"]);
  assert.deepEqual(problems(paymentAttemptDataValidator, { ...good, status: 5 }), [
    "data.status: expected string",
  ]);
  assert.deepEqual(problems(paymentAttemptDataValidator, { ...good, payer: undefined }), [
    "data.payer: missing",
  ]);
});

test("the raw Clerk payload is not accepted as-is", () => {
  assert.notDeepEqual(problems(paymentAttemptDataValidator, clerkPayload()), []);
});

test("a full paymentAttempt.updated payload maps to an object the validator accepts", () => {
  const out = transformWebhookData(clerkPayload());
  assert.deepEqual(problems(paymentAttemptDataValidator, out), []);
  assert.deepEqual(out, {
    billing_date: 1764000000000,
    charge_type: "recurring",
    created_at: 1764000000001,
    failed_at: 1764000000002,
    failed_reason: { code: "card_declined", decline_code: "insufficient_funds" },
    invoice_id: "inv_123",
    paid_at: 1764000000003,
    payment_id: "pay_123",
    statement_id: "stmt_123",
    status: "paid",
    updated_at: 1764000000004,
    payer: { email: "ada@example.com", first_name: "Ada", last_name: "Lovelace", user_id: "user_123" },
    payment_source: { card_type: "visa", last4: "4242" },
    subscription_items: [
      {
        amount: { amount: 1900, amount_formatted: "19.00", currency: "USD", currency_symbol: "$" },
        plan: {
          id: "plan_123",
          name: "Pro",
          slug: "pro",
          amount: 1900,
          currency: "USD",
          period: "month",
          interval: 1,
        },
        status: "active",
        period_start: 1764000000000,
        period_end: 1766592000000,
      },
    ],
    totals: {
      grand_total: { amount: 2052, amount_formatted: "20.52", currency: "USD", currency_symbol: "$" },
      subtotal: { amount: 1900, amount_formatted: "19.00", currency: "USD", currency_symbol: "$" },
      tax_total: { amount: 152, amount_formatted: "1.52", currency: "USD", currency_symbol: "$" },
    },
  });
});

test("every subscription item is mapped, and an empty list stays empty", () => {
  const [item] = clerkPayload().subscription_items;
  const second = { ...item, plan: { ...item.plan, id: "plan_456", slug: "team" } };
  const out = transformWebhookData(clerkPayload({ subscription_items: [item, second] }));
  assert.deepEqual(out.subscription_items.map((i) => i.plan.slug), ["pro", "team"]);
  assert.deepEqual(problems(paymentAttemptDataValidator, out), []);

  const none = transformWebhookData(clerkPayload({ subscription_items: [] }));
  assert.deepEqual(none.subscription_items, []);
  assert.deepEqual(problems(paymentAttemptDataValidator, none), []);
});

test("failed_at, paid_at and failed_reason given as null, 0 or missing become undefined", () => {
  for (const empty of [null, 0, undefined]) {
    const out = transformWebhookData(
      clerkPayload({ failed_at: empty, paid_at: empty, failed_reason: empty })
    );
    assert.equal(out.failed_at, undefined);
    assert.equal(out.paid_at, undefined);
    assert.equal(out.failed_reason, undefined);
    assert.deepEqual(problems(paymentAttemptDataValidator, out), []);
  }
});

test("failed_reason is passed through as given, including fields the validator does not know", () => {
  // Documents current behaviour: unlike the other nested objects, failed_reason
  // is not rebuilt field by field, so an extra field would reach the validator.
  const out = transformWebhookData(
    clerkPayload({ failed_reason: { code: "card_declined", advice: "try_again_later" } })
  );
  assert.deepEqual(out.failed_reason, { code: "card_declined", advice: "try_again_later" });
  assert.deepEqual(problems(paymentAttemptDataValidator, out), [
    "data.failed_reason.advice: unknown field",
  ]);
});

test("a payload missing payer, payment_source, totals or subscription_items throws", () => {
  // Documents current behaviour: the webhook handler does not catch this, so
  // the route answers 500 and Clerk retries the delivery.
  for (const key of ["payer", "payment_source", "totals", "subscription_items"]) {
    assert.throws(() => transformWebhookData(clerkPayload({ [key]: undefined })), TypeError, key);
    assert.throws(() => transformWebhookData(clerkPayload({ [key]: null })), TypeError, key);
  }
  assert.throws(() => transformWebhookData(clerkPayload({ totals: { grand_total: money(1) } })), TypeError);
  assert.throws(() => transformWebhookData(undefined), TypeError);
});
