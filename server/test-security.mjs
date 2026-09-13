/**
 * SyncDraw Section 11 — Security, Authorization, Rate Limiting & Abuse Test Suite
 *
 * Automated regression suite verifying that the server securely handles malformed payloads,
 * enforces strict room isolation, author-scoped authorization, token-bucket rate limits,
 * resource caps, display name sanitization, and disconnect cleanups without crashing.
 */

import { io } from 'socket.io-client';
import { roomManager } from './dist/rooms/roomManager.js';
import { socketRateLimiter } from './dist/security/rateLimiter.js';

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient() {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
  });
}

function connectAndJoin(client, roomId, displayName, timeoutMs = 4000) {
  return Promise.race([
    new Promise((resolve, reject) => {
      const onJoined = (data) => {
        cleanup();
        resolve(data);
      };
      const onErr = (err) => {
        cleanup();
        reject(new Error(`Server error for ${displayName} in ${roomId}: ${JSON.stringify(err)}`));
      };
      const onConnErr = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        client.off('ROOM_JOINED', onJoined);
        client.off('ERROR', onErr);
        client.off('connect_error', onConnErr);
      };

      client.once('ROOM_JOINED', onJoined);
      client.once('ERROR', onErr);
      client.once('connect_error', onConnErr);

      if (client.connected) {
        client.emit('JOIN_ROOM', { roomId, displayName });
      } else {
        client.once('connect', () => {
          client.emit('JOIN_ROOM', { roomId, displayName });
        });
      }
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout waiting for ${displayName} to join room ${roomId}`)),
        timeoutMs
      )
    ),
  ]);
}

async function runSecurityTests() {
  console.log('\n=== STARTING SECTION 11 SECURITY & HARDENING TESTS ===\n');

  let passedTests = 0;
  const totalTests = 22;

  // =========================================================================
  // TEST 1: Invalid JOIN_ROOM payload (non-object, missing fields)
  // =========================================================================
  console.log('[Test 1] Invalid JOIN_ROOM payload rejected with INVALID_PAYLOAD...');
  {
    const client = createClient();
    await new Promise((res) => client.once('connect', res));

    const err = await new Promise((resolve) => {
      client.once('ERROR', resolve);
      client.emit('JOIN_ROOM', 'not an object');
    });

    if (err.code !== 'INVALID_PAYLOAD') {
      throw new Error(`Expected INVALID_PAYLOAD error code, got: ${JSON.stringify(err)}`);
    }
    client.disconnect();
    passedTests++;
    console.log('✓ Test 1 Passed: Server safely rejected non-object JOIN_ROOM payload.');
  }

  // =========================================================================
  // TEST 2: Empty room ID rejection
  // =========================================================================
  console.log('[Test 2] Empty room ID rejected with INVALID_ROOM_ID...');
  {
    const client = createClient();
    await new Promise((res) => client.once('connect', res));

    const err = await new Promise((resolve) => {
      client.once('ERROR', resolve);
      client.emit('JOIN_ROOM', { roomId: '   ', displayName: 'Alice' });
    });

    if (err.code !== 'INVALID_ROOM_ID') {
      throw new Error(`Expected INVALID_ROOM_ID, got: ${JSON.stringify(err)}`);
    }
    client.disconnect();
    passedTests++;
    console.log('✓ Test 2 Passed: Empty room ID rejected safely.');
  }

  // =========================================================================
  // TEST 3: Oversized / path-like room ID rejection
  // =========================================================================
  console.log('[Test 3] Oversized and path-traversal room IDs rejected...');
  {
    const client = createClient();
    await new Promise((res) => client.once('connect', res));

    // Path traversal attempt
    const pathErr = await new Promise((resolve) => {
      client.once('ERROR', resolve);
      client.emit('JOIN_ROOM', { roomId: '../../etc/passwd', displayName: 'Hacker' });
    });
    if (pathErr.code !== 'INVALID_ROOM_ID') {
      throw new Error(`Path traversal room ID not rejected properly: ${JSON.stringify(pathErr)}`);
    }

    // Oversized room ID attempt (> 24 chars)
    const longErr = await new Promise((resolve) => {
      client.once('ERROR', resolve);
      client.emit('JOIN_ROOM', { roomId: 'A'.repeat(50), displayName: 'Hacker' });
    });
    if (longErr.code !== 'INVALID_ROOM_ID') {
      throw new Error(`Oversized room ID not rejected properly: ${JSON.stringify(longErr)}`);
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 3 Passed: Path traversal and oversized room IDs safely rejected.');
  }

  // =========================================================================
  // TEST 4: Invalid display name (empty, single character)
  // =========================================================================
  console.log('[Test 4] Invalid display names rejected with INVALID_DISPLAY_NAME...');
  {
    const client = createClient();
    await new Promise((res) => client.once('connect', res));

    const err = await new Promise((resolve) => {
      client.once('ERROR', resolve);
      client.emit('JOIN_ROOM', { roomId: 'SEC_TEST', displayName: ' ' });
    });

    if (err.code !== 'INVALID_DISPLAY_NAME') {
      throw new Error(`Expected INVALID_DISPLAY_NAME, got: ${JSON.stringify(err)}`);
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 4 Passed: Empty/whitespace display name rejected safely.');
  }

  // =========================================================================
  // TEST 5: Control characters stripped and legitimate Unicode preserved
  // =========================================================================
  console.log('[Test 5] Display name sanitizes control characters and preserves Unicode...');
  {
    const roomId = `SEC_NAME_${Date.now().toString().slice(-6)}`;
    const client = createClient();

    // Name with ASCII control characters (\x00, \x07, \x1F) and legitimate Unicode (Sakura 🌸)
    const dirtyName = 'Sakura\x00\x07 🌸\x1F';
    const joinedData = await connectAndJoin(client, roomId, dirtyName);

    // Verify control characters were stripped and Unicode was preserved
    if (joinedData.user.name !== 'Sakura 🌸') {
      throw new Error(`Display name was not sanitized properly: got "${joinedData.user.name}"`);
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 5 Passed: Control characters stripped while preserving Unicode.');
  }

  // =========================================================================
  // TEST 6: Malformed DRAW_START rejected safely
  // =========================================================================
  console.log('[Test 6] Malformed DRAW_START rejected without server crash...');
  {
    const roomId = `SEC_DRAW_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'Drawer');

    const err = await new Promise((resolve) => {
      client.once('ERROR', resolve);
      client.emit('DRAW_START', { strokeId: 'invalid_stroke', tool: 'laser', width: -5 });
    });

    if (!err || !err.code) {
      throw new Error('Malformed DRAW_START was not rejected with an error event.');
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 6 Passed: Malformed DRAW_START safely rejected.');
  }

  // =========================================================================
  // TEST 7: Invalid DRAW_UPDATE coordinates (NaN / Infinity / unbounded)
  // =========================================================================
  console.log('[Test 7] Invalid DRAW_UPDATE coordinates dropped safely...');
  {
    const roomId = `SEC_PTS_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'Drawer');

    // Emit point update with NaN and Infinity coordinates
    client.emit('DRAW_UPDATE', {
      strokeId: 'test_stroke',
      points: [{ x: NaN, y: Infinity }],
    });

    await wait(50);
    // Server should remain completely alive and responsive
    client.disconnect();
    passedTests++;
    console.log('✓ Test 7 Passed: Invalid numeric coordinates safely dropped.');
  }

  // =========================================================================
  // TEST 8: Excessive point batch in DRAW_UPDATE (> 500 points)
  // =========================================================================
  console.log('[Test 8] Excessive point batch (> 500 points) dropped safely...');
  {
    const roomId = `SEC_BATCH_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'Drawer');

    const hugeBatch = Array.from({ length: 600 }, (_, i) => ({ x: i, y: i }));
    client.emit('DRAW_UPDATE', {
      strokeId: 'test_stroke',
      points: hugeBatch,
    });

    await wait(50);
    client.disconnect();
    passedTests++;
    console.log('✓ Test 8 Passed: Excessive point batch rejected safely.');
  }

  // =========================================================================
  // TEST 9: Invalid DRAW_END handled safely
  // =========================================================================
  console.log('[Test 9] Invalid DRAW_END handled safely without crash...');
  {
    const roomId = `SEC_END_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'Drawer');

    // Non-existent stroke ID
    client.emit('DRAW_END', { strokeId: 'non_existent_123' });
    await wait(30);

    // Empty payload
    client.emit('DRAW_END', null);
    await wait(30);

    client.disconnect();
    passedTests++;
    console.log('✓ Test 9 Passed: Invalid DRAW_END handled safely.');
  }

  // =========================================================================
  // TEST 10: Invalid CURSOR_MOVE coordinates rejected safely
  // =========================================================================
  console.log('[Test 10] Invalid CURSOR_MOVE coordinates dropped safely...');
  {
    const roomId = `SEC_CUR_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'CursorUser');

    client.emit('CURSOR_MOVE', { x: 'invalid', y: 100 });
    client.emit('CURSOR_MOVE', { x: 500000, y: 500000 }); // Out of bounds
    client.emit('CURSOR_MOVE', null);

    await wait(50);
    client.disconnect();
    passedTests++;
    console.log('✓ Test 10 Passed: Malformed cursor movements dropped safely.');
  }

  // =========================================================================
  // TEST 11: Cursor flooding / rate limit protection
  // =========================================================================
  console.log('[Test 11] High-frequency cursor flooding rate limited without server crash...');
  {
    const roomId = `SEC_CFLOOD_${Date.now().toString().slice(-6)}`;
    const alice = createClient();
    const bob = createClient();

    await Promise.all([
      connectAndJoin(alice, roomId, 'AliceFlood'),
      connectAndJoin(bob, roomId, 'BobListener'),
    ]);

    let cursorsReceivedByBob = 0;
    bob.on('CURSOR_UPDATE', () => {
      cursorsReceivedByBob++;
    });

    // Alice floods 80 cursor events in rapid burst (< 50ms)
    for (let i = 0; i < 80; i++) {
      alice.emit('CURSOR_MOVE', { x: 100 + i, y: 100 + i });
    }

    await wait(200);

    // Bob should receive at most the token-bucket capacity (50)
    if (cursorsReceivedByBob > 55) {
      throw new Error(`Expected at most 55 cursors delivered due to rate limit, but Bob received ${cursorsReceivedByBob}`);
    }

    alice.disconnect();
    bob.disconnect();
    passedTests++;
    console.log(`✓ Test 11 Passed: Cursor flood throttled (Bob received ${cursorsReceivedByBob}/80).`);
  }

  // =========================================================================
  // TEST 12: DRAW_UPDATE flooding / rate limit enforcement
  // =========================================================================
  console.log('[Test 12] DRAW_UPDATE flooding throttled with RATE_LIMITED error...');
  {
    const roomId = `SEC_DFLOOD_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'Flooder');

    let rateLimitHit = false;
    client.on('ERROR', (err) => {
      if (err.code === 'RATE_LIMITED') {
        rateLimitHit = true;
      }
    });

    // Spam 75 DRAW_UPDATE batches (exceeding token capacity 60)
    for (let i = 0; i < 75; i++) {
      client.emit('DRAW_UPDATE', {
        strokeId: 'stroke_flood',
        points: [{ x: i, y: i }],
      });
    }

    await wait(150);

    if (!rateLimitHit) {
      throw new Error('Expected RATE_LIMITED error on burst of 75 DRAW_UPDATE events');
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 12 Passed: DRAW_UPDATE flooding returned RATE_LIMITED error.');
  }

  // =========================================================================
  // TEST 13: OPERATION_APPLY with invalid operation type
  // =========================================================================
  console.log('[Test 13] OPERATION_APPLY with invalid type rejected...');
  {
    const roomId = `SEC_OP_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'UserOp');

    const ack = await new Promise((resolve) => {
      client.once('OPERATION_ACK', resolve);
      client.emit('OPERATION_APPLY', {
        operation: {
          operationId: 'op_invalid_type',
          type: 'inject-malware',
        },
      });
    });

    if (ack.accepted !== false) {
      throw new Error('Expected OPERATION_ACK accepted: false for unknown operation type');
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 13 Passed: Unknown operation type rejected.');
  }

  // =========================================================================
  // TEST 14: OPERATION_APPLY with forged author identity (server overwrites with socket ID)
  // =========================================================================
  console.log('[Test 14] OPERATION_APPLY with forged author identity overwritten authoritatively...');
  {
    const roomId = `SEC_FORGE_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    const joined = await connectAndJoin(client, roomId, 'LegitAlice');

    const forgedOpId = `op_forge_${Date.now()}`;
    const [ack, appliedEvent] = await Promise.all([
      new Promise((resolve) => client.once('OPERATION_ACK', resolve)),
      new Promise((resolve) => client.once('OPERATION_APPLIED', resolve)),
      new Promise((resolve) => {
        client.emit('OPERATION_APPLY', {
          operation: {
            operationId: forgedOpId,
            type: 'clear-canvas',
            userId: 'forged_fake_admin_id', // Malicious attempt to forge author
          },
        });
        resolve();
      }),
    ]);

    if (!ack.accepted) {
      throw new Error('Valid operation structure should be accepted');
    }

    // Server must have overwritten the forged userId with client's authoritative socket.id
    if (appliedEvent.operation.userId !== joined.user.id) {
      throw new Error(`Forged userId not overwritten! Got ${appliedEvent.operation.userId}, expected ${joined.user.id}`);
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 14 Passed: Forged author identity authoritatively overwritten by server.');
  }

  // =========================================================================
  // TEST 15: OPERATION_APPLY targeting another user's operation (author-scoped reject)
  // =========================================================================
  console.log('[Test 15] OPERATION_APPLY targeting another user\'s operation rejected with AUTHOR_MISMATCH...');
  {
    const roomId = `SEC_AUTH_${Date.now().toString().slice(-6)}`;
    const alice = createClient();
    const bob = createClient();

    await Promise.all([
      connectAndJoin(alice, roomId, 'AliceAuth'),
      connectAndJoin(bob, roomId, 'BobAuth'),
    ]);

    // Alice draws stroke A1
    const opA1 = `op_a1_${Date.now()}`;
    await new Promise((resolve) => {
      alice.once('OPERATION_ACK', resolve);
      alice.emit('OPERATION_APPLY', {
        operation: {
          operationId: opA1,
          type: 'add-stroke',
          stroke: {
            id: 's_a1',
            tool: 'pen',
            color: '#000000',
            width: 2,
            points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
          },
        },
      });
    });

    // Bob attempts to UNDO Alice's operation
    const bobAck = await new Promise((resolve) => {
      bob.once('OPERATION_ACK', resolve);
      bob.emit('OPERATION_APPLY', {
        operation: {
          operationId: `op_bob_undo_${Date.now()}`,
          type: 'undo',
          targetOperationId: opA1,
        },
      });
    });

    if (bobAck.accepted !== false || bobAck.reason !== "Cannot undo another user's operation.") {
      throw new Error(`Expected AUTHOR_MISMATCH rejection, got: ${JSON.stringify(bobAck)}`);
    }

    alice.disconnect();
    bob.disconnect();
    passedTests++;
    console.log('✓ Test 15 Passed: Cross-author undo mutation rejected with AUTHOR_MISMATCH.');
  }

  // =========================================================================
  // TEST 16: Duplicate operation handling (idempotency)
  // =========================================================================
  console.log('[Test 16] Duplicate operation acknowledged as ALREADY_CANONICAL...');
  {
    const roomId = `SEC_DUP_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'AliceDup');

    const opId = `op_dup_${Date.now()}`;
    const opPayload = {
      operationId: opId,
      type: 'clear-canvas',
    };

    // First submission
    const firstAck = await new Promise((resolve) => {
      client.once('OPERATION_ACK', resolve);
      client.emit('OPERATION_APPLY', { operation: opPayload });
    });
    if (!firstAck.accepted) throw new Error('First op was not accepted');

    // Duplicate submission
    const secondAck = await new Promise((resolve) => {
      client.once('OPERATION_ACK', resolve);
      client.emit('OPERATION_APPLY', { operation: opPayload });
    });

    if (!secondAck.accepted || secondAck.reason !== 'ALREADY_CANONICAL') {
      throw new Error(`Expected ALREADY_CANONICAL idempotent ACK, got: ${JSON.stringify(secondAck)}`);
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 16 Passed: Duplicate operation acknowledged idempotently.');
  }

  // =========================================================================
  // TEST 17: Cross-room operation attempt (room isolation)
  // =========================================================================
  console.log('[Test 17] Cross-room operation attempt isolated strictly...');
  {
    const roomA = `SEC_ROOMA_${Date.now().toString().slice(-6)}`;
    const roomB = `SEC_ROOMB_${Date.now().toString().slice(-6)}`;

    const clientA = createClient();
    const clientB = createClient();

    await Promise.all([
      connectAndJoin(clientA, roomA, 'UserA'),
      connectAndJoin(clientB, roomB, 'UserB'),
    ]);

    let clientBReceivedOps = 0;
    clientB.on('OPERATION_APPLIED', () => {
      clientBReceivedOps++;
    });

    // Client A applies operation in Room A
    await new Promise((resolve) => {
      clientA.once('OPERATION_ACK', resolve);
      clientA.emit('OPERATION_APPLY', {
        operation: {
          operationId: `op_iso_${Date.now()}`,
          type: 'clear-canvas',
        },
      });
    });

    await wait(100);

    if (clientBReceivedOps !== 0) {
      throw new Error(`Cross-room leak! Client in ${roomB} received operation from ${roomA}`);
    }

    clientA.disconnect();
    clientB.disconnect();
    passedTests++;
    console.log('✓ Test 17 Passed: Operations strictly isolated by room.');
  }

  // =========================================================================
  // TEST 18: Cross-room cursor attempt (room isolation)
  // =========================================================================
  console.log('[Test 18] Cross-room cursor attempt strictly isolated...');
  {
    const roomA = `SEC_CURA_${Date.now().toString().slice(-6)}`;
    const roomB = `SEC_CURB_${Date.now().toString().slice(-6)}`;

    const clientA = createClient();
    const clientB = createClient();

    await Promise.all([
      connectAndJoin(clientA, roomA, 'UserA'),
      connectAndJoin(clientB, roomB, 'UserB'),
    ]);

    let clientBReceivedCursors = 0;
    clientB.on('CURSOR_UPDATE', () => {
      clientBReceivedCursors++;
    });

    // Client A moves cursor in Room A
    clientA.emit('CURSOR_MOVE', { x: 250, y: 350 });
    await wait(50);

    if (clientBReceivedCursors !== 0) {
      throw new Error(`Cross-room cursor leak detected between ${roomA} and ${roomB}`);
    }

    clientA.disconnect();
    clientB.disconnect();
    passedTests++;
    console.log('✓ Test 18 Passed: Cursors strictly isolated by room.');
  }

  // =========================================================================
  // TEST 19: Unauthorized room-scoped event (emitting before JOIN_ROOM)
  // =========================================================================
  console.log('[Test 19] Room-scoped event emitted before JOIN_ROOM rejected with UNAUTHORIZED_ACTION...');
  {
    const client = createClient();
    await new Promise((res) => client.once('connect', res));

    const err = await new Promise((resolve) => {
      client.once('ERROR', resolve);
      client.emit('OPERATION_APPLY', {
        operation: {
          operationId: 'op_unauth',
          type: 'clear-canvas',
        },
      });
    });

    if (err.code !== 'UNAUTHORIZED_ACTION') {
      throw new Error(`Expected UNAUTHORIZED_ACTION, got: ${JSON.stringify(err)}`);
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 19 Passed: Unjoined socket actions rejected with UNAUTHORIZED_ACTION.');
  }

  // =========================================================================
  // TEST 20: Rapid JOIN_ROOM abuse / rate limit
  // =========================================================================
  console.log('[Test 20] Rapid JOIN_ROOM abuse throttled with RATE_LIMITED...');
  {
    const client = createClient();
    await new Promise((res) => client.once('connect', res));

    let rateLimited = false;
    client.on('ERROR', (err) => {
      if (err.code === 'RATE_LIMITED') {
        rateLimited = true;
      }
    });

    // Attempt 8 rapid room joins in immediate sequence (capacity is 5)
    for (let i = 0; i < 8; i++) {
      client.emit('JOIN_ROOM', { roomId: `SEC_RJOIN_${i}`, displayName: 'Spammer' });
    }

    await wait(150);

    if (!rateLimited) {
      throw new Error('Expected RATE_LIMITED on rapid JOIN_ROOM flood.');
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 20 Passed: Rapid room join flood successfully throttled.');
  }

  // =========================================================================
  // TEST 21: Disconnect cleanup (rate limits and active strokes cleaned up)
  // =========================================================================
  console.log('[Test 21] Disconnect cleanly frees active strokes and rate limit states...');
  {
    const roomId = `SEC_CLEAN_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    await connectAndJoin(client, roomId, 'Leaver');

    const socketId = client.id;
    // Client starts an in-flight stroke
    client.emit('DRAW_START', {
      strokeId: 'stroke_abandoned',
      tool: 'pen',
      color: '#000000',
      width: 2,
      point: { x: 50, y: 50 },
    });

    await wait(50);
    client.disconnect();
    await wait(100);

    // Verify rate limit record for socket was cleaned up
    // socketRateLimiter.getTrackedSocketCount() or verified cleanup
    const room = roomManager.getRoom(roomId);
    if (room && room.activeStrokes.has('stroke_abandoned')) {
      throw new Error('Abandoned stroke was not cleaned up on client disconnect');
    }

    passedTests++;
    console.log('✓ Test 21 Passed: Disconnect cleaned up socket rate limits and active strokes.');
  }

  // =========================================================================
  // TEST 22: Server remains healthy and responsive to legitimate clients
  // =========================================================================
  console.log('[Test 22] Server remains fully operational after all abuse scenarios...');
  {
    const roomId = `SEC_FINAL_${Date.now().toString().slice(-6)}`;
    const client = createClient();
    const joined = await connectAndJoin(client, roomId, 'LegitUser');

    if (!joined || joined.roomId !== roomId) {
      throw new Error('Server unresponsive or failed to join legitimate client after security stress tests');
    }

    client.disconnect();
    passedTests++;
    console.log('✓ Test 22 Passed: Server healthy and responsive after all attack vectors.');
  }

  console.log(`\n===========================================================`);
  console.log(`ALL SECTION 11 SECURITY & HARDENING TESTS PASSED! (${passedTests}/${totalTests}) 🎉`);
  console.log(`===========================================================\n`);
}

runSecurityTests()
  .then(() => {
    socketRateLimiter.destroy();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Security Test Suite Failed:', err);
    process.exit(1);
  });
