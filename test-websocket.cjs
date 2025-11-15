const { WebSocket } = require('ws');

console.log('Connecting to WebSocket server at ws://localhost:3003/ws...');

const ws = new WebSocket('ws://localhost:3003/ws');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server');
  
  // Send a test message
  const testMessage = JSON.stringify({ type: 'test', message: 'Hello from test client' });
  console.log('📤 Sending test message:', testMessage);
  ws.send(testMessage);
});

ws.on('message', function message(data) {
  console.log('📥 Received message:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🚪 Disconnected from WebSocket server');
  console.log('   Code:', code);
  if (reason) {
    console.log('   Reason:', reason.toString());
  }
});

// Add timeout to detect if connection is not established
setTimeout(() => {
  if (ws.readyState === WebSocket.CONNECTING) {
    console.log('⏳ Still connecting...');
  } else if (ws.readyState === WebSocket.OPEN) {
    console.log('✅ Connection is open');
  } else if (ws.readyState === WebSocket.CLOSED) {
    console.log('🔒 Connection is closed');
  } else if (ws.readyState === WebSocket.CLOSING) {
    console.log('🔄 Connection is closing');
  }
}, 3000);