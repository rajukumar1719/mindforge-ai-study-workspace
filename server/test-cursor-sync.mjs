import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCursorSyncTests() {
  console.log('=== STARTING SECTION 7 LIVE CURSOR SYNCHRONIZATION TESTS ===\n');

  // Connect Client A (Alice in ROOM_CURSOR)
  const clientA = io(SERVER_URL, { transports: ['websocket'] });
  // Connect Client B (Bob in ROOM_CURSOR)
  const clientB = io(SERVER_URL, { transports: ['websocket'] });
  // Connect Client C (Charlie in ROOM_CURSOR_OTHER)
  const clientC = io(SERVER_URL, { transports: ['websocket'] });

  await Promise.all([
    new Promise((res) => clientA.on('connect', res)),
    new Promise((res) => clientB.on('connect', res)),
    new Promise((res) => clientC.on('connect', res)),
  ]);

  let aliceUserId = '';
  let bobUserId = '';

  clientA.on('ROOM_JOINED', (data) => {
    aliceUserId = data.user.id;
  });
  clientB.on('ROOM_JOINED', (data) => {
    bobUserId = data.user.id;
  });

  clientA.emit('JOIN_ROOM', { roomId: 'ROOM_CURSOR', displayName: 'Alice' });
  clientB.emit('JOIN_ROOM', { roomId: 'ROOM_CURSOR', displayName: 'Bob' });
  clientC.emit('JOIN_ROOM', { roomId: 'ROOM_CURSOR_OTHER', displayName: 'Charlie' });
  await wait(300);

  console.log(`[Setup] Alice (${aliceUserId}) & Bob (${bobUserId}) in ROOM_CURSOR, Charlie in ROOM_CURSOR_OTHER.\n`);

  // Test 1: Cursor movement broadcast from Alice to Bob
  console.log('[Test 1] Alice moves cursor; Bob receives CURSOR_UPDATE with coordinates and timestamp...');
  let bobReceivedCursor = null;
  clientB.on('CURSOR_UPDATE', (data) => {
    bobReceivedCursor = data;
  });

  clientA.emit('CURSOR_MOVE', { x: 150.5, y: 280.25 });
  await wait(100);

  if (!bobReceivedCursor) {
    throw new Error('Test 1 Failed: Bob received no CURSOR_UPDATE event');
  }
  if (bobReceivedCursor.userId !== aliceUserId) {
    throw new Error(`Test 1 Failed: Expected userId ${aliceUserId}, got ${bobReceivedCursor.userId}`);
  }
  if (bobReceivedCursor.x !== 150.5 || bobReceivedCursor.y !== 280.25) {
    throw new Error(`Test 1 Failed: Expected (150.5, 280.25), got (${bobReceivedCursor.x}, ${bobReceivedCursor.y})`);
  }
  if (typeof bobReceivedCursor.timestamp !== 'number' || bobReceivedCursor.timestamp <= 0) {
    throw new Error(`Test 1 Failed: Invalid timestamp ${bobReceivedCursor.timestamp}`);
  }
  console.log('✓ Test 1 Passed: Bob received accurate CURSOR_UPDATE from Alice.\n');

  // Test 2: No sender echo (Alice should NOT receive her own cursor update)
  console.log('[Test 2] Verify no sender echo (Alice does not receive CURSOR_UPDATE for her own movement)...');
  let aliceReceivedCursor = null;
  clientA.on('CURSOR_UPDATE', (data) => {
    aliceReceivedCursor = data;
  });

  clientA.emit('CURSOR_MOVE', { x: 200, y: 300 });
  await wait(100);

  if (aliceReceivedCursor) {
    throw new Error(`Test 2 Failed: Alice received her own cursor echo: ${JSON.stringify(aliceReceivedCursor)}`);
  }
  console.log('✓ Test 2 Passed: Alice did not receive echo of her own cursor move.\n');

  // Test 3: Room isolation (Charlie in ROOM_CURSOR_OTHER must not receive updates)
  console.log('[Test 3] Verify room isolation (Charlie in different room receives zero cursor updates)...');
  let charlieReceivedCursor = null;
  clientC.on('CURSOR_UPDATE', (data) => {
    charlieReceivedCursor = data;
  });

  clientA.emit('CURSOR_MOVE', { x: 350, y: 450 });
  await wait(100);

  if (charlieReceivedCursor) {
    throw new Error(`Test 3 Failed: Charlie in other room received cursor update: ${JSON.stringify(charlieReceivedCursor)}`);
  }
  console.log('✓ Test 3 Passed: Cursor updates strictly isolated to room members.\n');

  // Test 4: Coordinate bounds and type validation
  console.log('[Test 4] Verify coordinate bounds and payload validation rejects malformed events...');
  let invalidCursorReceived = false;
  const tempListener = () => {
    invalidCursorReceived = true;
  };
  clientB.on('CURSOR_UPDATE', tempListener);

  // Negative x
  clientA.emit('CURSOR_MOVE', { x: -50, y: 100 });
  await wait(50);
  // Exceeds max boundary (100,000)
  clientA.emit('CURSOR_MOVE', { x: 150000, y: 100 });
  await wait(50);
  // NaN coordinates
  clientA.emit('CURSOR_MOVE', { x: NaN, y: 100 });
  await wait(50);
  // String coordinates
  clientA.emit('CURSOR_MOVE', { x: 'invalid', y: 100 });
  await wait(50);
  // Missing fields
  clientA.emit('CURSOR_MOVE', { x: 100 });
  await wait(50);

  clientB.off('CURSOR_UPDATE', tempListener);

  if (invalidCursorReceived) {
    throw new Error('Test 4 Failed: Server forwarded invalid/out-of-bounds cursor coordinates');
  }
  console.log('✓ Test 4 Passed: Server rejected all malformed and out-of-bounds cursor moves.\n');

  // Test 5: Bidirectional cursor tracking (Bob moves cursor, Alice receives)
  console.log('[Test 5] Bob moves cursor; Alice receives CURSOR_UPDATE...');
  let aliceReceivedBobCursor = null;
  clientA.on('CURSOR_UPDATE', (data) => {
    aliceReceivedBobCursor = data;
  });

  clientB.emit('CURSOR_MOVE', { x: 620.8, y: 412.3 });
  await wait(100);

  if (!aliceReceivedBobCursor) {
    throw new Error('Test 5 Failed: Alice did not receive Bob cursor update');
  }
  if (aliceReceivedBobCursor.userId !== bobUserId) {
    throw new Error(`Test 5 Failed: Expected userId ${bobUserId}, got ${aliceReceivedBobCursor.userId}`);
  }
  if (aliceReceivedBobCursor.x !== 620.8 || aliceReceivedBobCursor.y !== 412.3) {
    throw new Error(`Test 5 Failed: Expected (620.8, 412.3), got (${aliceReceivedBobCursor.x}, ${aliceReceivedBobCursor.y})`);
  }
  console.log('✓ Test 5 Passed: Alice successfully received Bob cursor position.\n');

  // Test 6: High-frequency rapid cursor stream handling
  console.log('[Test 6] Rapid cursor stream (simulating 30 updates/sec mouse movement)...');
  const streamUpdates = [];
  const streamListener = (data) => {
    streamUpdates.push(data);
  };
  clientB.on('CURSOR_UPDATE', streamListener);

  for (let i = 0; i < 10; i++) {
    clientA.emit('CURSOR_MOVE', { x: 100 + i * 5, y: 200 + i * 5 });
    await wait(10);
  }
  await wait(200);
  clientB.off('CURSOR_UPDATE', streamListener);

  if (streamUpdates.length !== 10) {
    throw new Error(`Test 6 Failed: Expected 10 rapid updates, received ${streamUpdates.length}`);
  }
  const lastUpdate = streamUpdates[streamUpdates.length - 1];
  if (lastUpdate.x !== 145 || lastUpdate.y !== 245) {
    throw new Error(`Test 6 Failed: Last point expected (145, 245), got (${lastUpdate.x}, ${lastUpdate.y})`);
  }
  console.log(`✓ Test 6 Passed: All 10 rapid cursor updates smoothly delivered.\n`);

  // Test 7: Disconnect cleanup notification
  console.log('[Test 7] Alice disconnects; Bob receives USER_LEFT with Alice userId for cursor cleanup...');
  let bobReceivedUserLeft = null;
  clientB.on('USER_LEFT', (data) => {
    bobReceivedUserLeft = data;
  });

  clientA.disconnect();
  await wait(200);

  if (!bobReceivedUserLeft || bobReceivedUserLeft.userId !== aliceUserId) {
    throw new Error(`Test 7 Failed: Bob did not receive USER_LEFT for Alice (${aliceUserId}), got ${JSON.stringify(bobReceivedUserLeft)}`);
  }
  console.log('✓ Test 7 Passed: Bob received USER_LEFT, triggering cursor removal.\n');

  clientB.disconnect();
  clientC.disconnect();

  console.log('====================================================');
  console.log('ALL SECTION 7 CURSOR SYNCHRONIZATION TESTS PASSED! 🎉');
  console.log('====================================================\n');
}

runCursorSyncTests().catch((err) => {
  console.error('\n❌ CURSOR TEST FAILED:', err);
  process.exit(1);
});
