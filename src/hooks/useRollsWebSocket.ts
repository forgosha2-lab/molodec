import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface RollsGameState {
  status: 'waiting' | 'countdown' | 'spinning' | 'result';
  totalPot: number;
  countdown?: number;
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
  spinResult?: {
    winningColor: string;
    winningAngle: number;
    winner?: {
      id: string;
      name: string;
      amount: number;
    };
  };
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
  
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setStatus('connecting');
    setError(null);

    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const socketUrl = `${protocol}//${window.location.host}`;
    
    try {
      const socket = io(socketUrl, {
        path: '/ws-rolls',
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Rolls WebSocket connected');
        setStatus('connected');
        setError(null);
      });

      socket.on('CONNECTION_ACK', (data: any) => {
        console.log('Connection acknowledged:', data);
        if (data.state) {
          setGameState(data.state);
        }
      });

      socket.on('JOIN_ACK', (data: any) => {
        console.log('Join acknowledged:', data);
        if (data.playerId) {
          setPlayer({
            id: data.playerId,
            name: data.playerName || 'Игрок',
            balance: data.balance || 100,
          });
        }
        if (data.state) {
          setGameState(data.state);
        }
      });

      socket.on('BALANCE_UPDATE', (data: any) => {
        if (data.newBalance !== undefined) {
          setPlayer(prev => prev ? { ...prev, balance: data.newBalance } : prev);
        }
      });

      socket.on('ROUND_CANCELLED', (data: any) => {
        if (data.newBalance !== undefined) {
          setPlayer(prev => prev ? { ...prev, balance: data.newBalance } : prev);
        }
      });

      socket.on('STATE_SYNC', (state: RollsGameState) => {
        setGameState(state);
      });

      socket.on('BET_PLACED', (data: any) => {
        if (data.player) {
          setPlayer(data.player);
        }
        if (data.gameState) {
          setGameState(data.gameState);
        }
      });

      socket.on('CHAT_MESSAGE', (data: any) => {
        if (data.message) {
          setChatMessages(prev => [...prev, data.message]);
        }
      });

      socket.on('ERROR', (data: any) => {
        setError(data.message || 'Unknown error');
        console.error('Rolls WebSocket error:', data.message);
      });

      socket.on('disconnect', (reason) => {
        console.log('Rolls WebSocket disconnected:', reason);
        setStatus('disconnected');
        
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('connect_error', (err) => {
        console.error('Rolls WebSocket connection error:', err);
        setStatus('error');
        setError('Ошибка подключения к серверу');
      });
    } catch (err) {
      console.error('Failed to create socket.io connection:', err);
      setStatus('error');
      setError('Не удалось подключиться к серверу');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
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

  const joinGame = useCallback((userId: string, username: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('JOIN', { userId, username });
    } else {
      setError('Нет подключения к серверу');
    }
  }, []);

  const placeBet = useCallback((amount: number, color: string, userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('PLACE_BET', { amount, color, userId });
    } else {
      setError('Нет подключения к серверу');
    }
  }, []);

  const cancelBet = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('CANCEL_BET', {});
    } else {
      setError('Нет подключения к серверу');
    }
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('CHAT_MESSAGE', { message: text });
    } else {
      setError('Нет подключения к серверу');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
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
