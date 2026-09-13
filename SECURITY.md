# SyncDraw Security Policy & Hardening Specification

This document details the security architecture, threat model, input validation rules, rate-limiting parameters, authorization semantics, dependency audit results, and known architectural boundaries for **SyncDraw** ("Real-Time Collaborative Drawing Canvas").

---

## 1. Threat Model

### 1.1 What SyncDraw Protects Against
SyncDraw is designed to resist realistic web application and WebSocket abuse patterns:
- **Client Identity Spoofing**: Clients cannot impersonate other users or forge author identities. Socket ID assignments are authoritative.
- **Cross-Author Operation Tampering**: Collaborators cannot undo, redo, or delete other users' strokes. Reversible operations enforce strict author matching.
- **Room Isolation Violations**: Actions, strokes, operations, and cursors emitted by clients in Room A cannot cross over to Room B. Unjoined sockets cannot emit room mutations.
- **Event Flooding & Denial of Service (DoS)**: High-frequency WebSocket flooding (`CURSOR_MOVE`, `DRAW_UPDATE`, `OPERATION_APPLY`, `JOIN_ROOM`) is throttled via token buckets.
- **Resource Exhaustion**: Memory bounds are enforced on room capacity, active in-flight strokes, stored canonical operations, and stroke point counts.
- **Malformed & Out-of-Bounds Payloads**: All incoming events are validated against strict runtime shapes, numeric finiteness, and coordinate bounds.
- **DOM / XSS Injection**: User display names are sanitized to strip control characters and are safely escaped both by React JSX and dynamic DOM insertion helpers (`escapeHtml`).
- **HTTP Header Leakage & Clickjacking**: Express disables `X-Powered-By` and sends security headers preventing MIME-sniffing, framing, and cross-origin resource embedding.

### 1.2 What is Out of Scope (Architectural Boundaries)
SyncDraw is currently an in-memory collaborative application and explicitly does **not** claim or provide:
- Persistent cryptographic user accounts or password-based authentication. Collaborators are identified via session-based display names and transient socket IDs.
- Distributed / multi-node rate limiting (single Node.js process is authoritative).
- Database-backed durable cloud storage (room state is maintained in server memory with a 2-minute reconnect grace period).
- End-to-end payload encryption between browser clients.

---

## 2. Input Validation & Payload Constraints

Every client-originated Socket.IO event is validated before processing. TypeScript types from the client are never trusted.

| Event | Required Payload Constraints | Server Action on Violation |
|---|---|---|
| `JOIN_ROOM` | `roomId`: URL-safe alphanumeric string, length 3–24 (`/^[A-Z0-9_-]{3,24}$/`).<br>`displayName`: Non-empty string, length 2–30 after control-character stripping. | Emits `ERROR` (`INVALID_PAYLOAD`, `INVALID_ROOM_ID`, `INVALID_DISPLAY_NAME`). Does not join room. |
| `DRAW_START` | `strokeId`: Alphanumeric string, length 1–64.<br>`tool`: `'pen'` \| `'highlighter'` \| `'eraser'`.<br>`color`: Hex `#rgb`, `#rrggbb`, `#rrggbbaa`, or `rgba(...)`.<br>`width`: Finite number, $0.5 \le \text{width} \le 150$.<br>`point`: Finite coordinates with $|x|, |y| \le 100,000$. | Emits `ERROR` (`INVALID_DRAW_START`, `INVALID_TOOL`, `INVALID_WIDTH`, etc.). Stroke is not tracked. |
| `DRAW_UPDATE` | `strokeId`: Valid stroke ID.<br>`points`: Array of 1 to 500 valid points. Each point must have finite numeric coordinates within $[-100000, 100000]$. | Invalid batches are dropped silently without crashing. If flooded, emits `ERROR` (`RATE_LIMITED`). |
| `DRAW_END` | `strokeId`: Valid stroke ID matching an active or canonical stroke. | Malformed payload dropped safely. Valid finalization commits stroke to room canonical state. |
| `ERASE_STROKES` | `operationId`: Valid operation ID (1–128 chars).<br>`strokeIds`: Array of 1 to 1000 valid stroke IDs. | Invalid payloads dropped safely. Emits `ERROR` (`RATE_LIMITED`) if rate limit is exceeded. |
| `CURSOR_MOVE` | `x`, `y`: Finite numbers within $[-100000, 100000]$. Socket must be joined to a room. | Malformed coordinates or unjoined socket events dropped silently without echo or crash. |
| `OPERATION_APPLY` | `operation`: Valid `add-stroke`, `erase-strokes`, `clear-canvas`, `undo`, or `redo` object. Authoritative `userId` is overwritten by the server. | Emits `OPERATION_ACK` (`accepted: false, reason`) and `ERROR`. Safe idempotent recovery on duplicates. |

---

## 3. Authorization & Room Isolation

1. **Room Membership Enforcement**:
   - The server maintains active room membership in `socket.data.roomId` upon verified `JOIN_ROOM`.
   - Any drawing, erasing, cursor, or operation event received from a socket without active room membership is rejected immediately with code `UNAUTHORIZED_ACTION`.
2. **Author-Scoped Mutation Authorization**:
   - When a client sends `OPERATION_APPLY` with `type: 'undo'` or `type: 'redo'`, the server looks up the target operation in `room.operationMap`.
   - The server verifies: `targetRecord.operation.userId === activeSocketUser.id`.
   - Cross-author mutations are rejected with error code `AUTHOR_MISMATCH`.
3. **Identity Forgery Prevention**:
   - In `DRAW_START` and `OPERATION_APPLY`, client-provided `userId` fields are stripped and overwritten with the server's authoritative `user.id` (`socket.id`). Clients cannot falsify authorship.
4. **Room Broadcast Isolation**:
   - All collaboration broadcasts (`DRAW_START`, `DRAW_UPDATE`, `DRAW_END`, `ERASE_STROKES`, `CURSOR_UPDATE`, `OPERATION_APPLIED`) use `socket.to(roomId).emit(...)` or `io.to(roomId).emit(...)`.
   - Sockets in Room A cannot receive or influence events in Room B.

---

## 4. Rate Limiting & Flood Protection

High-frequency WebSocket events are protected via an $\mathcal{O}(1)$ in-memory token-bucket rate limiter per socket ([rateLimiter.ts](file:///c:/Users/tester/Downloads/MindForge-SDE-Assignment/mindforge/server/src/security/rateLimiter.ts)):

| Protected Event | Token Capacity (Burst) | Continuous Refill Rate | Behavior on Limit Exceeded |
|---|:---:|:---:|---|
| `CURSOR_MOVE` | **50 tokens** | 50 tokens / sec | Dropped silently to avoid saturating the event loop or flooding peers. |
| `DRAW_UPDATE` | **60 tokens** | 60 tokens / sec | Emits `ERROR` with code `RATE_LIMITED`. Drops excessive point batches. |
| `OPERATION_APPLY` | **120 tokens** | 60 tokens / sec | Emits `OPERATION_ACK` (`accepted: false, reason: 'RATE_LIMITED'`) and `ERROR`. Accommodates rapid reconnect replays while stopping automated spam. |
| `JOIN_ROOM` | **5 tokens** | 1 token / sec | Emits `ERROR` with code `RATE_LIMITED`. Prevents rapid-fire room allocation abuse. |

### Memory Cleanup:
- When a client disconnects (`socket.on('disconnect')`), its rate-limit state is cleanly deleted via `socketRateLimiter.clearSocket(socket.id)`.
- A background unreferenced cleanup interval runs every 60 seconds to prune any inactive records older than 2 minutes.

---

## 5. Room Resource Bounds

To protect server memory and prevent resource exhaustion under heavy collaborator load, the following bounds are strictly enforced by `RoomManager`:

- `MAX_USERS_PER_ROOM = 50`: When 50 active collaborators are present, subsequent `JOIN_ROOM` attempts receive `ERROR` with code `ROOM_FULL`.
- `MAX_ACTIVE_STROKES_PER_USER = 10`: A single user cannot open more than 10 simultaneous in-flight strokes without finalizing them (`DRAW_END`). Prevents unfinalized stroke hoarding.
- `MAX_ACTIVE_STROKES_PER_ROOM = 100`: Room cannot exceed 100 total concurrent in-flight strokes across all users (`MAX_ACTIVE_STROKES_EXCEEDED`).
- `MAX_OPERATIONS_PER_ROOM = 10000`: Caps canonical operation history at 10,000 operations per room. Further operations are rejected cleanly with `MAX_OPERATIONS_EXCEEDED` rather than corrupting or discarding existing history.
- `MAX_STROKES_PER_ROOM = 5000`: Caps active canonical stroke count at 5,000 strokes per room (`MAX_STROKES_EXCEEDED`).
- `scheduleRoomCleanup`: Empty rooms with history are preserved for a 2-minute grace period before eviction, ensuring solo users can reconnect without losing state.

---

## 6. HTTP & WebSocket Security Hardening

### 6.1 HTTP Security Headers
Express HTTP responses include defensive security headers:
- `X-Content-Type-Options: nosniff` (prevents MIME type confusion attacks)
- `X-Frame-Options: DENY` (prevents clickjacking via iframes)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`
- `X-XSS-Protection: 0` (modern standard per OWASP guidelines)
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (applied to API / health endpoints)
- `app.disable('x-powered-by')` (removes server technology fingerprinting)

### 6.2 CORS Origin Verification
- In development (`NODE_ENV !== 'production'`), localhost loopback origins (`http://localhost:*`, `http://127.0.0.1:*`) are permitted.
- In production, origins are strictly verified against `CLIENT_URL` / `CLIENT_ORIGIN` (supports single origins or comma-separated lists of allowed domains).
- Non-browser requests without origin headers (such as uptime health probes) are safely permitted.

---

## 7. Browser LocalStorage Security

SyncDraw uses browser `localStorage` under `syncdraw:pending-operations:v1` for offline queue resilience:
- **No Secrets Stored**: Only vector operation coordinates, stroke IDs, room IDs, and display names are stored. No authentication tokens, credentials, or private keys exist or are stored.
- **Room and Session Scoping**: Records are partitioned strictly by `roomId` and `userSessionId`. Operations from Room A cannot leak into Room B.
- **Maximum Operation Cap**: Local storage queues are capped at 500 operations (`MAX_PENDING_OPERATIONS = 500`).
- **Quota Exceeded Resilience**: Storage writes are wrapped in try/catch blocks; storage quota exceptions (`QuotaExceededError`) log a non-fatal warning while retaining operations in memory.

---

## 8. Dependency Security Audit (`npm audit`)

As of Section 11, running `npm audit` reports:
- **Total Advisories**: 2 moderate severity advisories.
- **Affected Package**: `qs` (versions 2.2.5 – 6.15.3).
- **Advisory Identifiers**: `GHSA-x5fp-wj9c-mxmx` (array-limit bypass) and `GHSA-4mjr-xmp4-gh2g` (DoS via attacker-controlled isBuffer).
- **Dependency Path**: Pulled in transitively via `express@4.21.2` / `4.22.2`.
- **Assessment**:
  - SyncDraw's Express server exposes only `GET /health` and WebSocket upgrade endpoints.
  - The application does not parse query-string parameters from user input using `qs`.
  - In accordance with safety guidelines, dependencies are not blindly updated with major version changes that could break runtime compatibility.
  - SyncDraw documents this advisory transparently rather than making inaccurate "zero vulnerability" claims.

---

## 9. Automated Security Test Suite (`server/test-security.mjs`)

The automated security test suite verifies 22 attack and abuse vectors:
1. Invalid `JOIN_ROOM` payload rejection (`INVALID_PAYLOAD`).
2. Empty room ID rejection (`INVALID_ROOM_ID`).
3. Oversized & path-traversal room ID rejection.
4. Empty/whitespace display name rejection (`INVALID_DISPLAY_NAME`).
5. Control character sanitization while preserving international Unicode.
6. Malformed `DRAW_START` rejection (`INVALID_DRAW_START`, invalid tool).
7. Invalid `DRAW_UPDATE` numeric coordinates dropped (`NaN`, `Infinity`).
8. Excessive point batch dropped ($> 500$ points).
9. Invalid `DRAW_END` handled safely without crash.
10. Invalid `CURSOR_MOVE` coordinates dropped safely.
11. Cursor flooding rate-limiting (80 rapid updates throttled to 50).
12. `DRAW_UPDATE` flooding rate-limiting (`RATE_LIMITED`).
13. `OPERATION_APPLY` with invalid operation type rejected.
14. `OPERATION_APPLY` forged author identity overwritten authoritatively.
15. `OPERATION_APPLY` cross-author mutation rejected (`AUTHOR_MISMATCH`).
16. Duplicate operation acknowledged idempotently (`ALREADY_CANONICAL`).
17. Cross-room operation isolation.
18. Cross-room cursor isolation.
19. Unauthorized room-scoped event rejected (`UNAUTHORIZED_ACTION`).
20. Rapid `JOIN_ROOM` cycling throttled (`RATE_LIMITED`).
21. Disconnect cleanup of active strokes and rate-limit tracking.
22. Server remains fully operational and responsive to legitimate clients after all attack scenarios.
