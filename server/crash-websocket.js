import { WebSocketServer } from 'ws';
import { initializeDb } from './db-adapter.js';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database setup
const dbPath = process.env.DB_PATH || path.join(homedir(), 'pyplse_game_hub.db');
let db;

// Initialize database
async function initializeDatabase() {
  try {
    console.log('Initializing crash game database...');
    db = await initializeDb(dbPath);
    if (!db) {
      throw new Error('Database initialization returned null');
    }
    
    // Create crash game history table
    db.exec(`CREATE TABLE IF NOT EXISTS crash_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crash_point REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create player balances table (if not exists)
    db.exec(`CREATE TABLE IF NOT EXISTS player_balances (
      player_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 1000
    )`);
    
    console.log('Crash game database initialized successfully');
  } catch (error) {
    console.error('FATAL: Error initializing crash game database:', error);
    throw error;
  }
}

// Game state
let gameState = {
  status: 'waiting', // waiting, running, crashed
  multiplier: 1.0,
  crashPoint: 0,
  startTime: 0,
  bets: []
};

let gameInterval = null;
let countdownInterval = null;
let countdown = 12; // 12 second countdown

// Store connections
const connections = new Map();

// History of crash points
let crashHistory = [];

// Load crash history from database
function loadCrashHistory() {
  try {
    const stmt = db.prepare('SELECT crash_point FROM crash_history ORDER BY timestamp DESC LIMIT 50');
    crashHistory = stmt.all().map(row => row.crash_point);
    console.log(`Loaded ${crashHistory.length} crash history points`);
  } catch (error) {
    console.error('Error loading crash history:', error);
  }
}

// Save crash point to database
function saveCrashPoint(point) {
  try {
    const stmt = db.prepare('INSERT INTO crash_history (crash_point) VALUES (?)');
    stmt.run(point);
  } catch (error) {
    console.error('Error saving crash point:', error);
  }
}

// Get player balance
function getPlayerBalance(playerId) {
  try {
    const stmt = db.prepare('SELECT balance FROM player_balances WHERE player_id = ?');
    const row = stmt.get(playerId);
    if (row) {
      return row.balance;
    } else {
      // Create new player with default balance
      const insertStmt = db.prepare('INSERT INTO player_balances (player_id, balance) VALUES (?, 1000)');
      insertStmt.run(playerId);
      return 1000;
    }
  } catch (error) {
    console.error('Error getting player balance:', error);
    return 1000; // Default balance
  }
}

// Update player balance
function updatePlayerBalance(playerId, amount) {
  try {
    const stmt = db.prepare('UPDATE player_balances SET balance = balance + ? WHERE player_id = ?');
    stmt.run(amount, playerId);
  } catch (error) {
    console.error('Error updating player balance:', error);
  }
}

// Broadcast message to all connected clients
function broadcast(message, excludePlayerId = null) {
  const data = JSON.stringify(message);
  connections.forEach((conn, playerId) => {
    if (playerId !== excludePlayerId && conn.readyState === 1) { // 1 = OPEN
      conn.send(data);
    }
  });
}

// Start the game countdown
function startCountdown() {
  console.log('Starting countdown...');
  
  gameState.status = 'waiting';
  gameState.multiplier = 1.0;
  gameState.crashPoint = 0;
  gameState.startTime = 0;
  gameState.bets = [];
  
  countdown = 12;
  
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Notify all clients about the countdown
  broadcast({ type: 'countdown', countdown });
  
  countdownInterval = setInterval(() => {
    console.log(`Countdown: ${countdown}`);
    broadcast({ type: 'countdown', countdown });
    
    if (countdown <= 0) {
      startGame();
    } else {
      countdown--;
    }
  }, 1000);
}

// Start the game
function startGame() {
  console.log('Starting game...');
  
  if (countdownInterval) clearInterval(countdownInterval);
  
  gameState.status = 'running';
  gameState.multiplier = 1.0;
  gameState.crashPoint = Math.random() * 10 + 1.01; // Random crash point between 1.01 and 11.01
  gameState.startTime = Date.now();
  
  // Save crash point to history
  crashHistory.unshift(gameState.crashPoint);
  if (crashHistory.length > 50) {
    crashHistory = crashHistory.slice(0, 50);
  }
  saveCrashPoint(gameState.crashPoint);
  
  broadcast({ 
    type: 'gameStart', 
    crashPoint: gameState.crashPoint 
  });
  
  // Start game loop
  if (gameInterval) clearInterval(gameInterval);
  
  gameInterval = setInterval(() => {
    const elapsed = Date.now() - gameState.startTime;
    const newMultiplier = Math.pow(Math.E, elapsed / 3000);
    
    gameState.multiplier = newMultiplier;
    
    broadcast({ 
      type: 'gameUpdate', 
      multiplier: gameState.multiplier 
    });
    
    // Check if game should crash
    if (gameState.multiplier >= gameState.crashPoint) {
      gameState.status = 'crashed';
      gameState.multiplier = gameState.crashPoint;
      
      broadcast({ 
        type: 'gameCrash', 
        multiplier: gameState.multiplier 
      });
      
      // Process bets - players who haven't cashed out lose
      gameState.bets.forEach(bet => {
        if (!bet.cashoutMultiplier) {
          // Player lost - no change to balance
          const conn = connections.get(bet.playerId);
          if (conn && conn.readyState === 1) {
            conn.send(JSON.stringify({
              type: 'betLost',
              betId: bet.id
            }));
          }
        }
      });
      
      if (gameInterval) clearInterval(gameInterval);
      
      // Start next round after 3 seconds
      setTimeout(() => {
        startCountdown();
      }, 3000);
    }
  }, 50);
}

// Handle WebSocket connection
function handleConnection(ws) {
  // Generate player ID
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const playerName = `Player${Math.floor(Math.random() * 9999)}`;
  
  // Store connection
  connections.set(playerId, ws);
  
  console.log(`Player ${playerName} (${playerId}) connected`);
  
  // Send initial state
  const balance = getPlayerBalance(playerId);
  
  ws.send(JSON.stringify({
    type: 'connected',
    playerId,
    playerName,
    balance,
    gameState,
    crashHistory
  }));
  
  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, playerId, playerName, message);
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  // Handle disconnect
  ws.on('close', () => {
    console.log(`Player ${playerName} (${playerId}) disconnected`);
    connections.delete(playerId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for player ${playerName} (${playerId}):`, error);
    connections.delete(playerId);
  });
}

// Handle WebSocket messages
function handleMessage(ws, playerId, playerName, message) {
  switch (message.type) {
    case 'placeBet':
      handlePlaceBet(ws, playerId, playerName, message.data);
      break;
      
    case 'cashout':
      handleCashout(ws, playerId);
      break;
      
    case 'getPlayerBalance':
      const balance = getPlayerBalance(playerId);
      ws.send(JSON.stringify({ type: 'balanceUpdate', balance }));
      break;
      
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

// Handle placing a bet
function handlePlaceBet(ws, playerId, playerName, data) {
  if (gameState.status !== 'waiting') {
    ws.send(JSON.stringify({ type: 'error', message: 'Cannot place bet - game is not waiting' }));
    return;
  }
  
  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid bet amount' }));
    return;
  }
  
  const balance = getPlayerBalance(playerId);
  if (balance < amount) {
    ws.send(JSON.stringify({ type: 'error', message: 'Insufficient balance' }));
    return;
  }
  
  // Deduct bet amount from balance
  updatePlayerBalance(playerId, -amount);
  
  // Create bet
  const bet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    playerId,
    playerName,
    amount,
    timestamp: Date.now()
  };
  
  gameState.bets.push(bet);
  
  // Update player balance
  const newBalance = getPlayerBalance(playerId);
  
  // Notify player
  ws.send(JSON.stringify({
    type: 'betPlaced',
    bet,
    balance: newBalance
  }));
  
  // Broadcast to all players
  broadcast({
    type: 'betUpdate',
    bets: gameState.bets
  });
}

// Handle cashing out
function handleCashout(ws, playerId) {
  if (gameState.status !== 'running') {
    ws.send(JSON.stringify({ type: 'error', message: 'Cannot cashout - game is not running' }));
    return;
  }
  
  // Find player's bet
  const betIndex = gameState.bets.findIndex(bet => bet.playerId === playerId && !bet.cashoutMultiplier);
  if (betIndex === -1) {
    ws.send(JSON.stringify({ type: 'error', message: 'No active bet found' }));
    return;
  }
  
  const bet = gameState.bets[betIndex];
  const winAmount = bet.amount * gameState.multiplier;
  
  // Update bet with cashout info
  bet.cashoutMultiplier = gameState.multiplier;
  bet.winAmount = winAmount;
  
  // Add winnings to player balance
  updatePlayerBalance(playerId, winAmount);
  
  // Update player balance
  const newBalance = getPlayerBalance(playerId);
  
  // Notify player
  ws.send(JSON.stringify({
    type: 'betCashedOut',
    bet,
    balance: newBalance
  }));
  
  // Broadcast to all players
  broadcast({
    type: 'betUpdate',
    bets: gameState.bets
  });
}

export async function setupCrashWebSocket(httpServer) {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Create WebSocket server on /ws path
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    
    // Load crash history
    loadCrashHistory();
  
  // Start initial countdown
  startCountdown();
  
  wss.on('connection', (ws) => {
    handleConnection(ws);
  });
  
  console.log('Crash game WebSocket server started on /ws');
  } catch (error) {
    console.error('FATAL: Failed to setup crash websocket:', error);
    throw error;
  }
}