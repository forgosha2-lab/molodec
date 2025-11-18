const ws = new WebSocket('ws://localhost:8082');

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const circle = document.getElementById('circle');
const onlineCount = document.getElementById('online-count');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'online') {
        onlineCount.textContent = `${data.count} online`;
        if (data.count > 0) {
            circle.classList.add('spinning');
        } else {
            circle.classList.remove('spinning');
        }
    } else if (data.type === 'message') {
        // It's a chat message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.textContent = data.text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

ws.onclose = () => {
    console.log('Disconnected from WebSocket server');
};

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        ws.send(message);
        messageInput.value = '';
    }
}
