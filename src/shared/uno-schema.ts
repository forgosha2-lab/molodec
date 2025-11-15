import { z } from "zod";

// UNO Card Types
export const cardColors = ['red', 'yellow', 'green', 'blue', 'wild'] as const;
export const cardTypes = ['number', 'skip', 'reverse', 'draw2', 'wild', 'wild_draw4'] as const;

export type CardColor = typeof cardColors[number];
export type CardType = typeof cardTypes[number];

// Card Schema
export const cardSchema = z.object({
  id: z.string(),
  color: z.enum(cardColors),
  type: z.enum(cardTypes),
  value: z.number().min(0).max(9).nullable(), // Only for number cards
});

export type Card = z.infer<typeof cardSchema>;

// Player Schema
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  cards: z.array(cardSchema),
  hasCalledUno: z.boolean(),
  isConnected: z.boolean(),
});

export type Player = z.infer<typeof playerSchema>;

// Game State
export const gameStates = ['waiting', 'playing', 'finished'] as const;
export type GameState = typeof gameStates[number];

// Direction
export const directions = ['clockwise', 'counterclockwise'] as const;
export type Direction = typeof directions[number];

// Game Room Schema
export const gameRoomSchema = z.object({
  id: z.string(),
  code: z.string(), // 6-character room code
  players: z.array(playerSchema),
  currentPlayerIndex: z.number(),
  direction: z.enum(directions),
  drawPile: z.array(cardSchema),
  discardPile: z.array(cardSchema),
  gameState: z.enum(gameStates),
  selectedColor: z.enum(['red', 'yellow', 'green', 'blue']).nullable(), // For wild cards
  winner: z.string().nullable(), // Player ID of winner
  mustDrawCount: z.number(), // Number of cards to draw (for Draw Two/Four stacking)
});

export type GameRoom = z.infer<typeof gameRoomSchema>;

// WebSocket Message Types
export const wsMessageSchema = z.discriminatedUnion("type", [
  // Client -> Server
  z.object({
    type: z.literal("create_room"),
    playerName: z.string(),
  }),
  z.object({
    type: z.literal("join_room"),
    roomCode: z.string(),
    playerName: z.string(),
  }),
  z.object({
    type: z.literal("start_game"),
    roomId: z.string(),
  }),
  z.object({
    type: z.literal("play_card"),
    roomId: z.string(),
    cardId: z.string(),
    selectedColor: z.enum(['red', 'yellow', 'green', 'blue']).optional(),
  }),
  z.object({
    type: z.literal("draw_card"),
    roomId: z.string(),
  }),
  z.object({
    type: z.literal("call_uno"),
    roomId: z.string(),
  }),
  z.object({
    type: z.literal("challenge_uno"),
    roomId: z.string(),
    targetPlayerId: z.string(),
  }),
  
  // Server -> Client
  z.object({
    type: z.literal("room_created"),
    room: gameRoomSchema,
    playerId: z.string(),
  }),
  z.object({
    type: z.literal("room_joined"),
    room: gameRoomSchema,
    playerId: z.string(),
  }),
  z.object({
    type: z.literal("game_state_update"),
    room: gameRoomSchema,
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
  z.object({
    type: z.literal("player_joined"),
    room: gameRoomSchema,
  }),
  z.object({
    type: z.literal("player_left"),
    room: gameRoomSchema,
    playerId: z.string(),
  }),
  z.object({
    type: z.literal("game_over"),
    room: gameRoomSchema,
    winner: playerSchema,
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;

// Helper type for creating messages
export type WSClientMessage = Extract<WSMessage, { type: "create_room" | "join_room" | "start_game" | "play_card" | "draw_card" | "call_uno" | "challenge_uno" }>;
export type WSServerMessage = Extract<WSMessage, { type: "room_created" | "room_joined" | "game_state_update" | "error" | "player_joined" | "player_left" | "game_over" }>;

