import { useState, useEffect, useRef, useCallback } from 'react';
import { WSMessage, WSClientMessage, WSServerMessage, GameRoom } from '@/shared/uno-schema';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useUnoWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    setError(null);

    const isDev = import.meta.env.DEV;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = isDev 
      ? `${protocol}//localhost:3003/ws-uno`
      : `${protocol}//${window.location.hostname}:${window.location.port || (protocol === 'wss:' ? '443' : '80')}/ws-uno`;
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setStatus('connected');
        setError(null);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WSServerMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'room_created':
            case 'room_joined':
              setRoom(message.room);
              setPlayerId(message.playerId);
              break;
              
            case 'game_state_update':
            case 'player_joined':
              setRoom(message.room);
              break;
              
            case 'player_left':
              setRoom(message.room);
              break;
              
            case 'game_over':
              setRoom(message.room);
              break;
              
            case 'error':
              setError(message.message);
              break;
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        setError('Ошибка подключения к серверу');
      };

      ws.current.onclose = () => {
        setStatus('disconnected');
        
        reconnectTimeout.current = setTimeout(() => {
          if (playerId && room) {
            connect();
          }
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setStatus('error');
      setError('Не удалось подключиться к серверу');
    }
  }, [playerId, room]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setStatus('disconnected');
    setRoom(null);
    setPlayerId(null);
  }, []);

  const sendMessage = useCallback((message: WSClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      setError('Нет подключения к серверу');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

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

