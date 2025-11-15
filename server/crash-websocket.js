import { WebSocketServer } from 'ws';
import { pool } from './db.js';
import http from 'http';

// Initialize database tables for crash game
async function initializeDatabase() {
  try {
    console.log('Initializing crash game database...');
    
    // Create crash game history table
    await pool.query(`CREATE TABLE IF NOT EXISTS crash_history (
      id SERIAL PRIMARY KEY,
      crash_point REAL NOT NULL,
      total_bets REAL NOT NULL DEFAULT 0,
      total_payouts REAL NOT NULL DEFAULT 0,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
    )`);
    
    // Create player balances table (if not exists)
    await pool.query(`CREATE TABLE IF NOT EXISTS player_balances (
      player_id TEXT PRIMARY KEY,
      balance NUMERIC(12, 2) NOT NULL DEFAULT 1000
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
  bets: [],
  countdown: 12
};

// RTP tracking
let rtpStats = {
  totalBets: 0,
  totalPayouts: 0,
  currentRoundBets: 0
};

let gameInterval = null;
let countdownInterval = null;

// Store connections
const connections = new Map();

// History of crash points
let crashHistory = [];

// Load crash history from database
async function loadCrashHistory() {
  try {
    const result = await pool.query('SELECT crash_point FROM crash_history ORDER BY timestamp DESC LIMIT 50');
    crashHistory = result.rows.map(row => row.crash_point);
    
    // Load RTP stats
    const rtpResult = await pool.query('SELECT SUM(total_bets) as total_bets, SUM(total_payouts) as total_payouts FROM crash_history');
    if (rtpResult.rows.length > 0 && rtpResult.rows[0].total_bets) {
      rtpStats.totalBets = parseFloat(rtpResult.rows[0].total_bets) || 0;
      rtpStats.totalPayouts = parseFloat(rtpResult.rows[0].total_payouts) || 0;
    }
    
    console.log(`Loaded ${crashHistory.length} crash history points`);
    console.log(`RTP Stats - Total Bets: ${rtpStats.totalBets}, Total Payouts: ${rtpStats.totalPayouts}`);
  } catch (error) {
    console.error('Error loading crash history:', error);
  }
}

// Save crash point to database
async function saveCrashPoint(point, totalBets, totalPayouts) {
  try {
    await pool.query('INSERT INTO crash_history (crash_point, total_bets, total_payouts) VALUES ($1, $2, $3)', 
      [point, totalBets, totalPayouts]);
  } catch (error) {
    console.error('Error saving crash point:', error);
  }
}

// Calculate crash point with RTP logic (90%)
function calculateCrashPoint() {
  const currentRTP = rtpStats.totalBets > 0 ? rtpStats.totalPayouts / rtpStats.totalBets : 0;
  const targetRTP = 0.9;
  
  // Calculate how much we can afford to pay out
  const totalBank = rtpStats.totalBets + rtpStats.currentRoundBets;
  const targetPayoutTotal = totalBank * targetRTP;
  const availableToPayout = targetPayoutTotal - rtpStats.totalPayouts;
  
  console.log(`RTP Calculation: Current RTP=${(currentRTP * 100).toFixed(2)}%, Available to payout=${availableToPayout.toFixed(2)}, Current round bets=${rtpStats.currentRoundBets}`);
  
  // If we're below 90% RTP, allow higher multipliers
  // If we're above 90% RTP, force lower multipliers
  if (currentRTP < targetRTP && availableToPayout > rtpStats.currentRoundBets * 0.5) {
    // We can afford to pay out more - allow higher multipliers
    const randomFactor = Math.random();
    if (randomFactor < 0.3) {
      // 30% chance of very high multiplier (2x - 10x)
      return Math.random() * 8 + 2;
    } else if (randomFactor < 0.6) {
      // 30% chance of medium multiplier (1.5x - 2x)
      return Math.random() * 0.5 + 1.5;
    } else {
      // 40% chance of low multiplier (1.1x - 1.5x)
      return Math.random() * 0.4 + 1.1;
    }
  } else {
    // Need to limit payouts - force lower multipliers
    const randomFactor = Math.random();
    if (randomFactor < 0.7) {
      // 70% chance of instant crash or very low (1.00x - 1.15x)
      return Math.random() * 0.15 + 1.00;
    } else if (randomFactor < 0.9) {
      // 20% chance of low multiplier (1.15x - 1.5x)
      return Math.random() * 0.35 + 1.15;
    } else {
      // 10% chance of medium multiplier (1.5x - 2.5x)
      return Math.random() * 1.0 + 1.5;
    }
  }
}

// Get player balance
async function getPlayerBalance(playerId) {
  try {
    const result = await pool.query('SELECT balance FROM player_balances WHERE player_id = $1', [playerId]);
    if (result.rows.length > 0) {
      return result.rows[0].balance;
    } else {
      // Create new player with default balance
      await pool.query('INSERT INTO player_balances (player_id, balance) VALUES ($1, 1000)', [playerId]);
      return 1000;
    }
  } catch (error) {
    console.error('Error getting player balance:', error);
    return 1000; // Default balance
  }
}

// Update player balance
async function updatePlayerBalance(playerId, amount) {
  try {
    await pool.query('UPDATE player_balances SET balance = balance + $1 WHERE player_id = $2', [amount, playerId]);
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
  gameState.countdown = 12;
  rtpStats.currentRoundBets = 0;
  
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Notify all clients about the countdown
  broadcast({ type: 'countdown', countdown: gameState.countdown, gameState });
  
  countdownInterval = setInterval(() => {
    gameState.countdown--;
    console.log(`Countdown: ${gameState.countdown}`);
    broadcast({ type: 'countdown', countdown: gameState.countdown, gameState });
    
    if (gameState.countdown <= 0) {
      startGame();
    }
  }, 1000);
}

// Start the game
function startGame() {
  console.log('Starting game...');
  
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Calculate total bets for this round
  rtpStats.currentRoundBets = gameState.bets.reduce((sum, bet) => sum + bet.amount, 0);
  
  gameState.status = 'running';
  gameState.multiplier = 1.0;
  gameState.crashPoint = calculateCrashPoint(); // Use RTP-based calculation
  gameState.startTime = Date.now();
  gameState.countdown = 0;
  
  console.log(`Game started with crash point: ${gameState.crashPoint.toFixed(2)}x, Total bets: ${rtpStats.currentRoundBets}`);
  
  // Save crash point to history
  crashHistory.unshift(gameState.crashPoint);
  if (crashHistory.length > 50) {
    crashHistory = crashHistory.slice(0, 50);
  }
  
  broadcast({ 
    type: 'gameStart',
    gameState
  });
  
  // Start game loop
  if (gameInterval) clearInterval(gameInterval);
  
  gameInterval = setInterval(() => {
    const elapsed = Date.now() - gameState.startTime;
    const newMultiplier = Math.pow(Math.E, elapsed / 3000);
    
    gameState.multiplier = Math.min(newMultiplier, gameState.crashPoint);
    
    broadcast({ 
      type: 'gameUpdate',
      gameState
    });
    
    // Auto cashout for players with auto cashout enabled
    gameState.bets.forEach(bet => {
      if (bet.autoCashout && !bet.cashoutMultiplier && gameState.multiplier >= bet.autoCashoutAt) {
        performCashout(bet.playerId, true);
      }
    });
    
    // Check if game should crash
    if (gameState.multiplier >= gameState.crashPoint) {
      endGame();
    }
  }, 50);
}

// End the game (crash)
async function endGame() {
  gameState.status = 'crashed';
  gameState.multiplier = gameState.crashPoint;
  
  if (gameInterval) clearInterval(gameInterval);
  
  console.log(`Game crashed at ${gameState.crashPoint.toFixed(2)}x`);
  
  // Calculate round statistics
  let roundPayouts = 0;
  
  // Process bets - players who haven't cashed out lose
  for (const bet of gameState.bets) {
    if (bet.cashoutMultiplier) {
      roundPayouts += bet.winAmount;
    }
    
    const conn = connections.get(bet.playerId);
    if (conn && conn.readyState === 1) {
      const betResult = {
        type: bet.cashoutMultiplier ? 'betWon' : 'betLost',
        bet,
        balance: await getPlayerBalance(bet.playerId)
      };
      conn.send(JSON.stringify(betResult));
    }
  }
  
  // Update global RTP stats
  rtpStats.totalBets += rtpStats.currentRoundBets;
  rtpStats.totalPayouts += roundPayouts;
  
  console.log(`Round ended - Bets: ${rtpStats.currentRoundBets}, Payouts: ${roundPayouts}, Current RTP: ${((rtpStats.totalPayouts / rtpStats.totalBets) * 100).toFixed(2)}%`);
  
  // Save to database
  await saveCrashPoint(gameState.crashPoint, rtpStats.currentRoundBets, roundPayouts);
  
  broadcast({ 
    type: 'gameCrash',
    gameState,
    crashHistory
  });
  
  // Start next round after 3 seconds
  setTimeout(() => {
    startCountdown();
  }, 3000);
}

// Perform cashout for a player
async function performCashout(playerId, isAuto = false) {
  if (gameState.status !== 'running') return false;
  
  const betIndex = gameState.bets.findIndex(bet => bet.playerId === playerId && !bet.cashoutMultiplier);
  if (betIndex === -1) return false;
  
  const bet = gameState.bets[betIndex];
  const winAmount = bet.amount * gameState.multiplier;
  
  // Update bet with cashout info
  bet.cashoutMultiplier = gameState.multiplier;
  bet.winAmount = winAmount;
  bet.cashedOutAt = Date.now();
  
  // Add winnings to player balance
  await updatePlayerBalance(playerId, winAmount);
  
  const newBalance = await getPlayerBalance(playerId);
  
  const conn = connections.get(playerId);
  if (conn && conn.readyState === 1) {
    conn.send(JSON.stringify({
      type: 'betCashedOut',
      bet,
      balance: newBalance,
      isAuto
    }));
  }
  
  // Broadcast to all players
  broadcast({
    type: 'betUpdate',
    gameState
  });
  
  return true;
}

// Handle WebSocket connection
async function handleConnection(ws) {
  // Generate player ID
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const playerName = `Player${Math.floor(Math.random() * 9999)}`;
  
  // Store connection
  connections.set(playerId, ws);
  
  console.log(`Player ${playerName} (${playerId}) connected`);
  
  // Send initial state
  const balance = await getPlayerBalance(playerId);
  
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
async function handleMessage(ws, playerId, playerName, message) {
  switch (message.type) {
    case 'placeBet':
      await handlePlaceBet(ws, playerId, playerName, message.data);
      break;
      
    case 'cashout':
      await handleCashout(ws, playerId);
      break;
      
    case 'getPlayerBalance':
      const balance = await getPlayerBalance(playerId);
      ws.send(JSON.stringify({ type: 'balanceUpdate', balance }));
      break;
      
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

// Handle placing a bet
async function handlePlaceBet(ws, playerId, playerName, data) {
  if (gameState.status !== 'waiting') {
    ws.send(JSON.stringify({ type: 'error', message: 'Cannot place bet - game is not waiting' }));
    return;
  }
  
  const amount = Number(data.amount);
  const autoCashout = data.autoCashout || false;
  const autoCashoutAt = Number(data.autoCashoutAt) || 2.0;
  
  if (isNaN(amount) || amount <= 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid bet amount' }));
    return;
  }
  
  const balance = await getPlayerBalance(playerId);
  if (balance < amount) {
    ws.send(JSON.stringify({ type: 'error', message: 'Insufficient balance' }));
    return;
  }
  
  // Deduct bet amount from balance
  await updatePlayerBalance(playerId, -amount);
  
  // Create bet
  const bet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    playerId,
    playerName,
    amount,
    autoCashout,
    autoCashoutAt,
    timestamp: Date.now()
  };
  
  gameState.bets.push(bet);
  
  // Update player balance
  const newBalance = await getPlayerBalance(playerId);
  
  // Notify player
  ws.send(JSON.stringify({
    type: 'betPlaced',
    bet,
    balance: newBalance
  }));
  
  // Broadcast to all players
  broadcast({
    type: 'betUpdate',
    gameState
  });
}

// Handle cashing out
async function handleCashout(ws, playerId) {
  const success = await performCashout(playerId, false);
  
  if (!success) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: gameState.status !== 'running' ? 'Cannot cashout - game is not running' : 'No active bet found' 
    }));
  }
}

export async function setupCrashWebSocket(httpServer) {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Create WebSocket server on /ws path
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    
    // Load crash history
    await loadCrashHistory();
  
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
