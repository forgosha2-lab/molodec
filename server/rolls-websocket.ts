import { Server as SocketIOServer } from 'socket.io';
import { randomUUID } from 'crypto';
import { db } from './db.js';
import { profiles } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import type { Server as HTTPServer } from 'http';

interface Player {
  id: string;
  name: string;
  userId: string;
  avatarUrl?: string;
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
  status: 'waiting' | 'spinning' | 'result';
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

export function setupRollsWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: '/ws-rolls',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const players = new Map<string, Player>();
  
  const COLORS = ['#60A5FA', '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#22D3EE', '#1A1A1A'];
  const HOUSE_FEE = 0.05; // 5% commission
  const BET_DURATION = 25000; // 25 seconds
  const SPIN_DURATION = 5000; // 5 seconds
  const MIN_PLAYERS_TO_START = 2; // Auto-start when 2 players have bet
  
  let gameState: GameState = {
    status: 'waiting',
    bets: [],
    totalPot: 0,
    timeRemaining: BET_DURATION,
    winnerBet: null,
    rotation: 0,
    roundId: randomUUID(),
    chatMessages: []
  };
  
  let gameTimer: NodeJS.Timeout | null = null;
  let spinAnimationFrame: any = null;
  let autoStartTimer: NodeJS.Timeout | null = null;

  // Broadcast state to all connected clients
  function broadcastState() {
    io.emit('STATE_SYNC', gameState);
  }

  // Start a new round
  function startNewRound() {
    // Clear any pending auto-start timer
    if (autoStartTimer) {
      clearTimeout(autoStartTimer);
      autoStartTimer = null;
    }
    
    gameState = {
      status: 'waiting',
      bets: [],
      totalPot: 0,
      timeRemaining: BET_DURATION,
      winnerBet: null,
      rotation: 0,
      roundId: randomUUID(),
      chatMessages: gameState.chatMessages.slice(-50) // Keep last 50 messages
    };
    
    startBettingTimer();
    broadcastState();
  }

  // Start betting timer
  function startBettingTimer() {
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
      gameState.timeRemaining -= 100;
      
      if (gameState.timeRemaining <= 0) {
        if (gameTimer) clearInterval(gameTimer);
        
        // Check if we have at least 2 unique bettors
        const uniquePlayers = new Set(gameState.bets.map(bet => bet.playerId));
        if (uniquePlayers.size >= 2) {
          startSpin();
        } else if (gameState.bets.length === 1) {
          // Only one bet - refund and reset
          const bet = gameState.bets[0];
          refundPlayer(bet.userId, bet.amount, bet.playerId);
          
          gameState.timeRemaining = BET_DURATION;
          gameState.bets = [];
          gameState.totalPot = 0;
          startBettingTimer();
          broadcastState();
        } else {
          // No bets - just reset timer
          gameState.timeRemaining = BET_DURATION;
          startBettingTimer();
        }
      }
      
      broadcastState();
    }, 100);
  }

  // Calculate winner and spin
  function startSpin() {
    // Clear any pending auto-start timer
    if (autoStartTimer) {
      clearTimeout(autoStartTimer);
      autoStartTimer = null;
    }
    
    gameState.status = 'spinning';
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
        updateWinnerBalance(winningBet.userId, winAmount, winningBet.playerId);
        
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
  async function updateWinnerBalance(userId: string, amount: number, playerId: string) {
    try {
      const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (userResult.length > 0) {
        const currentBalance = userResult[0].diamondsBalance || 0;
        const newBalance = currentBalance + amount;
        
        await db.update(profiles)
          .set({ diamondsBalance: newBalance })
          .where(eq(profiles.id, userId));
          
        // Send balance update to winner
        io.to(playerId).emit('BALANCE_UPDATE', { newBalance });
      }
    } catch (error) {
      console.error('Error updating winner balance:', error);
    }
  }
  
  // Refund player
  async function refundPlayer(userId: string, amount: number, playerId?: string) {
    try {
      const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (userResult.length > 0) {
        const currentBalance = userResult[0].diamondsBalance || 0;
        const newBalance = currentBalance + amount;
        
        await db.update(profiles)
          .set({ diamondsBalance: newBalance })
          .where(eq(profiles.id, userId));
          
        // Send refund notification if connected
        if (playerId) {
          io.to(playerId).emit('ROUND_CANCELLED', {
            refundAmount: amount,
            newBalance: newBalance
          });
        }
      }
    } catch (error) {
      console.error('Error refunding player:', error);
    }
  }

  // Handle socket connections
  io.on('connection', (socket) => {
    const connectionId = socket.id;
    console.log(`New Rolls WebSocket connection: ${connectionId}`);

    // Send current state immediately
    socket.emit('CONNECTION_ACK', {
      connectionId,
      state: gameState
    });

    // Handle JOIN event
    socket.on('JOIN', async (message: any) => {
      const { userId, username } = message;
      
      // Get user avatar from database
      let avatarUrl = null;
      try {
        const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
        if (userResult.length > 0) {
          avatarUrl = userResult[0].avatarUrl;
        }
      } catch (error) {
        console.error('Error fetching user avatar:', error);
      }

      const player: Player = {
        id: connectionId,
        name: username || 'Player',
        userId,
        avatarUrl: avatarUrl || undefined
      };

      players.set(connectionId, player);

      socket.emit('JOIN_ACK', {
        playerId: connectionId,
        state: gameState
      });
    });

    // Handle PLACE_BET event
    socket.on('PLACE_BET', async (message: any) => {
      const { amount, userId } = message;
      const player = players.get(connectionId);

      if (!player) {
        socket.emit('ERROR', { message: 'Player not found' });
        return;
      }

      if (gameState.status !== 'waiting') {
        socket.emit('ERROR', { message: 'Cannot bet during spin' });
        return;
      }

      // ALWAYS check and debit balance in database (even for adding to existing bet)
      try {
        const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
        if (userResult.length === 0 || (userResult[0].diamondsBalance || 0) < amount) {
          socket.emit('ERROR', { message: 'Insufficient balance' });
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
            userId: userId,  // Store userId for later payout
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
        socket.emit('ERROR', { message: 'Failed to place bet' });
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

      socket.emit('BET_PLACED', {
        bet: gameState.bets.find(b => b.playerId === connectionId)
      });

      // Auto-start if we have 2 or more unique players
      const uniquePlayers = new Set(gameState.bets.map(bet => bet.playerId));
      if (uniquePlayers.size >= MIN_PLAYERS_TO_START && gameState.status === 'waiting') {
        // Clear previous auto-start timer if exists
        if (autoStartTimer) {
          clearTimeout(autoStartTimer);
          autoStartTimer = null;
        }
        
        // Clear the betting countdown timer to prevent double-trigger
        if (gameTimer) {
          clearInterval(gameTimer);
          gameTimer = null;
        }
        
        // Schedule auto-start
        autoStartTimer = setTimeout(() => {
          autoStartTimer = null;
          startSpin();
        }, 1000); // Small delay for dramatic effect
      }
    });

    // Handle CANCEL_BET event
    socket.on('CANCEL_BET', async () => {
      if (gameState.status !== 'waiting') {
        socket.emit('ERROR', { message: 'Cannot cancel bet during spin' });
        return;
      }

      const betIndex = gameState.bets.findIndex(bet => bet.playerId === connectionId);
      if (betIndex === -1) {
        socket.emit('ERROR', { message: 'No bet to cancel' });
        return;
      }

      const bet = gameState.bets[betIndex];
      gameState.bets.splice(betIndex, 1);

      // Refund player in database
      await refundPlayer(bet.userId, bet.amount, connectionId);

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
      
      // Clear auto-start timer if bet count drops below minimum
      const uniquePlayers = new Set(gameState.bets.map(bet => bet.playerId));
      if (uniquePlayers.size < MIN_PLAYERS_TO_START && autoStartTimer) {
        clearTimeout(autoStartTimer);
        autoStartTimer = null;
        
        // Restart the betting timer if it was cleared
        if (!gameTimer) {
          gameState.timeRemaining = BET_DURATION;
          startBettingTimer();
        }
      }

      broadcastState();
    });

    // Handle CHAT_MESSAGE event
    socket.on('CHAT_MESSAGE', (message: any) => {
      const player = players.get(connectionId);
      if (!player) return;

      const chatMessage: ChatMessage = {
        id: randomUUID(),
        playerId: connectionId,
        playerName: player.name,
        message: message.message,
        timestamp: Date.now()
      };

      gameState.chatMessages.push(chatMessage);
      
      // Keep only last 50 messages
      if (gameState.chatMessages.length > 50) {
        gameState.chatMessages = gameState.chatMessages.slice(-50);
      }

      // Broadcast chat message to all clients
      io.emit('CHAT_MESSAGE', { message: chatMessage });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Rolls WebSocket connection closed: ${connectionId}`);
      
      // Remove player if they disconnect
      players.delete(connectionId);
    });
  });

  // Initialize first round
  startNewRound();

  console.log('Rolls WebSocket server initialized');
  return io;
}
