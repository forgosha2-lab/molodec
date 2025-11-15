import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket test server');
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    ws.send('Echo: ' + message.toString());
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
  
  ws.send(JSON.stringify({ type: 'connected', message: 'Hello from test server' }));
});

const PORT = 3004;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test WebSocket server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});