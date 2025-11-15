import express from 'express';
import { db, pool } from './db.js';
import { profiles, gameLobbies, lobbyPlayers, chatMessages, achievements, gameSessions, gameEmojis, friendships, userAchievements, userAuth } from '../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { setupUnoWebSocket } from './websocket-uno.js';
import { setupDurakRoutes } from './durak-server.js';
import { logRequest } from './logger.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use((req, res, next) => {
  if (req.headers.upgrade === 'websocket') {
    return next();
  }
  next();
});

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('FATAL: Error starting server:', error);
    console.error('Server cannot start without database. Exiting...');
    process.exit(1);
  }

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const userId = email;
      const finalUsername = username || email.split('@')[0];
      
      const existingUser = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ 
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await db.insert(profiles).values({
        id: userId,
        username: finalUsername,
        diamondsBalance: 100,
      });
      
      await db.insert(userAuth).values({
        userId: userId,
        passwordHash: hashedPassword,
      });
      
      const user = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      
      res.json({ 
        user: user[0], 
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

      const userResult = await db.select().from(profiles).where(eq(profiles.id, email)).limit(1);
      if (userResult.length === 0) {
        return res.status(400).json({ error: 'Пользователь не найден' });
      }

      const authResult = await db.select().from(userAuth).where(eq(userAuth.userId, email)).limit(1);
      
      if (authResult.length === 0) {
        return res.status(400).json({ error: 'Ошибка аутентификации' });
      }

      const isValidPassword = await bcrypt.compare(password, authResult[0].passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Неверный пароль' });
      }

      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

      res.json({ user: userResult[0], session: sessionId, error: null });
    } catch (error) {
      console.error('Sign in error:', error);
      res.status(500).json({ error: 'Ошибка при входе' });
    }
  });

  app.get('/api/profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      res.json({ data: userResult[0], error: null });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Ошибка при получении профиля' });
    }
  });

  app.get('/api/lobbies', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT gl.*, p.username as host_username
        FROM game_lobbies gl
        LEFT JOIN profiles p ON gl.host_id = p.id
        WHERE gl.status = 'waiting'
        ORDER BY gl.created_at DESC
      `);
      
      res.json({ data: result.rows, error: null });
    } catch (error) {
      console.error('Get lobbies error:', error);
      res.status(500).json({ error: 'Ошибка при получении лобби' });
    }
  });

  app.post('/api/lobbies/create', async (req, res) => {
    try {
      const { userId, name, maxPlayers, betAmount, deckSize, isThrowIn, isPrivate, password } = req.body;

      const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (userResult.length === 0 || !userResult[0].diamondsBalance || userResult[0].diamondsBalance < betAmount) {
        return res.status(400).json({ error: 'Недостаточно бриллиантов' });
      }

      const lobbyId = uuidv4();
      
      const lobbyResult = await db.insert(gameLobbies).values({
        id: lobbyId,
        hostId: userId,
        name,
        maxPlayers,
        betAmount,
        deckSize,
        isThrowIn,
        isPrivate,
        password,
        status: 'waiting',
        currentPlayers: 1,
      }).returning();

      await db.insert(lobbyPlayers).values({
        id: uuidv4(),
        lobbyId,
        playerId: userId,
        position: 0,
      });

      res.json({ data: { lobbyId }, error: null });
    } catch (error) {
      console.error('Create lobby error:', error);
      res.status(500).json({ error: 'Ошибка при создании лобби' });
    }
  });

  app.post('/api/lobbies/join', async (req, res) => {
    try {
      const { userId, lobbyId, password } = req.body;

      const lobbyResult = await db.select().from(gameLobbies).where(eq(gameLobbies.id, lobbyId)).limit(1);
      if (lobbyResult.length === 0) {
        return res.status(404).json({ error: 'Лобби не найдено' });
      }

      const lobby = lobbyResult[0];

      if (lobby.isPrivate && lobby.password !== password) {
        return res.status(403).json({ error: 'Неверный пароль' });
      }

      const userResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (userResult.length === 0 || !userResult[0].diamondsBalance || userResult[0].diamondsBalance < lobby.betAmount) {
        return res.status(400).json({ error: 'Недостаточно бриллиантов' });
      }

      if (lobby.currentPlayers >= lobby.maxPlayers) {
        return res.status(400).json({ error: 'Лобби заполнено' });
      }

      const existing = await db.select().from(lobbyPlayers)
        .where(and(eq(lobbyPlayers.lobbyId, lobbyId), eq(lobbyPlayers.playerId, userId)))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Вы уже в этом лобби' });
      }

      const positionResult = await pool.query(
        'SELECT MAX(position) as max_pos FROM lobby_players WHERE lobby_id = $1',
        [lobbyId]
      );
      const nextPosition = positionResult.rows[0].max_pos !== null ? positionResult.rows[0].max_pos + 1 : 1;

      await db.insert(lobbyPlayers).values({
        id: uuidv4(),
        lobbyId,
        playerId: userId,
        position: nextPosition,
      });

      await pool.query(
        'UPDATE game_lobbies SET current_players = current_players + 1 WHERE id = $1',
        [lobbyId]
      );

      res.json({ data: { lobbyId }, error: null });
    } catch (error) {
      console.error('Join lobby error:', error);
      res.status(500).json({ error: 'Ошибка при присоединении к лобби' });
    }
  });

  const durakGames = new Map();
  setupDurakRoutes(app, durakGames);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
  });

  app.get('/api/welcome', (req, res) => {
    logRequest(req);
    res.json({ message: 'Welcome to the PyPLSE Game Hub API!' });
  });

  // Set up Vite dev server in middleware mode or serve static files
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/ws') || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((req, res, next) => {
    console.log(`Unhandled route: ${req.method} ${req.url}`);
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource could not be found'
    });
  });

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

  const httpServer = createServer(app);
  
  setupUnoWebSocket(httpServer);

  const host = process.env.HOST || '0.0.0.0';
  httpServer.listen(Number(PORT), host, () => {
    console.log(`Server running on ${host}:${PORT}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`HTTP API available at http://${host}:${PORT}/api`);
  });
}

startServer();
