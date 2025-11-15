import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { createServer } from 'http';
import { setupUnoWebSocket } from './server/websocket-uno.js';
import { setupDurakRoutes } from './server/durak-server.js';
import { setupCrashWebSocket } from './server/crash-websocket.js';
import { logRequest } from './server/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Middleware - skip for WebSocket upgrade requests
app.use((req, res, next) => {
  // Skip middleware for WebSocket upgrade requests
  if (req.headers.upgrade === 'websocket') {
    return next();
  }
  next();
});

app.use(cors());
app.use(express.json());

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
}

// SQLite database setup
// For Railway, we'll use a temporary directory since the filesystem is ephemeral
const dbPath = process.env.DB_PATH || path.join('/tmp', 'pyplse_game_hub.db');

let db;

// Initialize database
function initializeDatabase() {
  try {
    // Create user_auth table for storing passwords
    db.exec(`CREATE TABLE IF NOT EXISTS user_auth (
      user_id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create profiles table
    db.exec(`CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      avatar_url TEXT,
      level INTEGER DEFAULT 1,
      total_wins INTEGER DEFAULT 0,
      total_games INTEGER DEFAULT 0,
      diamonds_won INTEGER DEFAULT 0,
      diamonds_balance INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create friendships table
    db.exec(`CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id)
    )`);

    // Create game lobbies table
    db.exec(`CREATE TABLE IF NOT EXISTS game_lobbies (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      name TEXT NOT NULL,
      game_type TEXT NOT NULL DEFAULT 'durak',
      max_players INTEGER NOT NULL DEFAULT 4,
      current_players INTEGER NOT NULL DEFAULT 1,
      bet_amount INTEGER NOT NULL DEFAULT 10,
      deck_size INTEGER NOT NULL DEFAULT 36,
      is_throw_in INTEGER DEFAULT 1,
      is_private INTEGER DEFAULT 0,
      password TEXT,
      status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`);

    // Create lobby players table
    db.exec(`CREATE TABLE IF NOT EXISTS lobby_players (
      id TEXT PRIMARY KEY,
      lobby_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE(lobby_id, player_id)
    )`);

    // Create game sessions table
    db.exec(`CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      lobby_id TEXT NOT NULL,
      current_turn_player_id TEXT,
      game_state TEXT NOT NULL DEFAULT '{}',
      trump_suit TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
      winner_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (current_turn_player_id) REFERENCES profiles(id),
      FOREIGN KEY (winner_id) REFERENCES profiles(id)
    )`);

    // Create chat messages table
    db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      lobby_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`);

    // Create achievements table
    db.exec(`CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      icon TEXT,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create user achievements table
    db.exec(`CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_id)
    )`);

    // Create game emojis table
    db.exec(`CREATE TABLE IF NOT EXISTS game_emojis (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      emoji_type TEXT NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`);

    // Insert default achievements
    const achievements = [
      { name: 'Первая победа', description: 'Выиграй свою первую игру', requirement_type: 'wins', requirement_value: 1 },
      { name: 'Опытный игрок', description: 'Выиграй 10 игр', requirement_type: 'wins', requirement_value: 10 },
      { name: 'Мастер дурака', description: 'Выиграй 50 игр', requirement_type: 'wins', requirement_value: 50 },
      { name: 'Легенда', description: 'Выиграй 100 игр', requirement_type: 'wins', requirement_value: 100 },
      { name: 'Богач', description: 'Накопи 1000 бриллиантов', requirement_type: 'diamonds', requirement_value: 1000 },
      { name: 'Миллионер', description: 'Накопи 10000 бриллиантов', requirement_type: 'diamonds', requirement_value: 10000 }
    ];

    const insertAchievement = db.prepare('INSERT OR IGNORE INTO achievements (id, name, description, requirement_type, requirement_value) VALUES (?, ?, ?, ?, ?)');
    for (const achievement of achievements) {
      insertAchievement.run(Date.now().toString() + Math.random().toString(36).substr(2, 9), achievement.name, achievement.description, achievement.requirement_type, achievement.requirement_value);
    }

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
}

// Prepared statements for better performance (initialized after database setup)
let statements;

// Start server
function startServer() {
  try {
    db = new Database(dbPath);
    initializeDatabase();

    // Initialize prepared statements after database setup
    statements = {
      checkUserExists: db.prepare('SELECT id FROM profiles WHERE username = ? OR id = ?'),
      insertProfile: db.prepare('INSERT INTO profiles (id, username, diamonds_balance) VALUES (?, ?, ?)'),
      insertUserAuth: db.prepare('INSERT INTO user_auth (user_id, password_hash) VALUES (?, ?)'),
      getUserById: db.prepare('SELECT * FROM profiles WHERE id = ?'),
      getUserAuth: db.prepare('SELECT password_hash FROM user_auth WHERE user_id = ?'),
      getProfile: db.prepare('SELECT * FROM profiles WHERE id = ?')
    };

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }

  // API Routes
  // Add middleware to handle Railway's request logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Check if user already exists
      const existingUser = statements.checkUserExists.get(username || email.split('@')[0], email);
      if (existingUser) {
        return res.status(400).json({ 
          error: 'User with this email or username already exists',
          code: 'USER_EXISTS'
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const userId = email; // Use email as ID for simplicity
      const finalUsername = username || email.split('@')[0];
      
      // Check if profile already exists
      const existingProfile = statements.getUserById.get(userId);
      if (existingProfile) {
        // Update existing profile
        db.prepare('UPDATE profiles SET username = ?, diamonds_balance = 100 WHERE id = ?')
          .run(finalUsername, userId);
      } else {
        // Create new profile
        statements.insertProfile.run(userId, finalUsername, 100);
      }
      
      // Update or create user auth
      const existingAuth = db.prepare('SELECT * FROM user_auth WHERE user_id = ?').get(userId);
      if (existingAuth) {
        db.prepare('UPDATE user_auth SET password_hash = ? WHERE user_id = ?')
          .run(hashedPassword, userId);
      } else {
        statements.insertUserAuth.run(userId, hashedPassword);
      }
      
      const user = statements.getUserById.get(userId);
      
      res.json({ 
        user, 
        message: 'User signed up successfully',
        error: null 
      });
    } catch (error) {
      console.error('Sign up error:', error);
      res.status(500).json({ 
        error: 'Internal server error during registration',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
      }

      const user = statements.getUserById.get(email);
      if (!user) {
        return res.status(400).json({ error: 'Пользователь не найден' });
      }

      const authRecord = statements.getUserAuth.get(email);
      if (!authRecord) {
        return res.status(400).json({ error: 'Ошибка аутентификации' });
      }

      const isValidPassword = await bcrypt.compare(password, authRecord.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Неверный пароль' });
      }

      // Create session (simple implementation)
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

      res.json({ user, session: sessionId, error: null });
    } catch (error) {
      console.error('Sign in error:', error);
      res.status(500).json({ error: 'Ошибка при входе' });
    }
  });


  app.get('/api/profile/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const user = statements.getProfile.get(userId);

      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      res.json({ data: user, error: null });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Ошибка при получении профиля' });
    }
  });

  // Get all waiting lobbies
  app.get('/api/lobbies', (req, res) => {
    try {
      const getLobbies = db.prepare(`
        SELECT gl.*, p.username as host_username
        FROM game_lobbies gl
        LEFT JOIN profiles p ON gl.host_id = p.id
        WHERE gl.status = 'waiting'
        ORDER BY gl.created_at DESC
      `);
      
      const lobbies = getLobbies.all();
      res.json({ data: lobbies, error: null });
    } catch (error) {
      console.error('Get lobbies error:', error);
      res.status(500).json({ error: 'Ошибка при получении лобби' });
    }
  });

  // Create a new lobby
  app.post('/api/lobbies/create', (req, res) => {
    try {
      const { userId, name, maxPlayers, betAmount, deckSize, isThrowIn, isPrivate, password } = req.body;

      // Check user balance
      const user = statements.getProfile.get(userId);
      if (!user || user.diamonds_balance < betAmount) {
        return res.status(400).json({ error: 'Недостаточно бриллиантов' });
      }

      // Generate lobby ID
      const lobbyId = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Insert lobby
      const insertLobby = db.prepare(`
        INSERT INTO game_lobbies (id, host_id, name, max_players, bet_amount, deck_size, is_throw_in, is_private, password, status, current_players)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertLobby.run(lobbyId, userId, name, maxPlayers, betAmount, deckSize, isThrowIn ? 1 : 0, isPrivate ? 1 : 0, password, 'waiting', 1);

      // Add host as first player
      const insertPlayer = db.prepare('INSERT INTO lobby_players (lobby_id, player_id, position) VALUES (?, ?, ?)');
      insertPlayer.run(lobbyId, userId, 0);

      res.json({ data: { lobbyId }, error: null });
    } catch (error) {
      console.error('Create lobby error:', error);
      res.status(500).json({ error: 'Ошибка при создании лобби' });
    }
  });

  // Join an existing lobby
  app.post('/api/lobbies/join', (req, res) => {
    try {
      const { userId, lobbyId, password } = req.body;

      // Get lobby details from database
      const lobby = db.prepare('SELECT * FROM game_lobbies WHERE id = ?').get(lobbyId);
      if (!lobby) {
        return res.status(404).json({ error: 'Лобби не найдено' });
      }

      // Check if lobby is private and password matches
      if (lobby.is_private && lobby.password !== password) {
        return res.status(403).json({ error: 'Неверный пароль' });
      }

      // Check user balance with server-side bet amount
      const user = statements.getProfile.get(userId);
      if (!user || user.diamonds_balance < lobby.bet_amount) {
        return res.status(400).json({ error: 'Недостаточно бриллиантов' });
      }

      // Check lobby capacity
      if (lobby.current_players >= lobby.max_players) {
        return res.status(400).json({ error: 'Лобби заполнено' });
      }

      // Check if already in lobby
      const existing = db.prepare('SELECT * FROM lobby_players WHERE lobby_id = ? AND player_id = ?').get(lobbyId, userId);
      if (existing) {
        return res.status(400).json({ error: 'Вы уже в этом лобби' });
      }

      // Get next position
      const lastPosition = db.prepare('SELECT MAX(position) as max_pos FROM lobby_players WHERE lobby_id = ?').get(lobbyId);
      const nextPosition = (lastPosition && lastPosition.max_pos !== null) ? lastPosition.max_pos + 1 : 1;

      // Add player
      const insertPlayer = db.prepare('INSERT INTO lobby_players (lobby_id, player_id, position) VALUES (?, ?, ?)');
      insertPlayer.run(lobbyId, userId, nextPosition);

      // Update lobby count
      const updateLobby = db.prepare('UPDATE game_lobbies SET current_players = current_players + 1 WHERE id = ?');
      updateLobby.run(lobbyId);

      res.json({ data: { lobbyId }, error: null });
    } catch (error) {
      console.error('Join lobby error:', error);
      res.status(500).json({ error: 'Ошибка при присоединении к лобби' });
    }
  });

  // Durak game storage (in-memory)
  const durakGames = new Map();

  // Setup Durak game routes with full game logic
  setupDurakRoutes(app, durakGames);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
  });

  // Welcome endpoint with logging
  app.get('/api/welcome', (req, res) => {
    logRequest(req);
    res.json({ message: 'Welcome to the PyPLSE Game Hub API!' });
  });

  // Serve index.html for all other routes in production (SPA fallback)
  // But exclude WebSocket paths
  if (isProduction) {
    app.get('*', (req, res, next) => {
      // Don't intercept WebSocket upgrade requests
      if (req.path.startsWith('/ws')) {
        return next();
      }
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Add error handling for unmatched routes
  app.use((req, res, next) => {
    console.log(`Unhandled route: ${req.method} ${req.url}`);
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource could not be found'
    });
  });

  // Add global error handler
  app.use((err, req, res, next) => {
    console.error(`Unhandled error: ${err.message}`, {
      error: err,
      url: req.url,
      method: req.method
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  });

  // Create HTTP server for WebSocket support (for UNO and Crash)
  const httpServer = createServer(app);
  
  // Setup UNO WebSocket
  setupUnoWebSocket(httpServer);
  
  // Setup Crash WebSocket
  setupCrashWebSocket(httpServer);

  // Get host from environment or default to all interfaces
  const host = process.env.HOST || '0.0.0.0';
  httpServer.listen(PORT, host, () => {
    console.log(`Server running on ${host}:${PORT}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`Database file: ${dbPath}`);
    console.log(`HTTP API available at http://localhost:${PORT}/api`);
  });
}

startServer();