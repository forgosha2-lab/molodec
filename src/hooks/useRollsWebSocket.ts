import { useState, useEffect, useRef, useCallback } from 'react';

interface RollsGameState {
  status: 'waiting' | 'countdown' | 'spinning' | 'result';
  totalPot: number;
  timeRemaining?: number;
  bets: Array<{
    id: string;
    playerId: string;
    playerName: string;
    amount: number;
    color: string;
    percentage: number;
    startAngle: number;
    endAngle: number;
    avatar_url?: string;
  }>;
  winnerBet?: {
    id: string;
    playerId: string;
    playerName: string;
    amount: number;
    color: string;
  } | null;
  rotation?: number;
}

interface RollsPlayer {
  id: string;
  name: string;
  balance: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useRollsWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [gameState, setGameState] = useState<RollsGameState>({
    status: 'waiting',
    totalPot: 0,
    bets: [],
  });
  const [player, setPlayer] = useState<RollsPlayer | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    setError(null);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws-rolls`;
    
    try {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Rolls WebSocket connected');
        setStatus('connected');
        setError(null);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'CONNECTION_ACK':
              console.log('Connection acknowledged:', message.data);
              if (message.data.state) {
                setGameState(message.data.state);
              }
              break;

            case 'JOIN_ACK':
              console.log('Join acknowledged:', message.data);
              if (message.data.playerId) {
                setPlayer({
                  id: message.data.playerId,
                  name: message.data.playerName || 'Игрок',
                  balance: message.data.balance || 100,
                });
              }
              if (message.data.state) {
                setGameState(message.data.state);
              }
              break;

            case 'BALANCE_UPDATE':
              if (message.data.newBalance !== undefined) {
                setPlayer(prev => prev ? { ...prev, balance: message.data.newBalance } : prev);
              }
              break;

            case 'ROUND_CANCELLED':
              if (message.data.newBalance !== undefined) {
                setPlayer(prev => prev ? { ...prev, balance: message.data.newBalance } : prev);
              }
              break;

            case 'STATE_SYNC':
              setGameState(message.data);
              break;

            case 'BET_PLACED':
              if (message.data.player) {
                setPlayer(message.data.player);
              }
              if (message.data.gameState) {
                setGameState(message.data.gameState);
              }
              break;

            case 'CHAT_MESSAGE':
              if (message.data.message) {
                setChatMessages(prev => [...prev, message.data.message]);
              }
              break;

            case 'ERROR':
              setError(message.data.message || 'Unknown error');
              console.error('Rolls WebSocket error:', message.data.message);
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        console.log('Rolls WebSocket disconnected');
        setStatus('disconnected');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.error('Rolls WebSocket connection error:', err);
        setStatus('error');
        setError('Ошибка подключения к серверу');
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setStatus('error');
      setError('Не удалось подключиться к серверу');
    }
  }, []);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setStatus('disconnected');
    setPlayer(null);
    setGameState({
      status: 'waiting',
      totalPot: 0,
      bets: [],
    });
  }, []);

  const sendMessage = useCallback((type: string, data?: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data }));
    } else {
      setError('Нет подключения к серверу');
    }
  }, []);

  const joinGame = useCallback((userId: string, username: string) => {
    sendMessage('JOIN', { userId, username });
  }, [sendMessage]);

  const placeBet = useCallback((amount: number, color: string, userId: string) => {
    sendMessage('PLACE_BET', { amount, color, userId });
  }, [sendMessage]);

  const cancelBet = useCallback(() => {
    sendMessage('CANCEL_BET', {});
  }, [sendMessage]);

  const sendChatMessage = useCallback((text: string) => {
    sendMessage('CHAT_MESSAGE', { message: text });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    
    return () => {
      // Clear reconnect timeout on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Keep connection alive - don't disconnect on unmount
    };
  }, [connect]);

  return {
    status,
    gameState,
    player,
    chatMessages,
    error,
    joinGame,
    placeBet,
    cancelBet,
    sendChatMessage,
    connect,
    disconnect,
  };
}
