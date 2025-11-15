import { pgTable, uuid, text, integer, timestamp, boolean, jsonb, real, check, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User authentication table
export const userAuth = pgTable('user_auth', {
  userId: text('user_id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Profiles table
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  avatarUrl: text('avatar_url'),
  level: integer('level').default(1),
  totalWins: integer('total_wins').default(0),
  totalGames: integer('total_games').default(0),
  diamondsWon: integer('diamonds_won').default(0),
  diamondsBalance: integer('diamonds_balance').default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Friendships table
export const friendships = pgTable('friendships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  friendId: text('friend_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueFriendship: unique().on(table.userId, table.friendId),
}));

// Game lobbies table
export const gameLobbies = pgTable('game_lobbies', {
  id: text('id').primaryKey(),
  hostId: text('host_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  gameType: text('game_type').notNull().default('durak'),
  maxPlayers: integer('max_players').notNull().default(4),
  currentPlayers: integer('current_players').notNull().default(1),
  betAmount: integer('bet_amount').notNull().default(10),
  deckSize: integer('deck_size').notNull().default(36),
  isThrowIn: boolean('is_throw_in').default(true),
  isPrivate: boolean('is_private').default(false),
  password: text('password'),
  status: text('status').notNull().default('waiting'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Lobby players table
export const lobbyPlayers = pgTable('lobby_players', {
  id: text('id').primaryKey(),
  lobbyId: text('lobby_id').notNull().references(() => gameLobbies.id, { onDelete: 'cascade' }),
  playerId: text('player_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueLobbyPlayer: unique().on(table.lobbyId, table.playerId),
}));

// Game sessions table
export const gameSessions = pgTable('game_sessions', {
  id: text('id').primaryKey(),
  lobbyId: text('lobby_id').notNull().references(() => gameLobbies.id, { onDelete: 'cascade' }),
  currentTurnPlayerId: text('current_turn_player_id').references(() => profiles.id),
  gameState: jsonb('game_state').notNull().default({}),
  trumpSuit: text('trump_suit'),
  status: text('status').notNull().default('active'),
  winnerId: text('winner_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

// Chat messages table
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  lobbyId: text('lobby_id').notNull().references(() => gameLobbies.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Achievements table
export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  icon: text('icon'),
  requirementType: text('requirement_type').notNull(),
  requirementValue: integer('requirement_value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// User achievements table
export const userAchievements = pgTable('user_achievements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueUserAchievement: unique().on(table.userId, table.achievementId),
}));

// Game emojis table
export const gameEmojis = pgTable('game_emojis', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  playerId: text('player_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  emojiType: text('emoji_type').notNull(),
  positionX: real('position_x').notNull(),
  positionY: real('position_y').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  friendships: many(friendships),
  lobbies: many(gameLobbies),
  lobbyPlayers: many(lobbyPlayers),
  gameSessions: many(gameSessions),
  chatMessages: many(chatMessages),
  userAchievements: many(userAchievements),
  gameEmojis: many(gameEmojis),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(profiles, {
    fields: [friendships.userId],
    references: [profiles.id],
  }),
  friend: one(profiles, {
    fields: [friendships.friendId],
    references: [profiles.id],
  }),
}));

export const gameLobbiesRelations = relations(gameLobbies, ({ one, many }) => ({
  host: one(profiles, {
    fields: [gameLobbies.hostId],
    references: [profiles.id],
  }),
  players: many(lobbyPlayers),
  sessions: many(gameSessions),
  chatMessages: many(chatMessages),
}));

export const lobbyPlayersRelations = relations(lobbyPlayers, ({ one }) => ({
  lobby: one(gameLobbies, {
    fields: [lobbyPlayers.lobbyId],
    references: [gameLobbies.id],
  }),
  player: one(profiles, {
    fields: [lobbyPlayers.playerId],
    references: [profiles.id],
  }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  lobby: one(gameLobbies, {
    fields: [gameSessions.lobbyId],
    references: [gameLobbies.id],
  }),
  currentTurnPlayer: one(profiles, {
    fields: [gameSessions.currentTurnPlayerId],
    references: [profiles.id],
  }),
  winner: one(profiles, {
    fields: [gameSessions.winnerId],
    references: [profiles.id],
  }),
  emojis: many(gameEmojis),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  lobby: one(gameLobbies, {
    fields: [chatMessages.lobbyId],
    references: [gameLobbies.id],
  }),
  sender: one(profiles, {
    fields: [chatMessages.senderId],
    references: [profiles.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(profiles, {
    fields: [userAchievements.userId],
    references: [profiles.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const gameEmojisRelations = relations(gameEmojis, ({ one }) => ({
  session: one(gameSessions, {
    fields: [gameEmojis.sessionId],
    references: [gameSessions.id],
  }),
  player: one(profiles, {
    fields: [gameEmojis.playerId],
    references: [profiles.id],
  }),
}));
