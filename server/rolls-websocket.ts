import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { db } from './db.js';
import { profiles, gameEarnings } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import type { Server as HTTPServer } from 'http';

interface Player {
  id: string;
  name: string;
  userId: string;
  avatarUrl?: string;
  ws: WebSocket;
}

interface Bet {
  id: string;
  playerId: string;
  userId: string;
  playerName: string;
  amount: number;
  color: string;
  percentage: number;
  startAngle: number;
  endAngle: number;
  avatar_url?: string;
}

interface GameState {
  status: 'waiting' | 'countdown' | 'spinning' | 'result';
  bets: Bet[];
  totalPot: number;
  timeRemaining: number;
  winnerBet: Bet | null;
  rotation: number;
  roundId: string;
  chatMessages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface WebSocketMessage {
  type: string;
  data?: any;
}

export function setupRollsWebSocket(httpServer: HTTPServer) {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws-rolls'
  });

  const players = new Map<string, Player>();
  
  const COLORS = ['#60A5FA', '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#22D3EE', '#1A1A1A'];
  const HOUSE_FEE = 0.05; // 5% commission
  const COUNTDOWN_DURATION = 25000; // 25 seconds
  const SPIN_DURATION = 5000; // 5 seconds
  const MIN_PLAYERS_TO_START = 2; // Start countdown when 2 players have bet
  
  let gameState: GameState = {
    status: 'waiting',
    bets: [],
    totalPot: 0,
    timeRemaining: 0,
    winnerBet: null,
    rotation: 0,
    roundId: randomUUID(),
    chatMessages: []
  };
  
  let countdownTimer: NodeJS.Timeout | null = null;
  let spinAnimationFrame: any = null;

  // Broadcast state to all connected clients
  function broadcastState() {
    const message = JSON.stringify({
      type: 'STATE_SYNC',
      data: gameState
    });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Send message to specific client
  function sendToClient(ws: WebSocket, type: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  // Start a new round
  function startNewRound() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    
    gameState = {
      status: 'waiting',
      bets: [],
      totalPot: 0,
      timeRemaining: 0,
      winnerBet: null,
      rotation: 0,
      roundId: randomUUID(),
      chatMessages: gameState.chatMessages.slice(-50) // Keep last 50 messages
    };
    
    broadcastState();
  }

  // Start countdown when 2nd player places bet
  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    
    gameState.status = 'countdown';
    gameState.timeRemaining = COUNTDOWN_DURATION;
    broadcastState();
    
    countdownTimer = setInterval(() => {
      gameState.timeRemaining -= 100;
      
      if (gameState.timeRemaining <= 0) {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
        
        // Check if we still have at least 2 unique bettors
        const uniquePlayers = new Set(gameState.bets.map(bet => bet.playerId));
        if (uniquePlayers.size >= 2) {
          startSpin();
        } else if (gameState.bets.length === 1) {
          // Only one bet - refund and reset
          const bet = gameState.bets[0];
          const player = players.get(bet.playerId);
          refundPlayer(bet.userId, bet.amount, player?.ws);
          startNewRound();
        } else {
          // No bets - reset
          startNewRound();
        }
      } else {
        broadcastState();
      }
    }, 100);
  }

  // Calculate winner and spin
  async function startSpin() {
    gameState.status = 'spinning';
    gameState.timeRemaining = 0;
    broadcastState();

    // Calculate winner based on bet percentages
    const random = Math.random();
    let accumulated = 0;
    let winningBet = gameState.bets[0];

    for (const bet of gameState.bets) {
      accumulated += bet.percentage / 100;
      if (random <= accumulated) {
        winningBet = bet;
        break;
      }
    }

    // Calculate house fee (5%)
    const houseFee = gameState.totalPot * HOUSE_FEE;
    const winAmount = gameState.totalPot - houseFee;

    // Track house earnings in database
    try {
      await db.insert(gameEarnings).values({
        id: randomUUID(),
        game: 'rolls',
        amount: houseFee,
        roundId: gameState.roundId,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error tracking house earnings:', error);
    }

    // Animate spin
    const winningAngle = (winningBet.startAngle + winningBet.endAngle) / 2;
    const targetRotation = 360 * 10 + winningAngle; // 10 full rotations + target
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      gameState.rotation = easeOut * targetRotation;

      broadcastState();

      if (progress < 1) {
        spinAnimationFrame = setTimeout(animate, 16); // ~60fps
      } else {
        // Spin complete
        gameState.status = 'result';
        gameState.winnerBet = { ...winningBet, amount: winAmount };
        
        // Update winner's balance
        const winner = players.get(winningBet.playerId);
        updateWinnerBalance(winningBet.userId, winAmount, winner?.ws);
        
        broadcastState();

        // Start new round after 5 seconds
        setTimeout(() => {
          startNewRound();
        }, 5000);
      }
    };

    animate();
  }

  // Update player balance in database
  async function updateWinnerBalance(userId: string, amount: number, ws?: WebSocket) {
    try {
      const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (userResult.length > 0) {
        const currentBalance = userResult[0].diamondsBalance || 0;
        const newBalance = currentBalance + amount;
        
        await db.update(profiles)
          .set({ diamondsBalance: newBalance })
          .where(eq(profiles.id, userId));
          
        // Send balance update to winner
        if (ws) {
          sendToClient(ws, 'BALANCE_UPDATE', { newBalance });
        }
      }
    } catch (error) {
      console.error('Error updating winner balance:', error);
    }
  }
  
  // Refund player
  async function refundPlayer(userId: string, amount: number, ws?: WebSocket) {
    try {
      const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (userResult.length > 0) {
        const currentBalance = userResult[0].diamondsBalance || 0;
        const newBalance = currentBalance + amount;
        
        await db.update(profiles)
          .set({ diamondsBalance: newBalance })
          .where(eq(profiles.id, userId));
          
        // Send refund notification if connected
        if (ws) {
          sendToClient(ws, 'ROUND_CANCELLED', {
            refundAmount: amount,
            newBalance: newBalance
          });
        }
      }
    } catch (error) {
      console.error('Error refunding player:', error);
    }
  }

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    const connectionId = randomUUID();
    console.log(`New Rolls WebSocket connection: ${connectionId}`);

    // Send current state immediately
    sendToClient(ws, 'CONNECTION_ACK', {
      connectionId,
      state: gameState
    });

    // Handle messages
    ws.on('message', async (message: Buffer | string) => {
      try {
        const messageStr = message.toString();
        console.log(`[Rolls WS ${connectionId}] Raw message:`, messageStr);
        const parsed: WebSocketMessage = JSON.parse(messageStr);
        console.log(`[Rolls WS ${connectionId}] Parsed message:`, parsed.type, parsed.data);
        
        switch (parsed.type) {
          case 'JOIN': {
            const { userId, username } = parsed.data || {};
            
            // Get user avatar and balance from database
            let avatarUrl = null;
            let balance = 100; // Default balance
            try {
              const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
              if (userResult.length > 0) {
                avatarUrl = userResult[0].avatarUrl;
                balance = userResult[0].diamondsBalance || 100;
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }

            const player: Player = {
              id: connectionId,
              name: username || 'Player',
              userId,
              avatarUrl: avatarUrl || undefined,
              ws
            };

            players.set(connectionId, player);

            sendToClient(ws, 'JOIN_ACK', {
              playerId: connectionId,
              balance: balance,
              state: gameState
            });
            break;
          }

          case 'PLACE_BET': {
            const { amount, userId } = parsed.data || {};
            const player = players.get(connectionId);

            if (!player) {
              sendToClient(ws, 'ERROR', { message: 'Player not found' });
              return;
            }

            if (gameState.status === 'spinning' || gameState.status === 'result') {
              sendToClient(ws, 'ERROR', { message: 'Cannot bet during spin or result phase' });
              return;
            }

            // Check and debit balance in database
            try {
              const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
              if (userResult.length === 0 || (userResult[0].diamondsBalance || 0) < amount) {
                sendToClient(ws, 'ERROR', { message: 'Insufficient balance' });
                return;
              }

              // Deduct balance from database atomically
              const currentBalance = userResult[0].diamondsBalance || 0;
              const newBalance = currentBalance - amount;
              await db.update(profiles)
                .set({ diamondsBalance: newBalance })
                .where(eq(profiles.id, userId));

              // Check if player already has a bet
              const existingBetIndex = gameState.bets.findIndex(bet => bet.playerId === connectionId);
              if (existingBetIndex !== -1) {
                // Add to existing bet
                gameState.bets[existingBetIndex].amount += amount;
              } else {
                // Create new bet
                const colorIndex = gameState.bets.length % COLORS.length;
                const newBet: Bet = {
                  id: randomUUID(),
                  playerId: connectionId,
                  userId: userId,
                  playerName: player.name,
                  amount,
                  color: COLORS[colorIndex],
                  percentage: 0,
                  startAngle: 0,
                  endAngle: 0,
                  avatar_url: player.avatarUrl
                };

                gameState.bets.push(newBet);
              }
            } catch (error) {
              console.error('Error placing bet:', error);
              sendToClient(ws, 'ERROR', { message: 'Failed to place bet' });
              return;
            }

            // Recalculate percentages and angles
            const newTotalPot = gameState.bets.reduce((sum, bet) => sum + bet.amount, 0);
            gameState.totalPot = newTotalPot;

            let startAngle = 0;
            gameState.bets.forEach(bet => {
              bet.percentage = (bet.amount / newTotalPot) * 100;
              bet.startAngle = startAngle;
              bet.endAngle = startAngle + (bet.percentage / 100) * 360;
              startAngle = bet.endAngle;
            });

            broadcastState();

            sendToClient(ws, 'BET_PLACED', {
              bet: gameState.bets.find(b => b.playerId === connectionId)
            });

            // Start countdown if we have 2 or more unique players and we're in waiting state
            const uniquePlayers = new Set(gameState.bets.map(bet => bet.playerId));
            if (uniquePlayers.size >= MIN_PLAYERS_TO_START && gameState.status === 'waiting') {
              startCountdown();
            }
            break;
          }

          case 'CANCEL_BET': {
            if (gameState.status === 'spinning' || gameState.status === 'result') {
              sendToClient(ws, 'ERROR', { message: 'Cannot cancel bet during spin or result phase' });
              return;
            }

            const betIndex = gameState.bets.findIndex(bet => bet.playerId === connectionId);
            if (betIndex === -1) {
              sendToClient(ws, 'ERROR', { message: 'No bet to cancel' });
              return;
            }

            const bet = gameState.bets[betIndex];
            gameState.bets.splice(betIndex, 1);

            // Refund player in database
            await refundPlayer(bet.userId, bet.amount, ws);

            // Recalculate percentages
            const newTotalPot = gameState.bets.reduce((sum, b) => sum + b.amount, 0);
            gameState.totalPot = newTotalPot;

            if (gameState.bets.length > 0) {
              let startAngle = 0;
              gameState.bets.forEach(b => {
                b.percentage = (b.amount / newTotalPot) * 100;
                b.startAngle = startAngle;
                b.endAngle = startAngle + (b.percentage / 100) * 360;
                startAngle = b.endAngle;
              });
            }
            
            // If bet count drops below minimum, stop countdown and go back to waiting
            const uniquePlayers = new Set(gameState.bets.map(bet => bet.playerId));
            if (uniquePlayers.size < MIN_PLAYERS_TO_START && gameState.status === 'countdown') {
              if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
              }
              gameState.status = 'waiting';
              gameState.timeRemaining = 0;
            }

            broadcastState();
            break;
          }

          case 'CHAT_MESSAGE': {
            const player = players.get(connectionId);
            if (!player) return;

            const chatMessage: ChatMessage = {
              id: randomUUID(),
              playerId: connectionId,
              playerName: player.name,
              message: parsed.data?.message || '',
              timestamp: Date.now()
            };

            gameState.chatMessages.push(chatMessage);
            
            // Keep only last 50 messages
            if (gameState.chatMessages.length > 50) {
              gameState.chatMessages = gameState.chatMessages.slice(-50);
            }

            // Broadcast chat message to all clients
            const chatBroadcast = JSON.stringify({
              type: 'CHAT_MESSAGE',
              data: { message: chatMessage }
            });
            
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(chatBroadcast);
              }
            });
            break;
          }
        }
      } catch (error) {
        console.error(`[Rolls WS ${connectionId}] Error handling message:`, error);
        sendToClient(ws, 'ERROR', { message: 'Invalid message format' });
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`Rolls WebSocket connection closed: ${connectionId}`);
      
      // Remove player if they disconnect
      players.delete(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`Rolls WebSocket error for ${connectionId}:`, error);
    });
  });

  // Initialize first round
  startNewRound();

  console.log('Rolls WebSocket server initialized');
  return wss;
}
