import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('--- STARTING SECTION 5 REAL-TIME SOCKET TESTS ---');

  // Test 1: Connect Socket 1 (Alice in Room A)
  console.log('\n[Test 1] Socket 1 (Alice) connects to Room A...');
  const socket1 = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise((resolve, reject) => {
    socket1.on('connect', () => {
      console.log('  -> Socket 1 connected with ID:', socket1.id);
      resolve();
    });
    socket1.on('connect_error', reject);
  });

  let socket1Roster = [];
  socket1.on('ROOM_JOINED', (data) => {
    console.log('  -> Socket 1 received ROOM_JOINED:', data.roomId, data.user.name, 'Color:', data.user.color);
    socket1Roster = data.collaborators;
  });

  socket1.emit('JOIN_ROOM', { roomId: 'ROOM_A', displayName: 'Alice' });
  await wait(200);

  if (socket1Roster.length !== 1 || socket1Roster[0].name !== 'Alice') {
    throw new Error(`Test 1 Failed: Expected 1 user (Alice), got ${JSON.stringify(socket1Roster)}`);
  }
  console.log('  -> Test 1 PASSED: Socket 1 in Room A with Alice.');

  // Test 2: Connect Socket 2 (Bob in Room A)
  console.log('\n[Test 2] Socket 2 (Bob) connects to Room A...');
  const socket2 = io(SERVER_URL, { transports: ['websocket'] });

  let socket1ReceivedUserJoined = false;
  socket1.on('USER_JOINED', (data) => {
    console.log('  -> Socket 1 received USER_JOINED for:', data.user.name, 'Color:', data.user.color);
    socket1ReceivedUserJoined = true;
    socket1Roster.push(data.user);
  });

  let socket2Roster = [];
  socket2.on('ROOM_JOINED', (data) => {
    console.log('  -> Socket 2 received ROOM_JOINED with', data.collaborators.length, 'collaborators');
    socket2Roster = data.collaborators;
  });

  socket2.emit('JOIN_ROOM', { roomId: 'ROOM_A', displayName: 'Bob' });
  await wait(300);

  if (!socket1ReceivedUserJoined) {
    throw new Error('Test 2 Failed: Socket 1 never received USER_JOINED for Bob.');
  }
  if (socket2Roster.length !== 2) {
    throw new Error(`Test 2 Failed: Expected 2 users in Socket 2 roster, got ${socket2Roster.length}`);
  }
  if (socket1Roster[0].color === socket1Roster[1].color) {
    throw new Error('Test 2 Failed: Colors should be distinct between collaborators.');
  }
  console.log('  -> Test 2 PASSED: Real presence verified with distinct colors for Alice and Bob.');

  // Test 3: Connect Socket 3 (Charlie in Room B - Room Isolation)
  console.log('\n[Test 3] Socket 3 (Charlie) connects to Room B (Testing Room Isolation)...');
  const socket3 = io(SERVER_URL, { transports: ['websocket'] });

  let socket1GotUnrelatedEvent = false;
  socket1.on('USER_JOINED', (data) => {
    if (data.user.name === 'Charlie') {
      socket1GotUnrelatedEvent = true;
    }
  });

  let socket3Roster = [];
  socket3.on('ROOM_JOINED', (data) => {
    console.log('  -> Socket 3 received ROOM_JOINED for Room B with', data.collaborators.length, 'collaborators');
    socket3Roster = data.collaborators;
  });

  socket3.emit('JOIN_ROOM', { roomId: 'ROOM_B', displayName: 'Charlie' });
  await wait(300);

  if (socket1GotUnrelatedEvent) {
    throw new Error('Test 3 Failed: Room isolation broken! Room A received Charlie from Room B.');
  }
  if (socket3Roster.length !== 1 || socket3Roster[0].name !== 'Charlie') {
    throw new Error(`Test 3 Failed: Charlie roster incorrect: ${JSON.stringify(socket3Roster)}`);
  }
  console.log('  -> Test 3 PASSED: Room isolation strictly verified between Room A and Room B.');

  // Test 4: Disconnect Socket 2 (Bob leaves Room A)
  console.log('\n[Test 4] Disconnect Socket 2 (Bob) and verify USER_LEFT in Room A...');
  let socket1ReceivedUserLeft = false;
  socket1.on('USER_LEFT', (data) => {
    console.log('  -> Socket 1 received USER_LEFT for userId:', data.userId);
    socket1ReceivedUserLeft = true;
  });

  socket2.disconnect();
  await wait(300);

  if (!socket1ReceivedUserLeft) {
    throw new Error('Test 4 Failed: Socket 1 did not receive USER_LEFT when Bob disconnected.');
  }
  console.log('  -> Test 4 PASSED: Clean disconnect handling verified.');

  // Test 5: Validation Testing (Invalid Room ID, Empty Name, Bad Payload)
  console.log('\n[Test 5] Validation Testing for invalid payloads...');
  const socket4 = io(SERVER_URL, { transports: ['websocket'] });

  const errors = [];
  socket4.on('ERROR', (err) => {
    console.log('  -> Socket 4 received structured ERROR:', err.code, '-', err.message);
    errors.push(err.code);
  });

  // Invalid Room ID with special symbols
  socket4.emit('JOIN_ROOM', { roomId: 'INVALID$*#@', displayName: 'ValidName' });
  await wait(150);

  // Empty display name
  socket4.emit('JOIN_ROOM', { roomId: 'VALIDROOM', displayName: '   ' });
  await wait(150);

  // Overly long display name (> 30 chars)
  socket4.emit('JOIN_ROOM', { roomId: 'VALIDROOM', displayName: 'A'.repeat(50) });
  await wait(150);

  if (!errors.includes('INVALID_ROOM_ID') || !errors.includes('INVALID_DISPLAY_NAME')) {
    throw new Error(`Test 5 Failed: Expected validation errors not received: ${errors.join(', ')}`);
  }
  console.log('  -> Test 5 PASSED: Server-side validation properly rejects malformed payloads.');

  // Cleanup all sockets
  socket1.disconnect();
  socket3.disconnect();
  socket4.disconnect();

  console.log('\n--- ALL SECTION 5 TESTS PASSED SUCCESSFULLY! ---\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n*** TEST FAILED ***\n', err);
  process.exit(1);
});
