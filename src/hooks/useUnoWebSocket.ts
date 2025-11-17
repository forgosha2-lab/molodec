import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WSClientMessage, WSServerMessage, GameRoom } from '@/shared/uno-schema';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useUnoWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

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
        path: '/ws-uno',
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('UNO WebSocket connected');
        setStatus('connected');
        setError(null);
      });

      socket.on('room_created', (data: any) => {
        setRoom(data.room);
        setPlayerId(data.playerId);
      });

      socket.on('room_joined', (data: any) => {
        setRoom(data.room);
        setPlayerId(data.playerId);
      });

      socket.on('game_state_update', (data: any) => {
        setRoom(data.room);
      });

      socket.on('player_joined', (data: any) => {
        setRoom(data.room);
      });

      socket.on('player_left', (data: any) => {
        setRoom(data.room);
      });

      socket.on('game_over', (data: any) => {
        setRoom(data.room);
      });

      socket.on('error', (data: any) => {
        setError(data.message);
        console.error('UNO WebSocket error:', data.message);
      });

      socket.on('disconnect', (reason) => {
        console.log('UNO WebSocket disconnected:', reason);
        setStatus('disconnected');
        
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('connect_error', (err) => {
        console.error('UNO WebSocket connection error:', err);
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
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setStatus('disconnected');
    setRoom(null);
    setPlayerId(null);
  }, []);

  const sendMessage = useCallback((message: WSClientMessage) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(message.type, message);
    } else {
      setError('Нет подключения к серверу');
      console.warn('Cannot send message - socket not connected');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connect]);

  return {
    status,
    room,
    playerId,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}
