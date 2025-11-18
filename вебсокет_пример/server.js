const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = 3002;

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8082 });

let onlineUsers = 0;

wss.on('connection', (ws) => {
    onlineUsers++;
    console.log(`User connected. Online users: ${onlineUsers}`);

    // Send current online count to all clients
    broadcastOnlineCount();

    ws.on('message', (message) => {
        console.log('Received:', message.toString());

        // Broadcast message to all connected clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', text: message.toString() }));
            }
        });
    });

    ws.on('close', () => {
        onlineUsers--;
        console.log(`User disconnected. Online users: ${onlineUsers}`);
        broadcastOnlineCount();
    });
});

function broadcastOnlineCount() {
    const data = JSON.stringify({ type: 'online', count: onlineUsers });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// Start HTTP server
app.listen(port, () => {
    console.log(`HTTP server running at http://localhost:${port}`);
    console.log(`WebSocket server running at ws://localhost:8082`);
});
