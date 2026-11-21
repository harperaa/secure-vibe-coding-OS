import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// lib/blog.ts resolves content/blog from process.cwd() at import time, so point
// cwd at a throwaway tree: one real post, and one file outside the blog dir.
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "blog-slug-")));
fs.mkdirSync(path.join(root, "content", "blog"), { recursive: true });
fs.writeFileSync(path.join(root, "content", "blog", "hello.md"), "---\ntitle: Hello\n---\nbody\n");
fs.writeFileSync(path.join(root, "outside.md"), "---\ntitle: Outside\n---\nnot a post\n");
process.chdir(root);
const { getPostBySlug } = await import("../templates/modules/blog/files/lib/blog.ts");

test("a real slug still resolves", () => {
  assert.equal(getPostBySlug("hello")?.title, "Hello");
});

test("a slug cannot reach files outside content/blog", () => {
  for (const slug of ["../../outside", "..\\..\\outside", path.join(root, "outside"), "sub/../hello"]) {
    assert.equal(getPostBySlug(slug), null, slug);
  }
});
