import { z } from "zod";

export interface PlayerBalance {
  playerId: string;
  balance: number;
}

// Durak Game Schema
export const Suit = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
} as const;

export type SuitType = typeof Suit[keyof typeof Suit];

export const Rank = {
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  JACK: 'В',
  QUEEN: 'Д',
  KING: 'К',
  ACE: 'Т',
} as const;

export type RankType = typeof Rank[keyof typeof Rank];

export const rankValues: Record<RankType, number> = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'В': 11,
  'Д': 12,
  'К': 13,
  'Т': 14,
};

export interface Card {
  suit: SuitType;
  rank: RankType;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isAI: boolean;
  isOut: boolean;
}

export interface BattlePair {
  attackCard: Card;
  defendCard?: Card;
}

export type GamePhase = 'dealing' | 'attacking' | 'defending' | 'ended';

export interface GameState {
  players: Player[];
  deck: Card[];
  trumpCard: Card | null;
  trumpSuit: SuitType | null;
  discardPile: Card[];
  battlePairs: BattlePair[];
  currentAttackerIndex: number;
  currentDefenderIndex: number;
  phase: GamePhase;
  canThrow: boolean;
  winner: string | null;
  loser: string | null;
}

export const gameConfigSchema = z.object({
  numberOfPlayers: z.number().min(2).max(4).default(2),
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

