---
name: comment-rule
description: Enforces strict commenting rules for all code generation. Comments are forbidden by default — code must be self-explanatory through naming and structure. Only add a comment when intent cannot be expressed in code, and always explain WHY, never WHAT. Apply this rule on every code generation task without being asked.
---

# Comment Rule

## Default Behavior

**Never write comments.** Code must be self-explanatory through naming, structure, and decomposition.

## A Comment Is Allowed Only When

1. The user explicitly asks for comments.
2. A non-obvious constraint, trade-off, or intent cannot be expressed through code structure or naming.
3. A public-facing API requires documentation (JSDoc/TSDoc on exported symbols).

## If You Must Write a Comment

- Explain **WHY**, never WHAT.
- Place it above the relevant block, not inline inside function bodies.

**Bad** — describes what the code does:
```ts
// increment the retry count
retryCount++;

// filter out inactive users
const active = users.filter(u => u.isActive);
```

**Good** — explains why a non-obvious decision was made:
```ts
// Clerk webhooks replay on failure; idempotency key prevents duplicate processing
if (await redis.exists(idempotencyKey)) return;

// WebRTC requires STUN before local candidates are gathered; order matters here
pc.addIceCandidate(candidate);
```

## When You Feel the Urge to Comment

Ask: "Can I rename this function/variable so the comment becomes unnecessary?"

If yes → rename, don't comment.  
If no → write the WHY comment.

## Decision Rule

When uncertain: **omit the comment**. Refactor instead.
