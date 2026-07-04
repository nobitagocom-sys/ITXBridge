// Simulation data for Token Saver demo
// Each scenario has: input, transformed output, token counts (before/after), description

// --- Simple token estimator: ~4 chars per token for English text ---
export function estimateTokens(text) {
  if (!text) return 0;
  if (typeof text !== "string") text = JSON.stringify(text);
  // ~4 characters per token is a standard heuristic for English
  return Math.max(1, Math.round(text.length / 4));
}

export function estimateTokensFromMessages(messages) {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.text) total += estimateTokens(part.text);
        if (part.content && typeof part.content === "string") total += estimateTokens(part.content);
      }
    }
  }
  return total;
}

export function formatTokens(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export function savingsPct(before, after) {
  if (!before || before === 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

// ============================================================================
// CASE 1: RTK — Compress Tool Output
// ============================================================================

// 1a. Git Diff
export const RTK_GIT_DIFF_INPUT = `diff --git a/src/auth/login.js b/src/auth/login.js
index 83db48f..a1b2c3d 100644
--- a/src/auth/login.js
+++ b/src/auth/login.js
@@ -1,85 +1,142 @@
 const bcrypt = require('bcryptjs');
-const jwt = require('jsonwebtoken');
+const jose = require('jose');
 const { getUserByEmail } = require('../db/users');
+const { createSession, revokeSession } = require('../db/sessions');
+const { rateLimiter } = require('../middleware/ratelimit');
+const { auditLog } = require('../lib/audit');

-async function login(email, password) {
-  const user = await getUserByEmail(email);
-  if (!user) {
-    throw new Error('Invalid email or password');
-  }
-  const valid = await bcrypt.compare(password, user.passwordHash);
-  if (!valid) {
-    throw new Error('Invalid email or password');
-  }
-  const token = jwt.sign(
-    { userId: user.id, email: user.email, role: user.role },
-    process.env.JWT_SECRET,
-    { expiresIn: '24h' }
+async function login(req, res) {
+  const { email, password, deviceFingerprint } = req.body;
+
+  // Rate limit check
+  const rateLimitOk = await rateLimiter.check(email, req.ip);
+  if (!rateLimitOk) {
+    auditLog.warn('login.ratelimited', { email, ip: req.ip });
+    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
+  }
+
+  // Validate input
+  if (!email || !password) {
+    return res.status(400).json({ error: 'Email and password are required' });
+  }
+
+  const user = await getUserByEmail(email);
+  if (!user) {
+    await rateLimiter.record(email, req.ip);
+    auditLog.warn('login.failed.user_not_found', { email, ip: req.ip });
+    return res.status(401).json({ error: 'Invalid credentials' });
+  }
+
+  const valid = await bcrypt.compare(password, user.passwordHash);
+  if (!valid) {
+    await rateLimiter.record(email, req.ip);
+    auditLog.warn('login.failed.bad_password', { email, ip: req.ip });
+    return res.status(401).json({ error: 'Invalid credentials' });
+  }
+
+  // Generate tokens using jose (more secure, smaller bundle)
+  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
+  const accessToken = await new jose.SignJWT({
+    sub: user.id,
+    email: user.email,
+    role: user.role,
+  })
+    .setProtectedHeader({ alg: 'HS256' })
+    .setIssuedAt()
+    .setExpirationTime('1h')
+    .sign(secret);
+
+  const refreshToken = await new jose.SignJWT({
+    sub: user.id,
+    type: 'refresh',
+  })
+    .setProtectedHeader({ alg: 'HS256' })
+    .setIssuedAt()
+    .setExpirationTime('7d')
+    .sign(secret);
+
+  // Create session record
+  const session = await createSession({
+    userId: user.id,
+    deviceFingerprint,
+    ip: req.ip,
+    userAgent: req.headers['user-agent'],
+  });
+
+  auditLog.info('login.success', { userId: user.id, ip: req.ip });
+
+  return res.json({
+    accessToken,
+    refreshToken,
+    sessionId: session.id,
+    expiresIn: 3600,
+    user: {
+      id: user.id,
+      email: user.email,
+      name: user.name,
+      role: user.role,
+    },
+  });
+}
+
+async function logout(req, res) {
+  const { sessionId } = req.body;
+  if (sessionId) {
+    await revokeSession(sessionId);
+    auditLog.info('logout', { sessionId });
+  }
+  return res.json({ success: true });
+}
+
+module.exports = { login, logout };
diff --git a/src/middleware/auth.js b/src/middleware/auth.js
index f1e2d3c..b4c5d6e 100644
--- a/src/middleware/auth.js
+++ b/src/middleware/auth.js
@@ -1,45 +1,68 @@
-const jwt = require('jsonwebtoken');
+const jose = require('jose');

-async function authMiddleware(req, res, next) {
+async function authMiddleware(req, res, next, options = {}) {
   const authHeader = req.headers.authorization;
-  if (!authHeader || !authHeader.startsWith('Bearer ')) {
-    return res.status(401).json({ error: 'No token provided' });
+  if (!authHeader?.startsWith('Bearer ')) {
+    return res.status(401).json({ error: 'Authentication required' });
   }
+
   const token = authHeader.slice(7);
+
   try {
-    const decoded = jwt.verify(token, process.env.JWT_SECRET);
-    req.user = {
-      id: decoded.userId,
-      email: decoded.email,
-      role: decoded.role,
-    };
+    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
+    const { payload } = await jose.jwtVerify(token, secret, {
+      algorithms: ['HS256'],
+      requiredClaims: ['sub'],
+    });
+
+    req.user = { id: payload.sub, email: payload.email, role: payload.role };
+
+    // Optional role-based access
+    if (options.requiredRole && req.user.role !== options.requiredRole) {
+      return res.status(403).json({ error: 'Insufficient permissions' });
+    }
+
     next();
   } catch (err) {
-    return res.status(401).json({ error: 'Invalid or expired token' });
+    if (err.code === 'ERR_JWT_EXPIRED') {
+      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
+    }
+    return res.status(401).json({ error: 'Invalid token' });
   }
 }

 module.exports = { authMiddleware };`;

export const RTK_GIT_DIFF_OUTPUT = `
src/auth/login.js
  @@ -1,85 +1,142 @@
  const bcrypt = require('bcryptjs');
  -const jwt = require('jsonwebtoken');
  +const jose = require('jose');
  const { getUserByEmail } = require('../db/users');
  +const { createSession, revokeSession } = require('../db/sessions');
  +const { rateLimiter } = require('../middleware/ratelimit');
  +const { auditLog } = require('../lib/audit');
  -async function login(email, password) {
  ... (14 lines truncated)
  +async function logout(req, res) {
  +  const { sessionId } = req.body;
  +  if (sessionId) {
  ... (10 lines truncated)
  +module.exports = { login, logout };

src/middleware/auth.js
  @@ -1,45 +1,68 @@
  -const jwt = require('jsonwebtoken');
  +const jose = require('jose');
  -async function authMiddleware(req, res, next) {
  ... (7 lines truncated)
  +    if (options.requiredRole && req.user.role !== options.requiredRole) {
  +      return res.status(403).json({ error: 'Insufficient permissions' });
  +    }
  ... (44 lines truncated)
  +47 -42

[full diff: rtk git diff --no-compact]`;

// 1b. Grep output
export const RTK_GREP_INPUT = `src/auth/login.js:12:const bcrypt = require('bcryptjs');
src/auth/login.js:13:const jose = require('jose');
src/auth/login.js:14:const { getUserByEmail } = require('../db/users');
src/auth/login.js:15:const { createSession, revokeSession } = require('../db/sessions');
src/auth/login.js:16:const { rateLimiter } = require('../middleware/ratelimit');
src/auth/login.js:17:const { auditLog } = require('../lib/audit');
src/auth/login.js:25:    auditLog.warn('login.ratelimited', { email, ip: req.ip });
src/auth/login.js:36:    auditLog.warn('login.failed.user_not_found', { email, ip: req.ip });
src/auth/login.js:43:    auditLog.warn('login.failed.bad_password', { email, ip: req.ip });
src/auth/login.js:67:  auditLog.info('login.success', { userId: user.id, ip: req.ip });
src/auth/login.js:89:    auditLog.info('logout', { sessionId });
src/middleware/auth.js:5:const jose = require('jose');
src/middleware/auth.js:15:  const token = authHeader.slice(7);
src/middleware/auth.js:18:    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
src/middleware/auth.js:19:    const { payload } = await jose.jwtVerify(token, secret, {
src/middleware/auth.js:31:      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
src/lib/audit.js:8:const auditLog = {
src/lib/audit.js:9:  info: (event, data) => { console.log(\`[AUDIT] \${event}\`, data); },
src/lib/audit.js:10:  warn: (event, data) => { console.warn(\`[AUDIT] \${event}\`, data); },
src/lib/audit.js:14:module.exports = { auditLog };
src/middleware/ratelimit.js:22:    auditLog.warn('ratelimit.triggered', { key, ip });
src/middleware/ratelimit.js:30:    auditLog.info('ratelimit.reset', { key });
src/db/sessions.js:18:    auditLog.info('session.created', { userId, sessionId: id });
src/db/sessions.js:35:    auditLog.info('session.revoked', { sessionId });
src/db/users.js:25:  auditLog.info('user.created', { userId: user.id, email: user.email });`;

export const RTK_GREP_OUTPUT = `23 matches in 7F:

[file] src/auth/login.js (11):
     12: const bcrypt = require('bcryptjs');
     13: const jose = require('jose');
     14: const { getUserByEmail } = require('../db/users');
     15: const { createSession, revokeSession } = require('../db/sessions');
     16: const { rateLimiter } = require('../middleware/ratelimit');
     17: const { auditLog } = require('../lib/audit');
     25: auditLog.warn('login.ratelimited', { email, ip: req.ip });
     36: auditLog.warn('login.failed.user_not_found', { email, ip: req.ip });
     43: auditLog.warn('login.failed.bad_password', { email, ip: req.ip });
     67: auditLog.info('login.success', { userId: user.id, ip: req.ip });
  +1

[file] src/db/sessions.js (2):
     18: auditLog.info('session.created', { userId, sessionId: id });
     35: auditLog.info('session.revoked', { sessionId });

[file] src/db/users.js (1):
     25: auditLog.info('user.created', { userId: user.id, email: user.email });

[file] src/lib/audit.js (3):
      8: const auditLog = {
      9: info: (event, data) => { console.log(\`[AUDIT] \${event}\`, data); };
     10: warn: (event, data) => { console.warn(\`[AUDIT] \${event}\`, data); };
  +0

[file] src/middleware/auth.js (5):
      5: const jose = require('jose');
     15: const token = authHeader.slice(7);
     18: const secret = new TextEncoder().encode(process.env.JWT_SECRET);
     19: const { payload } = await jose.jwtVerify(token, secret, {
     31: return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });

[file] src/middleware/ratelimit.js (2):
     22: auditLog.warn('ratelimit.triggered', { key, ip });
     30: auditLog.info('ratelimit.reset', { key });
`;

// 1c. Read Numbered (large file with line numbers)
export const RTK_READ_NUMBERED_INPUT = Array.from({ length: 300 }, (_, i) => {
  const n = i + 1;
  return `  ${String(n).padStart(4)}|${n <= 120
    ? `  // Line ${n} - Component definition`
    : n <= 200
      ? `  // Line ${n} - Render logic and state management`
      : `  // Line ${n} - Export and utility functions`}`;
}).join("\n");

export const RTK_READ_NUMBERED_OUTPUT = (() => {
  const head = Array.from({ length: 120 }, (_, i) => {
    const n = i + 1;
    return `  ${String(n).padStart(4)}|  // Line ${n} - Component definition`;
  });
  const tail = Array.from({ length: 60 }, (_, i) => {
    const n = 241 + i;
    return `  ${String(n).padStart(4)}|  // Line ${n} - Export and utility functions`;
  });
  return [...head, "... +120 lines truncated (file continues)", ...tail].join("\n");
})();

// 1d. Git Status
export const RTK_GIT_STATUS_INPUT = `On branch feature/jose-migration
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
\tmodified:   package.json
\tmodified:   package-lock.json
\tmodified:   src/auth/login.js
\tmodified:   src/auth/login.test.js
\tmodified:   src/middleware/auth.js
\tmodified:   src/middleware/auth.test.js
\tnew file:   src/lib/audit.js
\tnew file:   src/middleware/ratelimit.js
\tnew file:   src/middleware/ratelimit.test.js
\tnew file:   src/db/sessions.js
\tnew file:   src/db/sessions.test.js

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
\tmodified:   src/auth/login.js
\tmodified:   src/middleware/auth.js
\tmodified:   .env.example
\tmodified:   README.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
\tsrc/lib/audit.test.js
\tsrc/migrations/002_add_sessions.sql
\tdocs/audit-logging.md
\tdocs/jose-migration-guide.md
\t.dockerignore`;

export const RTK_GIT_STATUS_OUTPUT = `On branch feature/jose-migration
5 staged: modified=5 new=
3 modified: src/auth/login.js src/middleware/auth.js .env.example README.md
5 untracked: src/lib/audit.test.js src/migrations/002_add_sessions.sql docs/audit-logging.md docs/jose-migration-guide.md .dockerignore`;

// 1e. Build Output
export const RTK_BUILD_INPUT = `
> my-app@1.0.0 build
> next build

   ▲ Next.js 16.1.6
   - Environments: .env.local, .env

   Creating an optimized production build ...
 ✓ Compiled successfully in 12.4s
   Running TypeScript ...
   Collecting page data ...
   Generating static pages (0/24) ...
   Generating static pages (6/24) ...
   Generating static pages (12/24) ...
   Generating static pages (18/24) ...
 ✓ Generating static pages (24/24)

   Linting and checking validity of types ...
   Collecting build traces ...

> Build error occurred
Error: Circular dependency detected in src/components/DataGrid.tsx
    at resolveDependencies (node_modules/next/dist/build/webpack/plugins/...)
    at processDependencies (node_modules/next/dist/build/webpack/plugins/...)
    at async Promise.all (index 3)

> Build failed because of webpack errors
npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! my-app@1.0.0 build: \`next build\`
npm ERR! Exit status 1
npm ERR!
npm ERR! Failed at the my-app@1.0.0 build script.
npm ERR! This is probably not a problem with npm. There is likely additional logging output above.

npm ERR! A complete log of this run can be found in:
npm ERR!     /Users/dev/.npm/_logs/2026-06-29T10_30_00_123Z-debug.log`;

export const RTK_BUILD_OUTPUT = `> my-app@1.0.0 build

❌  ERRORS:
Error: Circular dependency detected in src/components/DataGrid.tsx
    at resolveDependencies

⚠  WARNINGS: (none)

📋  SUMMARY: Build FAILED (1 error)
   Next.js 16.1.6
   Compiled successfully in 12.4s
   24 static pages generated`;

// ============================================================================
// CASE 2: Headroom — Compress Context
// ============================================================================

export const HEADROOM_INPUT_MESSAGES = [
  { role: "system", content: "You are a helpful coding assistant. Provide clear, well-documented code." },
  { role: "user", content: "Viết function tính Fibonacci" },
  { role: "assistant", content: "```javascript\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n```" },
  { role: "user", content: "Thêm cache vào function trên" },
  { role: "assistant", content: "```javascript\nconst cache = new Map();\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache.has(n)) return cache.get(n);\n  const result = fibonacci(n - 1) + fibonacci(n - 2);\n  cache.set(n, result);\n  return result;\n}\n```" },
  { role: "user", content: "Đổi từ Map sang object" },
  { role: "assistant", content: "```javascript\nconst cache = {};\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache[n] !== undefined) return cache[n];\n  cache[n] = fibonacci(n - 1) + fibonacci(n - 2);\n  return cache[n];\n}\n```" },
  { role: "user", content: "Viết test cho function này" },
  { role: "assistant", content: "```javascript\nconsole.assert(fibonacci(0) === 0, 'fib(0)');\nconsole.assert(fibonacci(1) === 1, 'fib(1)');\nconsole.assert(fibonacci(10) === 55, 'fib(10)');\nconsole.assert(fibonacci(20) === 6765, 'fib(20)');\nconsole.log('All tests passed');\n```" },
  { role: "user", content: "Giải thích độ phức tạp" },
  { role: "assistant", content: "Độ phức tạp thời gian: O(n) với memoization (mỗi số tính 1 lần). Không gian: O(n) cho cache + O(n) cho call stack." },
  { role: "user", content: "Có cách nào tối ưu không gian hơn không?" },
  { role: "assistant", content: "Có thể dùng iterative bottom-up: chỉ cần 2 biến. Không gian O(1).\n```javascript\nfunction fib(n) {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) {\n    [prev, curr] = [curr, prev + curr];\n  }\n  return curr;\n}\n```" },
  { role: "user", content: "Viết lại toàn bộ code từ đầu đến giờ thành 1 file hoàn chỉnh" },
  { role: "assistant", content: "```javascript\n// fibonacci.js - Complete implementation with tests\n\n// Version 1: Recursive with memoization (object cache)\nconst cache = {};\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache[n] !== undefined) return cache[n];\n  cache[n] = fibonacci(n - 1) + fibonacci(n - 2);\n  return cache[n];\n}\n\n// Version 2: Iterative (O(1) space)\nfunction fibonacciIterative(n) {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) {\n    [prev, curr] = [curr, prev + curr];\n  }\n  return curr;\n}\n\n// Tests\nconsole.assert(fibonacci(0) === 0, 'fib(0)');\nconsole.assert(fibonacci(1) === 1, 'fib(1)');\nconsole.assert(fibonacci(10) === 55, 'fib(10)');\nconsole.assert(fibonacci(20) === 6765, 'fib(20)');\nconsole.assert(fibonacciIterative(30) === 832040, 'fibIter(30)');\nconsole.log('All tests passed');\n```" },
  { role: "user", content: "Giờ hãy giúp tôi implement binary search" },
];

// Simulated Headroom compressed output (showing how conversation context gets summarized)
export const HEADROOM_OUTPUT_MESSAGES = [
  { role: "system", content: "You are a helpful coding assistant. Provide clear, well-documented code." },
  {
    role: "user",
    content: "[SUMMARY OF PREVIOUS CONVERSATION]\nUser asked to implement Fibonacci with iterative optimization. The conversation evolved:\n1. Basic recursive fibonacci → 2. Added Map-based cache → 3. Switched to object cache → 4. Added tests → 5. Analyzed time/space complexity: O(n) time, O(n) space → 6. Optimized to iterative O(1) space version → 7. Consolidated all versions into one complete file.\n\nFinal implementations available: fibonacci(n) with object memoization, fibonacciIterative(n) with O(1) space.\n\n--- CURRENT REQUEST ---"
  },
  { role: "user", content: "Giờ hãy giúp tôi implement binary search" },
];

// ============================================================================
// CASE 3: Caveman — Compress LLM Output
// ============================================================================

export const CAVEMAN_SYSTEM_PROMPT = `Respond like terse caveman. All technical substance stay exact, only fluff die.
Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, hedging. Fragments OK. Short synonyms (big not extensive, fix not implement a solution for).
Pattern: [thing] [action] [reason]. [next step].
Code blocks, file paths, commands, errors, URLs: keep exact.
ACTIVE EVERY RESPONSE. No revert after many turns.`;

export const CAVEMAN_INPUT_PROMPT = "Explain how HTTPS works. Include the TLS handshake, certificate validation, and symmetric vs asymmetric encryption.";

export const CAVEMAN_OUTPUT_FULL = `HTTPS = HTTP + TLS.

1. TLS Handshake:
   Client connects, sends ClientHello (supported ciphers, TLS version).
   Server replies ServerHello (chosen cipher) + certificate.
   Client validates cert → CA chain, expiry, domain match.
   Key exchange (ECDHE typical): both sides derive shared secret.
   Both send Finished message (encrypted with derived key).
   → Secure channel established.

2. Certificate Validation:
   Browser checks: CA signature valid, cert not expired, CN/SAN matches domain.
   CRL/OCSP for revocation. CT logs for transparency.

3. Symmetric vs Asymmetric:
   Asymmetric (RSA/ECDSA): used during handshake. Slow but no shared secret needed.
   Symmetric (AES-GCM/ChaCha20): used for bulk data. Fast, same key both sides.
   Hybrid: handshake uses asymmetric to agree on symmetric session key.

Result: encrypted channel with forward secrecy (ECDHE). Attacker sees only IP + SNI.`;

export const CAVEMAN_OUTPUT_ULTRA = `HTTPS → HTTP+TLS.

Handshake: ClientHello → ServerHello+cert → key exchange (ECDHE) → Finished.
Cert: CA chain check, expiry, domain match, CRL/OCSP revocation.
Asymmetric (handshake, slow) → symmetric session key (AES-GCM, fast).
Result: encrypted, forward-secret channel.`;

// ============================================================================
// CASE 4: Ponytail — Lazy Senior Dev
// ============================================================================

export const PONYTAIL_SYSTEM_PROMPT = `You are a lazy senior developer. Lazy means efficient, not careless.
Before writing code, stop at the first rung that holds:
1) Does this need to exist? (YAGNI)
2) Stdlib does it? Use it.
3) Native platform feature covers it? Use it.
4) Already-installed dependency solves it? Use it.
5) Can it be one line? One line.
6) Only then: minimum code that works.
No unrequested abstractions. Deletion over addition. Fewest files possible.`;

export const PONYTAIL_INPUT_PROMPT = "Viết một REST API client trong JavaScript để gọi API https://jsonplaceholder.typicode.com/posts. Cần có: class với constructor, method GET all posts, GET post by ID, POST tạo mới, PUT update, DELETE, error handling, retry logic, logging, và type definitions.";

export const PONYTAIL_OUTPUT_FULL = `// ponytail: REST client — stdlib fetch, no deps. Add axios if you need interceptors.
// ponytail: skipped TypeScript types — add .d.ts when API shape stabilizes.

class JsonPlaceholder {
  constructor(base = "https://jsonplaceholder.typicode.com") {
    this.base = base;
  }

  async #fetch(path, opts = {}) {
    const res = await fetch(\`\${this.base}\${path}\`, {
      headers: { "Content-Type": "application/json", ...opts.headers },
      ...opts,
    });
    if (!res.ok) throw new Error(\`\${res.status}: \${await res.text()}\`);
    return res.json();
  }

  async getAllPosts()    { return this.#fetch("/posts"); }
  async getPost(id)      { return this.#fetch(\`/posts/\${id}\`); }
  async createPost(data) { return this.#fetch("/posts", { method: "POST", body: JSON.stringify(data) }); }
  async updatePost(id, data) { return this.#fetch(\`/posts/\${id}\`, { method: "PUT", body: JSON.stringify(data) }); }
  async deletePost(id)   { return this.#fetch(\`/posts/\${id}\`, { method: "DELETE" }); }
}

export { JsonPlaceholder };
// → skipped: retry logic, logging, types. Add when API becomes unreliable or team grows.`;

export const PONYTAIL_OUTPUT_ULTRA = `// ponytail: ultra — one-liner factory. YAGNI: no class, no types.
const api = (base = "https://jsonplaceholder.typicode.com") => ({
  get: (path) => fetch(base + path).then(r => r.json()),
  post: (path, body) => fetch(base + path, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }).then(r => r.json()),
});
// Usage: await api().get("/posts"); await api().post("/posts", data);
// → skipped: class, types, retry, logging, error handling, PUT, DELETE (add when needed).`;

// ============================================================================
// CASE 5: Combined — Full Pipeline Simulation
// ============================================================================

export const COMBINED_INPUT_MESSAGES = [
  { role: "system", content: "You are a coding assistant. Use tools to explore code." },
  { role: "user", content: "Tìm hiểu bug trong authentication flow của tôi. Có vẻ token hết hạn không được refresh đúng cách." },
  { role: "assistant", content: "Let me search for the auth-related code.", tool_calls: [{ id: "call_1", type: "function", function: { name: "grep", arguments: '{"pattern":"token|auth|jwt"}' } }] },
  {
    role: "tool",
    tool_call_id: "call_1",
    content: `src/auth/login.js:12:const jose = require('jose');
src/auth/login.js:47:  const accessToken = await new jose.SignJWT({
src/auth/login.js:55:  const refreshToken = await new jose.SignJWT({
src/auth/login.js:72:    accessToken,
src/middleware/auth.js:5:const jose = require('jose');
src/middleware/auth.js:15:  const token = authHeader.slice(7);
src/middleware/auth.js:19:    const { payload } = await jose.jwtVerify(token, secret, {
src/middleware/auth.js:27:    if (err.code === 'ERR_JWT_EXPIRED') {
src/api/refresh.js:10:    const { payload } = await jose.jwtVerify(refreshToken, secret);
src/api/refresh.js:15:    const newToken = await new jose.SignJWT({ sub: payload.sub })`
  },
  { role: "assistant", content: "Found auth files. Let me read the refresh token endpoint.", tool_calls: [{ id: "call_2", type: "function", function: { name: "read_file", arguments: '{"path":"src/api/refresh.js"}' } }] },
  {
    role: "tool",
    tool_call_id: "call_2",
    content: Array.from({ length: 250 }, (_, i) => `  ${String(i + 1).padStart(4)}|  // Line ${i + 1} of src/api/refresh.js${i === 15 ? ': BUG — missing expiry check' : ''}`).join("\n")
  },
];

export const COMBINED_TOOL_RESULT_AFTER_RTK = `6 matches in 3F:

[file] src/api/refresh.js (3):
     10: const { payload } = await jose.jwtVerify(refreshToken, secret);
     15: const newToken = await new jose.SignJWT({ sub: payload.sub })
      1: // Line 1 of src/api/refresh.js

[file] src/auth/login.js (1):
     72: accessToken,

[file] src/middleware/auth.js (2):
     15: const token = authHeader.slice(7);
     19: const { payload } = await jose.jwtVerify(token, secret, {`;

// Combined scenario simulation data
export const COMBINED_BEFORE_AFTER = {
  baseline: {
    inputTokens: 4850,
    outputTokens: 1200,
    totalTokens: 6050,
    description: "No token saver features enabled. Original request sent as-is to the LLM."
  },
  rtkOnly: {
    inputTokens: 3200,
    outputTokens: 1200,
    totalTokens: 4400,
    inputSavings: 1650,
    description: "RTK compresses tool outputs (grep, read_file) — reduces ~34% input tokens."
  },
  rtkHeadroom: {
    inputTokens: 2100,
    outputTokens: 1200,
    totalTokens: 3300,
    inputSavings: 2750,
    description: "RTK + Headroom: Headroom further compresses the entire conversation context — reduces ~57% input tokens."
  },
  rtkHeadroomCaveman: {
    inputTokens: 2100,
    outputTokens: 420,
    totalTokens: 2520,
    outputSavings: 780,
    description: "+ Caveman (Full): LLM output shortened by ~65% output tokens."
  },
  rtkHeadroomCavemanPonytail: {
    inputTokens: 2100,
    outputTokens: 280,
    totalTokens: 2380,
    outputSavings: 920,
    description: "+ Ponytail (Full): Minimal code output, skip boilerplate — further reduces output tokens."
  },
  maxSave: {
    inputTokens: 2100,
    outputTokens: 160,
    totalTokens: 2260,
    outputSavings: 1040,
    description: "Ultra mode: Caveman Ultra + Ponytail Ultra — maximum output token savings (~87%)."
  }
};

// ============================================================================
// Aggregated simulation data for each feature
// ============================================================================

export const FEATURES = {
  rtk: {
    id: "rtk",
    label: "RTK — Compress Tool Output",
    icon: "bolt",
    description: "ITXBridge automatically detects tool output types and compresses them before sending back to the LLM in the next turn. Supports 11 filters: git diff, git status, grep, find, ls, tree, dedup logs, build output, read-numbered files, search-list, smart-truncate.",
    color: "#3b82f6",
    subCases: [
      {
        id: "gitDiff",
        label: "1a. Git Diff",
        description: "Compress unified diff output — truncate hunks >100 lines, add +/- stats",
        inputLabel: "git diff output (100+ lines changed)",
        input: RTK_GIT_DIFF_INPUT,
        output: RTK_GIT_DIFF_OUTPUT,
        inputTokens: estimateTokens(RTK_GIT_DIFF_INPUT),
        outputTokens: estimateTokens(RTK_GIT_DIFF_OUTPUT),
      },
      {
        id: "grep",
        label: "1b. Grep Output",
        description: "Group grep results by file, max 10 matches/file",
        inputLabel: "grep -rn 'auditLog|token|jose' src/",
        input: RTK_GREP_INPUT,
        output: RTK_GREP_OUTPUT,
        inputTokens: estimateTokens(RTK_GREP_INPUT),
        outputTokens: estimateTokens(RTK_GREP_OUTPUT),
      },
      {
        id: "readNumbered",
        label: "1c. Read Numbered File",
        description: "Numbered file with 300+ lines: keep first 120 lines + last 60 lines",
        inputLabel: "read_file output (300 numbered lines)",
        input: RTK_READ_NUMBERED_INPUT,
        output: RTK_READ_NUMBERED_OUTPUT,
        inputTokens: estimateTokens(RTK_READ_NUMBERED_INPUT),
        outputTokens: estimateTokens(RTK_READ_NUMBERED_OUTPUT),
      },
      {
        id: "gitStatus",
        label: "1d. Git Status",
        description: "Simplify verbose git status → staged/modified/untracked summary",
        inputLabel: "git status (verbose)",
        input: RTK_GIT_STATUS_INPUT,
        output: RTK_GIT_STATUS_OUTPUT,
        inputTokens: estimateTokens(RTK_GIT_STATUS_INPUT),
        outputTokens: estimateTokens(RTK_GIT_STATUS_OUTPUT),
      },
      {
        id: "buildOutput",
        label: "1e. Build Output",
        description: "Keep errors + warnings + summary, strip progress bars and npm stack trace",
        inputLabel: "npm run build output (error + full stack trace)",
        input: RTK_BUILD_INPUT,
        output: RTK_BUILD_OUTPUT,
        inputTokens: estimateTokens(RTK_BUILD_INPUT),
        outputTokens: estimateTokens(RTK_BUILD_OUTPUT),
      },
    ],
  },

  headroom: {
    id: "headroom",
    label: "Headroom — Compress Context",
    icon: "compress",
    description: "When conversations get long, Headroom proxy compresses the entire messages array, preserving key ideas and removing duplicate content. Old messages are summarized while keeping the most recent messages intact.",
    color: "#8b5cf6",
    inputMessages: HEADROOM_INPUT_MESSAGES,
    outputMessages: HEADROOM_OUTPUT_MESSAGES,
    inputTokens: estimateTokensFromMessages(HEADROOM_INPUT_MESSAGES),
    outputTokens: estimateTokensFromMessages(HEADROOM_OUTPUT_MESSAGES),
  },

  caveman: {
    id: "caveman",
    label: "Caveman — Compress LLM Output",
    icon: "auto_awesome",
    description: "Injects a system prompt that makes the LLM respond extremely concisely (caveman style), reducing output tokens by ~65-87%. 3 levels: Lite (keeps full sentences), Full (true caveman), Ultra (maximum compression).",
    color: "#f59e0b",
    systemPrompt: CAVEMAN_SYSTEM_PROMPT,
    inputPrompt: CAVEMAN_INPUT_PROMPT,
    levels: [
      {
        id: "off",
        label: "OFF (Baseline)",
        output: `HTTPS (Hypertext Transfer Protocol Secure) is the secure version of HTTP. It works by combining HTTP with the TLS (Transport Layer Security) protocol to encrypt communications between a client (like your web browser) and a server.\n\n## 1. The TLS Handshake\n\nWhen you first connect to an HTTPS website, your browser and the server perform a TLS handshake. This is a multi-step process:\n\n**Step 1: Client Hello**\nThe client sends a "ClientHello" message containing the TLS version it supports, a list of cipher suites (encryption algorithms) it can use, and a random number.\n\n**Step 2: Server Hello**\nThe server responds with a "ServerHello" message, choosing the TLS version and cipher suite from the client's list. It also sends its random number and its digital certificate.\n\n**Step 3: Certificate Validation**\nThe client validates the server's certificate by checking: the Certificate Authority (CA) signature, the certificate's expiration date, whether the domain name matches, and whether the certificate has been revoked (via CRL or OCSP).\n\n**Step 4: Key Exchange**\nThe client and server perform a key exchange (typically using Elliptic Curve Diffie-Hellman Ephemeral, or ECDHE) to agree on a shared secret without ever transmitting it directly. This provides forward secrecy.\n\n**Step 5: Finished Messages**\nBoth parties send a "Finished" message, encrypted with the derived session key, confirming the handshake is complete.\n\n## 2. Symmetric vs Asymmetric Encryption\n\n**Asymmetric Encryption** (like RSA or ECDSA) uses a pair of keys: a public key and a private key. It's used during the TLS handshake for authentication and key exchange. It's computationally expensive but doesn't require a pre-shared secret.\n\n**Symmetric Encryption** (like AES-GCM or ChaCha20) uses a single shared key for both encryption and decryption. It's fast and efficient, making it ideal for encrypting the actual data being transmitted. After the handshake, all communication uses symmetric encryption with the session key.\n\n## 3. The Result\n\nOnce the handshake is complete, all data between client and server is encrypted with the symmetric session key. An attacker can only see the IP address and the SNI (Server Name Indication) — they cannot read the actual content of the communication. The connection also has integrity protection, so data cannot be modified in transit without detection.\n\nIn summary, HTTPS provides confidentiality (encryption), integrity (tamper detection), and authentication (certificate validation) for all web traffic. The TLS handshake sets up a secure channel using asymmetric encryption, and then bulk data transfer uses faster symmetric encryption.`,
        outputTokens: 550,
        level: "Baseline — no Caveman",
        levelNote: "Full explanation, structured, many filler words"
      },
      {
        id: "full",
        label: "Full",
        output: CAVEMAN_OUTPUT_FULL,
        outputTokens: estimateTokens(CAVEMAN_OUTPUT_FULL),
        level: "Caveman Full",
        levelNote: "True caveman: drop articles, fragments OK, keep technical details"
      },
      {
        id: "ultra",
        label: "Ultra",
        output: CAVEMAN_OUTPUT_ULTRA,
        outputTokens: estimateTokens(CAVEMAN_OUTPUT_ULTRA),
        level: "Caveman Ultra",
        levelNote: "Maximum compression: telegraphic style, abbreviations, extremely short"
      },
    ],
  },

  ponytail: {
    id: "ponytail",
    label: "Ponytail — Lazy Senior Dev",
    icon: "psychology",
    description: "Injects a 'lazy senior developer' system prompt that makes the LLM write minimal code: YAGNI, stdlib-first, no over-engineering. 3 levels: Lite (suggests simpler approaches), Full (decision ladder), Ultra (YAGNI extremist).",
    color: "#10b981",
    systemPrompt: PONYTAIL_SYSTEM_PROMPT,
    inputPrompt: PONYTAIL_INPUT_PROMPT,
    levels: [
      {
        id: "off",
        label: "OFF (Baseline)",
        output: `Certainly! Here's a comprehensive REST API client for JSONPlaceholder with all the features you requested:\n\n\`\`\`typescript\n// types.ts\nexport interface Post {\n  userId: number;\n  id: number;\n  title: string;\n  body: string;\n}\n\nexport interface ApiError {\n  status: number;\n  message: string;\n}\n\nexport interface RequestConfig {\n  retries?: number;\n  retryDelay?: number;\n  timeout?: number;\n}\n\n// logger.ts\nexport class Logger {\n  private prefix: string;\n  \n  constructor(prefix: string = '[API]') {\n    this.prefix = prefix;\n  }\n  \n  info(message: string, data?: any) {\n    console.log(\`\${this.prefix} INFO: \${message}\`, data || '');\n  }\n  \n  error(message: string, data?: any) {\n    console.error(\`\${this.prefix} ERROR: \${message}\`, data || '');\n  }\n  \n  warn(message: string, data?: any) {\n    console.warn(\`\${this.prefix} WARN: \${message}\`, data || '');\n  }\n}\n\n// client.ts\nexport class JsonPlaceholderClient {\n  private baseUrl: string;\n  private logger: Logger;\n  private defaultRetries: number;\n  private defaultRetryDelay: number;\n\n  constructor(config: { baseUrl?: string; retries?: number; retryDelay?: number } = {}) {\n    this.baseUrl = config.baseUrl || 'https://jsonplaceholder.typicode.com';\n    this.logger = new Logger('[JsonPlaceholder]');\n    this.defaultRetries = config.retries || 3;\n    this.defaultRetryDelay = config.retryDelay || 1000;\n  }\n\n  private async request<T>(\n    endpoint: string,\n    options: RequestInit & RequestConfig = {}\n  ): Promise<T> {\n    const { retries = this.defaultRetries, retryDelay = this.defaultRetryDelay, ...fetchOptions } = options;\n    const url = \`\${this.baseUrl}\${endpoint}\`;\n    let lastError: Error | null = null;\n\n    for (let attempt = 1; attempt <= retries; attempt++) {\n      try {\n        this.logger.info(\`Request \${options.method || 'GET'} \${url} (attempt \${attempt}/\${retries})\`);\n        const response = await fetch(url, {\n          ...fetchOptions,\n          headers: {\n            'Content-Type': 'application/json',\n            ...fetchOptions.headers,\n          },\n        });\n\n        if (!response.ok) {\n          const errorBody = await response.text();\n          throw new Error(\`HTTP \${response.status}: \${errorBody}\`);\n        }\n\n        const data = await response.json();\n        this.logger.info(\`Response \${response.status} from \${url}\`);\n        return data as T;\n      } catch (error) {\n        lastError = error instanceof Error ? error : new Error(String(error));\n        this.logger.warn(\`Attempt \${attempt} failed: \${lastError.message}\`);\n        \n        if (attempt < retries) {\n          const delay = retryDelay * Math.pow(2, attempt - 1);\n          this.logger.info(\`Retrying in \${delay}ms...\`);\n          await new Promise(resolve => setTimeout(resolve, delay));\n        }\n      }\n    }\n\n    this.logger.error(\`All \${retries} attempts failed for \${url}\`);\n    throw lastError || new Error('Request failed');\n  }\n\n  async getAllPosts(): Promise<Post[]> {\n    return this.request<Post[]>('/posts');\n  }\n\n  async getPostById(id: number): Promise<Post> {\n    if (!Number.isInteger(id) || id < 1) {\n      throw new Error('Invalid post ID');\n    }\n    return this.request<Post>(\`/posts/\${id}\`);\n  }\n\n  async createPost(post: Omit<Post, 'id'>): Promise<Post> {\n    if (!post.title || !post.body || !post.userId) {\n      throw new Error('Missing required fields: title, body, userId');\n    }\n    return this.request<Post>('/posts', {\n      method: 'POST',\n      body: JSON.stringify(post),\n    });\n  }\n\n  async updatePost(id: number, post: Partial<Post>): Promise<Post> {\n    if (!Number.isInteger(id) || id < 1) {\n      throw new Error('Invalid post ID');\n    }\n    return this.request<Post>(\`/posts/\${id}\`, {\n      method: 'PUT',\n      body: JSON.stringify(post),\n    });\n  }\n\n  async deletePost(id: number): Promise<void> {\n    if (!Number.isInteger(id) || id < 1) {\n      throw new Error('Invalid post ID');\n    }\n    return this.request<void>(\`/posts/\${id}\`, { method: 'DELETE' });\n  }\n}\n\nexport default JsonPlaceholderClient;\n\`\`\`\n\nThis implementation includes:\n- **Type definitions** with TypeScript interfaces for type safety\n- **Complete class** with constructor for dependency injection\n- **All CRUD methods**: GET all, GET by ID, POST, PUT, DELETE\n- **Retry logic** with exponential backoff\n- **Comprehensive logging** via a dedicated Logger class\n- **Input validation** for all methods\n- **Proper error handling** throughout\n\nLet me know if you'd like me to add any additional features like request cancellation or caching!`,
        outputTokens: 1200,
        level: "Baseline — no Ponytail",
        levelNote: "Full code: TypeScript types, Logger class, retry logic, validation, detailed comments"
      },
      {
        id: "full",
        label: "Full",
        output: PONYTAIL_OUTPUT_FULL,
        outputTokens: estimateTokens(PONYTAIL_OUTPUT_FULL),
        level: "Ponytail Full",
        levelNote: "Decision ladder: stdlib fetch, private methods, no TypeScript, no Logger class"
      },
      {
        id: "ultra",
        label: "Ultra",
        output: PONYTAIL_OUTPUT_ULTRA,
        outputTokens: estimateTokens(PONYTAIL_OUTPUT_ULTRA),
        level: "Ponytail Ultra",
        levelNote: "YAGNI extremist: no class, no types, factory function, 3 lines of code"
      },
    ],
  },

  combined: {
    id: "combined",
    label: "Combined (Full Pipeline)",
    icon: "layers",
    description: "Simulates a real workflow: user asks about a bug → LLM calls grep tool → RTK compresses grep output → LLM calls read_file → RTK compresses file output → Headroom compresses full context → Caveman + Ponytail compress output.",
    color: "#ef4444",
    scenario: COMBINED_BEFORE_AFTER,
  },
};

// ============================================================================
// QUALITY IMPACT ANALYSIS DATA
// ============================================================================

// --- Quality scoring: 5 = excellent, 1 = poor ---
export const QUALITY_SCORES = {
  caveman: {
    title: "Caveman — Output Quality by Level",
    description: "Same prompt 'Explain how HTTPS works', comparing answer quality across levels.",
    prompt: "Explain how HTTPS works. Include the TLS handshake, certificate validation, and symmetric vs asymmetric encryption.",
    dimensions: [
      { key: "accuracy", label: "Technical Accuracy", desc: "Is the technical information correct and complete?", icon: "check_circle" },
      { key: "completeness", label: "Coverage", desc: "Are all requested points covered?", icon: "coverage" },
      { key: "readability", label: "Readability", desc: "Is it easy for readers to understand?", icon: "menu_book" },
      { key: "safety", label: "Safety", desc: "Are any security warnings omitted?", icon: "shield" },
      { key: "conciseness", label: "Conciseness", desc: "No unnecessary content?", icon: "compress" },
    ],
    levels: [
      {
        id: "off",
        label: "OFF",
        color: "#64748b",
        scores: { accuracy: 5, completeness: 5, readability: 5, safety: 5, conciseness: 2 },
        outputTokens: 550,
        highlights: {
          kept: ["All 3 parts covered (handshake, cert validation, encryption)", "Step-by-step TLS handshake explanation", "Clear symmetric vs asymmetric comparison", "Mentions forward secrecy", "Includes integrity protection"],
          lost: [],
          risk: null,
        },
      },
      {
        id: "full",
        label: "Full",
        color: "#f59e0b",
        scores: { accuracy: 5, completeness: 4, readability: 3, safety: 5, conciseness: 4 },
        outputTokens: 200,
        highlights: {
          kept: ["TLS handshake 5 steps (abbreviated)", "Certificate validation checks", "Symmetric vs Asymmetric comparison", "Forward secrecy preserved", "Code/tech terms exact"],
          lost: ["Detailed explanation of each step", "Context about 'why'", "Transitional phrases", "Articles and filler"],
          risk: null,
        },
      },
      {
        id: "ultra",
        label: "Ultra",
        color: "#ef4444",
        scores: { accuracy: 4, completeness: 3, readability: 2, safety: 4, conciseness: 5 },
        outputTokens: 90,
        highlights: {
          kept: ["TLS handshake flow (concise)", "Certificate validation keys", "Symmetric vs Asymmetric distinction", "Forward-secret channel"],
          lost: ["ClientHello/ServerHello details", "CRL/OCSP explanation", "Detailed AES-GCM vs ChaCha20 comparison", "Explanatory context"],
          risk: "⚠️ Beginners may not understand deeply enough. CRL/OCSP is skipped.",
        },
      },
    ],
    concreteExample: {
      title: "Concrete Example: Line-by-line Comparison",
      sections: [
        {
          label: "TLS Handshake Explanation",
          off: "When you first connect to an HTTPS website, your browser and the server perform a TLS handshake. This is a multi-step process:\n\nStep 1: Client Hello — The client sends a ClientHello message containing the TLS version it supports, a list of cipher suites, and a random number.\n\nStep 2: Server Hello — The server responds with a ServerHello message, choosing the TLS version and cipher suite. It also sends its random number and its digital certificate.",
          full: "1. TLS Handshake:\nClient connects, sends ClientHello (supported ciphers, TLS version).\nServer replies ServerHello (chosen cipher) + certificate.",
          ultra: "Handshake: ClientHello → ServerHello+cert → key exchange (ECDHE) → Finished.",
          annotation: "Ultra keeps the correct flow but loses context about each step and 'why'.",
        },
        {
          label: "Certificate Validation",
          off: "The client validates the server's certificate by checking:\n- The Certificate Authority (CA) signature\n- The certificate's expiration date\n- Whether the domain name matches (CN/SAN)\n- Whether the certificate has been revoked (via CRL or OCSP)\n\nCertificate Transparency logs are also checked for additional security.",
          full: "2. Certificate Validation:\nBrowser checks: CA signature valid, cert not expired, CN/SAN matches domain.\nCRL/OCSP for revocation. CT logs for transparency.",
          ultra: "Cert: CA chain check, expiry, domain match, CRL/OCSP revocation.",
          annotation: "Full and Ultra both retain all 4 validation elements. Ultra drops 'browser checks' context.",
        },
      ],
    },
  },

  ponytail: {
    title: "Ponytail — Code Quality by Level",
    description: "Same prompt 'Write a REST API client for JSONPlaceholder', comparing code output across levels.",
    prompt: "Viết một REST API client trong JavaScript để gọi API https://jsonplaceholder.typicode.com/posts. Cần có: class với constructor, method GET all posts, GET post by ID, POST tạo mới, PUT update, DELETE, error handling, retry logic, logging, và type definitions.",
    dimensions: [
      { key: "functionality", label: "Functionality", desc: "Are all requested methods present?", icon: "functions" },
      { key: "maintainability", label: "Maintainability", desc: "Is the code easy to maintain long-term?", icon: "build" },
      { key: "safety", label: "Safety", desc: "Is there error handling and trust boundary validation?", icon: "shield" },
      { key: "conciseness", label: "Conciseness", desc: "No unnecessary boilerplate?", icon: "compress" },
      { key: "correctness", label: "Correctness", desc: "Does the code actually run?", icon: "check_circle" },
    ],
    levels: [
      {
        id: "off",
        label: "OFF",
        color: "#64748b",
        scores: { functionality: 5, maintainability: 5, safety: 5, conciseness: 1, correctness: 5 },
        outputTokens: 1200,
        highlights: {
          kept: ["All CRUD methods", "TypeScript type definitions", "Retry with exponential backoff", "Dedicated Logger class", "Input validation for each method", "Comprehensive error handling", "Dependency injection via constructor"],
          lost: [],
          risk: null,
        },
      },
      {
        id: "full",
        label: "Full",
        color: "#10b981",
        scores: { functionality: 5, maintainability: 4, safety: 4, conciseness: 4, correctness: 5 },
        outputTokens: 200,
        highlights: {
          kept: ["All CRUD methods", "Class with constructor", "Basic error handling (throw on !ok)", "Private methods (#fetch)", "Ponytail comment marker"],
          lost: ["TypeScript types", "Retry logic", "Logger class", "Detailed input validation", "Dependency injection"],
          risk: "⚠️ No retry logic → network failure throws immediately. No validation → GIGO.",
        },
      },
      {
        id: "ultra",
        label: "Ultra",
        color: "#8b5cf6",
        scores: { functionality: 3, maintainability: 2, safety: 2, conciseness: 5, correctness: 4 },
        outputTokens: 120,
        highlights: {
          kept: ["GET all, POST (basic)", "fetch() native", "Ponytail comment"],
          lost: ["GET by ID", "PUT update", "DELETE", "Class", "Types", "Error handling", "Retry", "Logger", "Validation", "Content-Type header on POST"],
          risk: "❌ Missing PUT, DELETE, GET by ID. No error handling. No validation. Only suitable for prototyping.",
        },
      },
    ],
    concreteExample: {
      title: "Concrete Example: Error Handling",
      sections: [
        {
          label: "HTTP Error Handling Approach",
          off: "private async request<T>(endpoint: string, options = {}): Promise<T> {\n  const url = `${this.baseUrl}${endpoint}`;\n  let lastError = null;\n  for (let attempt = 1; attempt <= retries; attempt++) {\n    try {\n      const response = await fetch(url, { ...fetchOptions });\n      if (!response.ok) {\n        const errorBody = await response.text();\n        throw new Error(`HTTP ${response.status}: ${errorBody}`);\n      }\n      return await response.json();\n    } catch (error) {\n      lastError = error;\n      if (attempt < retries) {\n        await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt - 1)));\n      }\n    }\n  }\n  throw lastError;\n}",
          full: "async #fetch(path, opts = {}) {\n  const res = await fetch(`${this.base}${path}`, {\n    headers: { 'Content-Type': 'application/json', ...opts.headers },\n    ...opts,\n  });\n  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);\n  return res.json();\n}",
          ultra: "const api = (base) => ({\n  get: (path) => fetch(base + path).then(r => r.json()),\n  post: (path, body) => fetch(base + path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),\n});",
          annotation: "OFF: retry + backoff + error body. Full: throw on !ok. Ultra: no catch — error propagates raw.",
        },
      ],
    },
  },
};

// Guardrails documentation
export const GUARDRAILS = {
  caveman: {
    title: "Caveman Guardrails (SHARED_BOUNDARIES)",
    source: "open-sse/rtk/cavemanPrompts.js",
    rules: [
      { what: "Code blocks", action: "Keep exact", icon: "code", color: "#22c55e" },
      { what: "File paths, commands, errors, URLs", action: "Keep exact", icon: "terminal", color: "#22c55e" },
      { what: "Security warnings", action: "Write normally, don't compress", icon: "shield", color: "#ef4444" },
      { what: "Irreversible action confirmations", action: "Write normally", icon: "warning", color: "#ef4444" },
      { what: "Multi-step ordered sequences", action: "Write normally", icon: "list_ordered", color: "#ef4444" },
      { what: "Filler words, hedging, pleasantries", action: "Remove", icon: "delete", color: "#f59e0b" },
      { what: "Articles (a/an/the)", action: "Remove (Full/Ultra)", icon: "text_fields", color: "#f59e0b" },
    ],
  },
  ponytail: {
    title: "Ponytail Guardrails (SHARED_NOT_LAZY)",
    source: "open-sse/rtk/ponytailPrompt.js",
    rules: [
      { what: "Input validation at trust boundaries", action: "Keep — do not skip", icon: "verified", color: "#ef4444" },
      { what: "Error handling that prevents data loss", action: "Keep — do not skip", icon: "backup", color: "#ef4444" },
      { what: "Security (auth, crypto, sanitization)", action: "Keep — do not skip", icon: "lock", color: "#ef4444" },
      { what: "Accessibility", action: "Keep — do not skip", icon: "accessibility", color: "#ef4444" },
      { what: "Anything explicitly requested", action: "Keep — do not skip", icon: "checklist", color: "#ef4444" },
      { what: "Unrequested abstractions (interface 1 impl, factory 1 product)", action: "Remove", icon: "delete", color: "#f59e0b" },
      { what: "Boilerplate/scaffolding 'for later'", action: "Remove", icon: "delete", color: "#f59e0b" },
      { what: "External dependencies for simple tasks", action: "Remove — stdlib first", icon: "delete", color: "#f59e0b" },
    ],
  },
};

// Recommendation matrix: which level for which use case
export const RECOMMENDATIONS = [
  {
    useCase: "Production code, security audit",
    icon: "verified_user",
    caveman: "OFF",
    ponytail: "OFF",
    reason: "Requires full context, explainability, and must not miss any security considerations.",
    riskLevel: "high",
  },
  {
    useCase: "Code review, debugging",
    icon: "bug_report",
    caveman: "Full",
    ponytail: "OFF",
    reason: "Needs technical precision and speed, no new code needed. Caveman Full keeps all code/paths/errors intact.",
    riskLevel: "low",
  },
  {
    useCase: "Internal tool, prototype",
    icon: "construction",
    caveman: "Full",
    ponytail: "Full",
    reason: "Speed matters more than perfection. Code still works but without enterprise features.",
    riskLevel: "medium",
  },
  {
    useCase: "Log analysis, grep kết quả",
    icon: "analytics",
    caveman: "Ultra",
    ponytail: "OFF",
    reason: "Only needs concise conclusions. No new code generated.",
    riskLevel: "low",
  },
  {
    useCase: "Quick script, POC, one-off",
    icon: "rocket_launch",
    caveman: "OFF",
    ponytail: "Ultra",
    reason: "Most minimal code possible, no long-term maintenance needed. Ultra Ponytail for shortest code.",
    riskLevel: "medium",
  },
  {
    useCase: "Documentation, explanation, onboarding",
    icon: "school",
    caveman: "OFF",
    ponytail: "OFF",
    reason: "Readers need full context. Caveman would degrade explanation quality.",
    riskLevel: "high",
  },
  {
    useCase: "CI/CD log, build failure analysis",
    icon: "build_circle",
    caveman: "Ultra",
    ponytail: "OFF",
    reason: "Just need: what error, which file, which line. The shorter the better.",
    riskLevel: "low",
  },
  {
    useCase: "API design, architecture discussion",
    icon: "account_tree",
    caveman: "OFF",
    ponytail: "Lite",
    reason: "Needs full discussion but code can be simpler. Ponytail Lite suggests minimal approaches.",
    riskLevel: "low",
  },
];
