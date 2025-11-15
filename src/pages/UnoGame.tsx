import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUnoWebSocket } from "@/hooks/useUnoWebSocket";
import UnoLobby from "./uno/UnoLobby";
import UnoWaitingRoom from "./uno/UnoWaitingRoom";
import UnoGameBoard from "./uno/UnoGameBoard";
import { telegram } from "@/lib/telegram";
import { auth } from "@/integrations/database";

const UnoGame = () => {
  const navigate = useNavigate();
  const { status, room, playerId, error, sendMessage } = useUnoWebSocket();
  const [username, setUsername] = useState("Игрок");

  useEffect(() => {
    initTelegramAuth();
  }, []);

  const initTelegramAuth = async () => {
    try {
      const telegramUserId = telegram.getUserId();
      const telegramUsername = telegram.getUsername();
      
      setUsername(telegramUsername || "Игрок");
    } catch (error) {
      console.error('Telegram auth error:', error);
    }
  };

  const handleCreateRoom = (playerName: string) => {
    sendMessage({
      type: 'create_room',
      playerName: playerName || username,
    });
  };

  const handleJoinRoom = (roomCode: string, playerName: string) => {
    sendMessage({
      type: 'join_room',
      roomCode,
      playerName: playerName || username,
    });
  };

  const handleStartGame = () => {
    if (room) {
      sendMessage({
        type: 'start_game',
        roomId: room.id,
      });
    }
  };

  const handlePlayCard = (cardId: string, selectedColor?: 'red' | 'yellow' | 'green' | 'blue') => {
    if (room) {
      sendMessage({
        type: 'play_card',
        roomId: room.id,
        cardId,
        selectedColor,
      });
    }
  };

  const handleDrawCard = () => {
    if (room) {
      sendMessage({
        type: 'draw_card',
        roomId: room.id,
      });
    }
  };

  const handleCallUno = () => {
    if (room) {
      sendMessage({
        type: 'call_uno',
        roomId: room.id,
      });
    }
  };

  const handleLeaveRoom = () => {
    navigate("/");
  };

  if (!room || !playerId) {
    return <UnoLobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  if (room.gameState === 'waiting') {
    return (
      <UnoWaitingRoom
        room={room}
        currentPlayerId={playerId}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (room.gameState === 'playing' || room.gameState === 'finished') {
    return (
      <UnoGameBoard
        room={room}
        currentPlayerId={playerId}
        onPlayCard={handlePlayCard}
        onDrawCard={handleDrawCard}
        onCallUno={handleCallUno}
        onBackToLobby={handleLeaveRoom}
      />
    );
  }

  return <UnoLobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
};

export default UnoGame;
