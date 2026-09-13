import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDrawingSyncTests() {
  console.log('=== STARTING SECTION 6 DRAWING SYNCHRONIZATION TESTS ===\n');

  // Connect Client 1 (Alice in ROOM_TEST)
  const clientA = io(SERVER_URL, { transports: ['websocket'] });
  // Connect Client 2 (Bob in ROOM_TEST)
  const clientB = io(SERVER_URL, { transports: ['websocket'] });
  // Connect Client 3 (Charlie in ROOM_OTHER)
  const clientC = io(SERVER_URL, { transports: ['websocket'] });

  await Promise.all([
    new Promise((res) => clientA.on('connect', res)),
    new Promise((res) => clientB.on('connect', res)),
    new Promise((res) => clientC.on('connect', res)),
  ]);

  clientA.emit('JOIN_ROOM', { roomId: 'ROOM_TEST', displayName: 'Alice' });
  clientB.emit('JOIN_ROOM', { roomId: 'ROOM_TEST', displayName: 'Bob' });
  clientC.emit('JOIN_ROOM', { roomId: 'ROOM_OTHER', displayName: 'Charlie' });
  await wait(300);

  console.log('[Setup] Alice & Bob in ROOM_TEST, Charlie in ROOM_OTHER.\n');

  // Test 1: Pen stroke sync from Alice to Bob
  console.log('[Test 1] Alice draws pen stroke; Bob receives DRAW_START, DRAW_UPDATE, DRAW_END...');
  let bobReceivedStart = null;
  let bobReceivedPoints = [];
  let bobReceivedEnd = null;

  clientB.on('DRAW_START', (data) => {
    bobReceivedStart = data;
  });
  clientB.on('DRAW_UPDATE', (data) => {
    bobReceivedPoints.push(...data.points);
  });
  clientB.on('DRAW_END', (data) => {
    bobReceivedEnd = data;
  });

  const penStrokeId = 'stroke_alice_1';
  clientA.emit('DRAW_START', {
    strokeId: penStrokeId,
    tool: 'pen',
    color: '#ef4444',
    width: 4,
    point: { x: 10, y: 10 },
  });
  await wait(50);

  clientA.emit('DRAW_UPDATE', {
    strokeId: penStrokeId,
    points: [
      { x: 15, y: 15 },
      { x: 20, y: 20 },
      { x: 25, y: 25 },
    ],
  });
  await wait(50);

  clientA.emit('DRAW_END', { strokeId: penStrokeId });
  await wait(150);

  if (!bobReceivedStart || bobReceivedStart.strokeId !== penStrokeId || bobReceivedStart.tool !== 'pen') {
    throw new Error(`Test 1 Failed: Bob did not receive correct DRAW_START: ${JSON.stringify(bobReceivedStart)}`);
  }
  if (bobReceivedPoints.length !== 3) {
    throw new Error(`Test 1 Failed: Bob expected 3 batched points, got ${bobReceivedPoints.length}`);
  }
  if (!bobReceivedEnd || bobReceivedEnd.strokeId !== penStrokeId) {
    throw new Error(`Test 1 Failed: Bob did not receive DRAW_END for ${penStrokeId}`);
  }
  console.log('  -> PASS: Test 1: Pen stroke cleanly received and verified on Bob.');

  // Test 2: Reverse pen sync (Bob draws, Alice receives)
  console.log('\n[Test 2] Bob draws; Alice receives...');
  let aliceReceivedEnd = null;
  clientA.on('DRAW_END', (data) => {
    aliceReceivedEnd = data;
  });

  const bobStrokeId = 'stroke_bob_1';
  clientB.emit('DRAW_START', {
    strokeId: bobStrokeId,
    tool: 'pen',
    color: '#3b82f6',
    width: 6,
    point: { x: 50, y: 50 },
  });
  clientB.emit('DRAW_UPDATE', {
    strokeId: bobStrokeId,
    points: [{ x: 55, y: 55 }],
  });
  clientB.emit('DRAW_END', { strokeId: bobStrokeId });
  await wait(150);

  if (!aliceReceivedEnd || aliceReceivedEnd.strokeId !== bobStrokeId) {
    throw new Error('Test 2 Failed: Alice did not receive DRAW_END from Bob.');
  }
  console.log('  -> PASS: Test 2: Reverse stroke sync verified.');

  // Test 3: Highlighter Tool Sync
  console.log('\n[Test 3] Alice draws with highlighter; Bob verifies tool and properties...');
  let bobHighlighterStart = null;
  const hlListener = (data) => {
    if (data.tool === 'highlighter') {
      bobHighlighterStart = data;
    }
  };
  clientB.on('DRAW_START', hlListener);

  const hlStrokeId = 'stroke_alice_hl';
  clientA.emit('DRAW_START', {
    strokeId: hlStrokeId,
    tool: 'highlighter',
    color: '#eab308',
    width: 16,
    point: { x: 100, y: 100 },
  });
  clientA.emit('DRAW_END', { strokeId: hlStrokeId });
  await wait(150);

  if (!bobHighlighterStart || bobHighlighterStart.tool !== 'highlighter' || bobHighlighterStart.color !== '#eab308') {
    throw new Error('Test 3 Failed: Highlighter properties not transmitted properly.');
  }
  console.log('  -> PASS: Test 3: Highlighter tool correctly synchronized.');

  // Test 4: Stroke-Level Eraser Synchronization
  console.log('\n[Test 4] Alice erases penStrokeId; Bob receives ERASE_STROKES...');
  let bobReceivedErase = null;
  clientB.on('ERASE_STROKES', (data) => {
    bobReceivedErase = data;
  });

  const eraseOpId = 'op_erase_1';
  clientA.emit('ERASE_STROKES', {
    operationId: eraseOpId,
    strokeIds: [penStrokeId],
  });
  await wait(150);

  if (!bobReceivedErase || !bobReceivedErase.strokeIds.includes(penStrokeId)) {
    throw new Error('Test 4 Failed: Bob did not receive ERASE_STROKES for penStrokeId.');
  }
  console.log('  -> PASS: Test 4: Logical stroke-level erase verified.');

  // Test 5: Late-Join Initial State Synchronization (SYNC_STATE)
  console.log('\n[Test 5] Client Dave joins ROOM_TEST later and receives SYNC_STATE...');
  const clientDave = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise((res) => clientDave.on('connect', res));

  let daveReceivedSync = null;
  clientDave.on('SYNC_STATE', (data) => {
    daveReceivedSync = data;
  });

  clientDave.emit('JOIN_ROOM', { roomId: 'ROOM_TEST', displayName: 'Dave' });
  await wait(300);

  if (!daveReceivedSync || !Array.isArray(daveReceivedSync.strokes)) {
    throw new Error('Test 5 Failed: Dave did not receive SYNC_STATE.');
  }
  // Dave should receive bobStrokeId and hlStrokeId (penStrokeId was erased)
  const daveStrokeIds = daveReceivedSync.strokes.map((s) => s.id);
  if (daveStrokeIds.includes(penStrokeId)) {
    throw new Error('Test 5 Failed: SYNC_STATE includes erased stroke!');
  }
  if (!daveStrokeIds.includes(bobStrokeId) || !daveStrokeIds.includes(hlStrokeId)) {
    throw new Error(`Test 5 Failed: Expected [${bobStrokeId}, ${hlStrokeId}], got ${JSON.stringify(daveStrokeIds)}`);
  }
  console.log(`  -> PASS: Test 5: SYNC_STATE correctly hydrated Dave with ${daveStrokeIds.length} canonical strokes.`);

  // Test 6: Room Isolation
  console.log('\n[Test 6] Charlie draws in ROOM_OTHER; Alice & Bob in ROOM_TEST receive 0 events...');
  let aliceReceivedCharlieEvent = false;
  const charlieLeakCheck = (data) => {
    if (data.strokeId === 'stroke_charlie_1') {
      aliceReceivedCharlieEvent = true;
    }
  };
  clientA.on('DRAW_START', charlieLeakCheck);
  clientA.on('DRAW_END', charlieLeakCheck);

  clientC.emit('DRAW_START', {
    strokeId: 'stroke_charlie_1',
    tool: 'pen',
    color: '#10b981',
    width: 4,
    point: { x: 300, y: 300 },
  });
  clientC.emit('DRAW_END', { strokeId: 'stroke_charlie_1' });
  await wait(200);

  if (aliceReceivedCharlieEvent) {
    throw new Error('Test 6 Failed: Room isolation broken! Alice received drawing from Charlie in ROOM_OTHER.');
  }
  console.log('  -> PASS: Test 6: Room drawing isolation strictly verified.');

  // Test 7: Disconnect mid-stroke
  console.log('\n[Test 7] Incomplete stroke on disconnect cleaned up without ghost strokes...');
  const clientGhost = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise((res) => clientGhost.on('connect', res));
  clientGhost.emit('JOIN_ROOM', { roomId: 'ROOM_TEST', displayName: 'Ghost' });
  await wait(200);

  let bobReceivedGhostEnd = false;
  clientB.on('DRAW_END', (data) => {
    if (data.strokeId === 'stroke_ghost_in_flight') {
      bobReceivedGhostEnd = true;
    }
  });

  clientGhost.emit('DRAW_START', {
    strokeId: 'stroke_ghost_in_flight',
    tool: 'pen',
    color: '#6366f1',
    width: 4,
    point: { x: 400, y: 400 },
  });
  await wait(50);
  // Disconnect mid-stroke abruptly
  clientGhost.disconnect();
  await wait(300);

  if (!bobReceivedGhostEnd) {
    throw new Error('Test 7 Failed: Room peers did not receive DRAW_END cleanup when Ghost disconnected.');
  }
  console.log('  -> PASS: Test 7: Disconnect mid-stroke properly cleaned up.');

  // Test 8: Malformed Payload Validation Handling
  console.log('\n[Test 8] Server validation rejects invalid payload without crashing...');
  let validationError = null;
  clientA.on('ERROR', (err) => {
    validationError = err;
  });

  // Emit malformed DRAW_START with invalid tool and NaN coordinates
  clientA.emit('DRAW_START', {
    strokeId: '',
    tool: 'laser',
    color: 'not-a-color',
    width: -50,
    point: { x: 'abc', y: null },
  });
  await wait(200);

  if (!validationError) {
    throw new Error('Test 8 Failed: Malformed DRAW_START was not rejected with ERROR.');
  }
  console.log(`  -> PASS: Test 8: Server safely caught invalid payload with code "${validationError.code}".`);

  // Clean up
  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();
  clientDave.disconnect();

  console.log('\n=== ALL SECTION 6 DRAWING SYNCHRONIZATION TESTS PASSED ===\n');
}

runDrawingSyncTests().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
