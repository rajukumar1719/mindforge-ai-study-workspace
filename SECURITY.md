# SyncDraw Security Policy & Audit

This document outlines the security architecture, threat model, initial security audit, and hardening measures implemented for **SyncDraw** ("Real-Time Collaborative Drawing Canvas").

---

## 1. Security Audit Before Hardening (Section 11 Initial Audit)

An inspection of the existing codebase (`server/src/`, `client/src/`, network protocols, dependencies, and execution logs) was performed prior to applying Section 11 hardening changes.

### 1.1 Current Attack Surfaces
1. **WebSocket Ingress (`Socket.IO`)**:
   - `JOIN_ROOM`: Payload handling for room ID and user display name.
   - High-frequency drawing events: `DRAW_START`, `DRAW_UPDATE`, `DRAW_END`.
   - Eraser events: `ERASE_STROKES`.
   - Ephemeral live cursor events: `CURSOR_MOVE`.
   - Collaborative history mutations: `OPERATION_APPLY`.
2. **HTTP REST Gateway (`Express`)**:
   - Health check endpoint: `GET /health`.
   - 404 handler and global Express error middleware.
   - CORS configuration on incoming HTTP and WebSocket handshake requests.
3. **In-Memory State Container (`RoomManager`)**:
   - Room registry and participant rosters.
   - Active in-flight drawing strokes.
   - Operation history log and indexed map.
   - Reconnection grace period cleanup timers.
4. **Client-Side Storage**:
   - Browser `localStorage` pending operation queue (`syncdraw:pending-operations:v1`).
   - Session storage display name caching.
5. **DOM / UI Rendering Sinks**:
   - Collaborator names rendered in presence badge, header, and floating cursor tags.
   - Canvas 2D context drawing commands.

---

### 1.2 Existing Protections (Sections 1–10)
- **Authoritative Identity Generation**: The server rejects client-supplied user IDs and authoritatively sets `socket.id` as the collaborator's identifier upon joining a room.
- **Author-Scoped Mutation Guards**: Collaborative undo and redo operations strictly verify that `targetRecord.operation.userId === op.userId`, preventing clients from modifying or undoing other users' strokes.
- **Safe React Text Escaping**: Collaborator display names rendered via React JSX are escaped by default. In `CursorOverlay.tsx`, where DOM elements are created dynamically, an explicit `escapeHtml()` helper converts `&`, `<`, `>`, `"`, and `'` to safe HTML entities. `dangerouslySetInnerHTML` is never used.
- **Basic Runtime Shape Validation**: Handlers in `validation.ts` check field existence, coordinate finiteness (`Number.isFinite`), stroke width ranges ($0.5$ to $150$), and operation types.
- **Room Isolation**: Broadcasts use Socket.IO room namespaces (`socket.to(roomId).emit(...)`), isolating events to participants who have successfully joined that room.
- **Idempotent Operations**: Duplicate operation submissions are detected authoritatively via `appliedOperationIds` and acknowledged safely as `ALREADY_CANONICAL` without duplicating room state.

---

### 1.3 Gaps Discovered
1. **Absence of Server-Side Rate Limiting / Flood Protection**:
   - No rate limiting exists on `CURSOR_MOVE`, allowing a malicious client to emit hundreds or thousands of updates per second, exhausting server CPU and flooding peers with `CURSOR_UPDATE`.
   - No rate limiting on `DRAW_UPDATE`, `OPERATION_APPLY`, or `JOIN_ROOM`.
2. **Unbounded Room Capacity & Memory Consumption**:
   - `RoomManager.addUser()` does not limit the number of participants per room (`MAX_USERS_PER_ROOM`).
   - `RoomManager.startStroke()` does not limit concurrent in-flight active strokes per user or room.
   - `RoomManager.applyCollaborativeOperation()` does not cap total stored operations per room, allowing unbounded memory growth over long periods.
3. **Display Name Control Characters**:
   - `isValidDisplayName()` validates string length (2–30 characters), but does not sanitize or strip non-printable ASCII / Unicode control characters (`[\x00-\x1F\x7F-\x9F]`) or collapse excessive whitespace.
4. **Missing HTTP Security Headers & Server Information Leakage**:
   - Express server does not set defensive security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc.).
   - The default Express header `X-Powered-By: Express` is exposed in HTTP responses.
5. **CORS Configuration Rigidity**:
   - CORS configuration only accepts a single hardcoded string from `process.env.CLIENT_URL` without support for comma-separated multiple origins.
6. **Client Offline Queue Storage Limits**:
   - `queue.ts` reads/writes `localStorage` without a maximum records cap, which could lead to quota exhaustion during long offline sketching sessions.
7. **Moderate Dependency Vulnerabilities (`npm audit`)**:
   - `npm audit` flags 2 moderate severity vulnerabilities in `qs` (`GHSA-x5fp-wj9c-mxmx` and `GHSA-4mjr-xmp4-gh2g`) pulled in transitively via `express@4.21.2`.

---

### 1.4 Planned Hardening Changes
1. Implement lightweight sliding-window rate limiting per socket (`server/src/security/rateLimiter.ts`) for `CURSOR_MOVE`, `DRAW_UPDATE`, `OPERATION_APPLY`, and `JOIN_ROOM`, with clean teardown on socket disconnect.
2. Introduce room resource bounds in `RoomManager`: maximum users per room (50), maximum active strokes per user (10), maximum active strokes per room (100), and maximum operation history (10,000).
3. Sanitize display names by stripping control characters and collapsing whitespace before room admission.
4. Enforce strict URL-safe regex on room IDs (`^[A-Z0-9_-]{3,24}$`).
5. Add HTTP security headers middleware to Express and disable `X-Powered-By`.
6. Support multi-origin CORS configurations with safe fallback for server-to-server health checks.
7. Enforce maximum bounds on client `localStorage` offline queue and handle storage quota exceptions gracefully.
8. Create automated security test suite (`server/test-security.mjs`) covering all 22 attack scenarios.
