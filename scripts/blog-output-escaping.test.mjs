import { test } from "node:test";
import assert from "node:assert/strict";

const { serializeJsonLd, generateRssFeed } = await import("../templates/modules/blog/files/lib/blog.ts");

const post = {
  slug: "hello",
  title: 'Break ]]> out </title><script>alert(1)</script>',
  description: "Tom & Jerry ]]><evil/>",
  date: "2026-01-01T00:00:00.000Z",
  author: "A <b>uthor</b>",
  tags: ["c++ & <more>"],
  category: "Q&A",
  content: "",
  readingTime: { text: "", minutes: 0, time: 0, words: 0 },
};

test("JSON-LD cannot close its <script> tag", () => {
  const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("<"), out);
  assert.equal(JSON.parse(out).headline, "</script><script>alert(1)</script>");
});

test("RSS feed escapes frontmatter and site values", () => {
  const xml = generateRssFeed([post], "https://example.com/?a=1&b=2", "Me & <Co>");
  // Drop the escaped entities; no raw ampersand may remain.
  assert.ok(!/&/.test(xml.replace(/&(amp|lt|gt|quot|apos);/g, "")), "raw & in feed");
  for (const injected of ["<script>", "<evil/>", "<b>", "<more>", "<Co>", "]]>"]) {
    assert.ok(!xml.includes(injected), injected);
  }
  assert.ok(xml.includes("<category>Q&amp;A</category>"));
  assert.ok(xml.includes("<title>Me &amp; &lt;Co&gt; Blog</title>"));
});
