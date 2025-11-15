import { WebSocket } from 'ws';

console.log('Connecting to WebSocket server...');

const ws = new WebSocket('ws://localhost:3003/ws');

ws.on('open', function open() {
  console.log('Connected to WebSocket server');
  
  // Send a test message
  ws.send(JSON.stringify({ type: 'test', message: 'Hello from test client' }));
});

ws.on('message', function message(data) {
  console.log('Received message:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('Disconnected from WebSocket server');
});