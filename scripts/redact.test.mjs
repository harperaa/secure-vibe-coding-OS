import { test } from "node:test";
import assert from "node:assert/strict";
import { redactIdentifiers } from "../convex/lib/redact.ts";

test("redacts emails, SSNs, phones, and record ids, counting each", () => {
  const input = "Contact jane.doe+lab@example.org or (555) 123-4567; SSN 123-45-6789; MRN 00123456; patient id: 987654.";
  const { text, redactions } = redactIdentifiers(input);
  assert.equal(redactions, 5);
  assert.equal(text, "Contact [EMAIL] or [PHONE]; SSN [SSN]; [RECORD_ID]; [RECORD_ID].");
});

test("leaves ordinary text and short numbers alone", () => {
  const input = "Order 42 shipped on 2026-10-23 with 3 items.";
  assert.deepEqual(redactIdentifiers(input), { text: input, redactions: 0 });
});

test("phone formats: dotted, dashed, international prefix", () => {
  const { text, redactions } = redactIdentifiers("call 555.123.4567 or +1 555-123-4567 or 5551234567");
  assert.equal(redactions, 3);
  assert.equal(text, "call [PHONE] or [PHONE] or [PHONE]");
});

test("SSN is matched before the phone rule can take part of it", () => {
  const { text, redactions } = redactIdentifiers("ssn 123-45-6789 end");
  assert.equal(redactions, 1);
  assert.equal(text, "ssn [SSN] end");
});
