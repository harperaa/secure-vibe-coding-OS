/**
 * Re-export shim. The implementation lives in the shared `secure-vibe-runtime`
 * package so every app built from this template gets security fixes by
 * updating one dependency (`npm update secure-vibe-runtime`) instead of
 * copying files. Keep importing from this path; do not edit here.
 */
export * from "secure-vibe-runtime/convex";
