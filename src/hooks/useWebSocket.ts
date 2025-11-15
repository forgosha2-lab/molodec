import { useState, useEffect, useRef, useCallback } from 'react';

interface CrashGameState {
  status: 'waiting' | 'running' | 'crashed';
  multiplier: number;
  crashPoint: number;
  startTime: number;
  countdown: number;
  bets: Array<{
    id: string;
    playerId: string;
    playerName: string;
    amount: number;
    cashoutMultiplier?: number;
    profit?: number;
  }>;
}

interface CoinflipGameState {
  status: 'idle' | 'flipping' | 'result';
  result?: 'heads' | 'tails';
}

interface RollsGameState {
  status: 'waiting' | 'spinning' | 'result';
  totalPot: number;
  bets: Array<{
    id: string;
    playerId: string;
    playerName: string;
    amount: number;
    color: string;
    percentage: number;
    startAngle: number;
    endAngle: number;
  }>;
}

interface LiveBetFeed {
  id: string;
  game: 'crash' | 'coinflip' | 'rolls';
  playerId: string;
  playerName: string;
  amount: number;
  multiplier?: number;
  profit: number;
  timestamp: number;
  type: 'win' | 'loss';
}

interface WSMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(customUrl?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [balance, setBalance] = useState(1000);
  const [crashState, setCrashState] = useState<CrashGameState>({
    status: 'waiting',
    multiplier: 1.0,
    crashPoint: 0,
    startTime: 0,
    countdown: 12,
    bets: [],
  });
  const [coinflipState, setCoinflipState] = useState<CoinflipGameState>({ status: 'idle' });
  const [rollsState, setRollsState] = useState<RollsGameState>({
    status: 'waiting',
    totalPot: 0,
    bets: [],
  });
  const [liveFeed, setLiveFeed] = useState<LiveBetFeed[]>([]);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // If already connected, don't reconnect
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any existing reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Determine the WebSocket URL
      let wsUrl: string;
      if (customUrl) {
        wsUrl = customUrl;
      } else {
        // Connect to WebSocket on the same host and port (server runs Vite in middleware mode)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              setPlayerId(message.playerId);
              setPlayerName(message.playerName);
              setBalance(message.balance);
              if (message.gameState) {
                setCrashState(message.gameState);
              }
              if (message.crashHistory) {
                setCrashHistory(message.crashHistory);
              }
              break;

            case 'balanceUpdate':
              setBalance(message.balance);
              break;

            case 'gameStart':
              if (message.gameState) {
                setCrashState({
                  ...message.gameState,
                  status: 'running',
                  multiplier: 1.0,
                  startTime: Date.now()
                });
              }
              break;

            case 'gameUpdate':
              if (message.gameState) {
                setCrashState(prev => ({
                  ...prev,
                  status: 'running',
                  multiplier: message.gameState.multiplier,
                  bets: message.gameState.bets || prev.bets
                }));
              }
              break;

            case 'gameCrash':
              if (message.gameState) {
                setCrashState(prev => ({
                  ...prev,
                  status: 'crashed',
                  multiplier: message.gameState.multiplier,
                  crashPoint: message.gameState.crashPoint,
                  bets: message.gameState.bets || prev.bets
                }));
              }
              if (message.crashHistory) {
                setCrashHistory(message.crashHistory);
              }
              break;

            case 'countdown':
              if (message.gameState) {
                setCrashState({
                  ...message.gameState,
                  status: 'waiting',
                  countdown: message.countdown || 12
                });
              } else {
                setCrashState(prev => ({
                  ...prev,
                  status: 'waiting',
                  multiplier: 1.0,
                  crashPoint: 0,
                  startTime: 0,
                  countdown: message.countdown || 12
                }));
              }
              break;

            case 'betUpdate':
              if (message.gameState) {
                setCrashState(prev => ({
                  ...prev,
                  bets: message.gameState.bets || []
                }));
              }
              break;

            case 'crashHistory':
              setCrashHistory(message.history || []);
              break;

            case 'coinflipUpdate':
              setCoinflipState(message.state);
              break;

            case 'rollsUpdate':
              setRollsState(message.state);
              break;

            case 'liveFeed':
              setLiveFeed(message.feed || []);
              break;

            case 'betPlaced':
              if (message.gameState) {
                setCrashState(prev => ({
                  ...prev,
                  bets: message.gameState.bets || prev.bets
                }));
              }
              if (message.balance !== undefined) {
                setBalance(message.balance);
              }
              break;

            case 'betCashedOut':
              if (message.gameState) {
                setCrashState(prev => ({
                  ...prev,
                  bets: message.gameState.bets || prev.bets
                }));
              }
              if (message.balance !== undefined) {
                setBalance(message.balance);
              }
              break;

            case 'crashBetPlaced':
            case 'crashCashedOut':
              // Legacy handlers - kept for compatibility
              break;

            case 'error':
              console.error('WebSocket error:', message.message);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, 2000 * reconnectAttempts.current);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Try to reconnect on error
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [customUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    playerId,
    playerName,
    balance,
    crashState,
    coinflipState,
    rollsState,
    liveFeed,
    crashHistory,
    sendMessage,
  };
}