import { WebSocketServer, WebSocket } from 'ws';
import { UnoStorage } from './uno-storage.js';
import {
  generateRoomCode,
  initializeGame,
  isValidPlay,
  applyCardEffect,
  moveToNextPlayer,
  drawCards,
  checkWin,
  sanitizeRoomForPlayer,
} from './uno-game-logic.js';
import { randomUUID } from 'crypto';

export function setupUnoWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws-uno' });
  const storage = new UnoStorage();

  wss.on('connection', (ws) => {
    console.log('New UNO WebSocket connection');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing message:', error);
        sendError(ws, 'Неверный формат сообщения');
      }
    });

    ws.on('close', () => {
      console.log('UNO WebSocket connection closed');
      handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('UNO WebSocket error:', error);
    });
  });

  function handleMessage(ws, message) {
    switch (message.type) {
      case 'create_room':
        handleCreateRoom(ws, message.playerName);
        break;
      case 'join_room':
        handleJoinRoom(ws, message.roomCode, message.playerName);
        break;
      case 'start_game':
        handleStartGame(ws, message.roomId);
        break;
      case 'play_card':
        handlePlayCard(ws, message.roomId, message.cardId, message.selectedColor);
        break;
      case 'draw_card':
        handleDrawCard(ws, message.roomId);
        break;
      case 'call_uno':
        handleCallUno(ws, message.roomId);
        break;
      default:
        sendError(ws, 'Неизвестный тип сообщения');
    }
  }

  function handleCreateRoom(ws, playerName) {
    let code = generateRoomCode();
    while (storage.getRoomByCode(code)) {
      code = generateRoomCode();
    }

    const room = storage.createRoom(code);
    const playerId = randomUUID();
    const player = {
      id: playerId,
      name: playerName,
      cards: [],
      hasCalledUno: false,
      isConnected: true,
    };

    room.players.push(player);
    storage.updateRoom(room.id, room);
    storage.addPlayerConnection(playerId, ws);
    storage.setPlayerRoom(playerId, room.id);

    sendMessage(ws, {
      type: 'room_created',
      room: sanitizeRoomForPlayer(room, playerId),
      playerId,
    });
  }

  function handleJoinRoom(ws, roomCode, playerName) {
    const room = storage.getRoomByCode(roomCode);

    if (!room) {
      sendError(ws, 'Комната не найдена');
      return;
    }

    if (room.gameState !== 'waiting') {
      sendError(ws, 'Игра уже началась');
      return;
    }

    if (room.players.length >= 4) {
      sendError(ws, 'Комната заполнена');
      return;
    }

    const playerId = randomUUID();
    const player = {
      id: playerId,
      name: playerName,
      cards: [],
      hasCalledUno: false,
      isConnected: true,
    };

    room.players.push(player);
    storage.updateRoom(room.id, room);
    storage.addPlayerConnection(playerId, ws);
    storage.setPlayerRoom(playerId, room.id);

    sendMessage(ws, {
      type: 'room_joined',
      room: sanitizeRoomForPlayer(room, playerId),
      playerId,
    });

    broadcastToRoomSanitized(room.id, room, 'player_joined', playerId);
  }

  function handleStartGame(ws, roomId) {
    const room = storage.getRoom(roomId);

    if (!room) {
      sendError(ws, 'Комната не найдена');
      return;
    }

    if (room.players.length < 2) {
      sendError(ws, 'Нужно минимум 2 игрока');
      return;
    }

    if (room.players.length > 4) {
      sendError(ws, 'Максимум 4 игрока');
      return;
    }

    const initializedRoom = initializeGame(room);
    storage.updateRoom(roomId, initializedRoom);
    broadcastToRoomSanitized(roomId, initializedRoom, 'game_state_update');
  }

  function handlePlayCard(ws, roomId, cardId, selectedColor) {
    const room = storage.getRoom(roomId);

    if (!room) {
      sendError(ws, 'Комната не найдена');
      return;
    }

    if (room.gameState !== 'playing') {
      sendError(ws, 'Игра не началась');
      return;
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const card = currentPlayer.cards.find(c => c.id === cardId);

    if (!card) {
      sendError(ws, 'Карта не найдена');
      return;
    }

    const topCard = room.discardPile[room.discardPile.length - 1];
    if (!isValidPlay(card, topCard, room.selectedColor)) {
      sendError(ws, 'Невозможно сыграть эту карту');
      return;
    }

    currentPlayer.cards = currentPlayer.cards.filter(c => c.id !== cardId);
    room.discardPile.push(card);

    if (currentPlayer.cards.length !== 1) {
      currentPlayer.hasCalledUno = false;
    }

    let updatedRoom = applyCardEffect(room, card, selectedColor);

    if (checkWin(currentPlayer)) {
      updatedRoom.gameState = 'finished';
      updatedRoom.winner = currentPlayer.id;
      storage.updateRoom(roomId, updatedRoom);

      updatedRoom.players.forEach(player => {
        const playerWs = storage.getPlayerConnection(player.id);
        if (playerWs) {
          sendMessage(playerWs, {
            type: 'game_over',
            room: sanitizeRoomForPlayer(updatedRoom, player.id),
            winner: currentPlayer,
          });
        }
      });
      return;
    }

    updatedRoom = moveToNextPlayer(updatedRoom);

    if (updatedRoom.mustDrawCount > 0) {
      const nextPlayer = updatedRoom.players[updatedRoom.currentPlayerIndex];
      const { drawnCards, drawPile, discardPile } = drawCards(
        updatedRoom.drawPile,
        updatedRoom.discardPile,
        updatedRoom.mustDrawCount
      );

      nextPlayer.cards.push(...drawnCards);
      updatedRoom.drawPile = drawPile;
      updatedRoom.discardPile = discardPile;
      updatedRoom.mustDrawCount = 0;
      updatedRoom = moveToNextPlayer(updatedRoom);
    }

    storage.updateRoom(roomId, updatedRoom);
    broadcastToRoomSanitized(roomId, updatedRoom, 'game_state_update');
  }

  function handleDrawCard(ws, roomId) {
    const room = storage.getRoom(roomId);

    if (!room) {
      sendError(ws, 'Комната не найдена');
      return;
    }

    if (room.gameState !== 'playing') {
      sendError(ws, 'Игра не началась');
      return;
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const { drawnCards, drawPile, discardPile } = drawCards(
      room.drawPile,
      room.discardPile,
      1
    );

    if (drawnCards.length > 0) {
      currentPlayer.cards.push(...drawnCards);
      room.drawPile = drawPile;
      room.discardPile = discardPile;
      currentPlayer.hasCalledUno = false;

      const updatedRoom = moveToNextPlayer(room);
      storage.updateRoom(roomId, updatedRoom);
      broadcastToRoomSanitized(roomId, updatedRoom, 'game_state_update');
    } else {
      sendError(ws, 'Нет карт в колоде');
    }
  }

  function handleCallUno(ws, roomId) {
    const room = storage.getRoom(roomId);

    if (!room) {
      sendError(ws, 'Комната не найдена');
      return;
    }

    const playerId = findPlayerIdByConnection(ws);
    if (!playerId) {
      sendError(ws, 'Игрок не найден');
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      sendError(ws, 'Игрок не в этой комнате');
      return;
    }

    if (player.cards.length === 1) {
      player.hasCalledUno = true;
      storage.updateRoom(roomId, room);
      broadcastToRoomSanitized(roomId, room, 'game_state_update');
    }
  }

  function handleDisconnect(ws) {
    const playerId = findPlayerIdByConnection(ws);
    if (playerId) {
      const roomId = storage.getPlayerRoom(playerId);
      if (roomId) {
        const room = storage.getRoom(roomId);
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.isConnected = false;
          }

          if (room.gameState === 'waiting') {
            storage.removePlayerFromRoom(playerId);
            const updatedRoom = storage.getRoom(roomId);
            if (updatedRoom) {
              broadcastToRoomSanitized(roomId, updatedRoom, 'player_left', playerId);
            }
          } else {
            storage.updateRoom(roomId, room);
            broadcastToRoomSanitized(roomId, room, 'game_state_update');
          }
        }
      }
      storage.removePlayerConnection(playerId);
    }
  }

  function findPlayerIdByConnection(ws) {
    // Get all rooms from storage
    const allPlayerIds = Array.from(storage.playerRooms.keys());
    for (const playerId of allPlayerIds) {
      const playerWs = storage.getPlayerConnection(playerId);
      if (playerWs === ws) {
        return playerId;
      }
    }
    return null;
  }

  function sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function sendError(ws, errorMessage) {
    sendMessage(ws, {
      type: 'error',
      message: errorMessage,
    });
  }

  function broadcastToRoomSanitized(roomId, room, messageType, excludePlayerId) {
    room.players.forEach(player => {
      if (player.id !== excludePlayerId) {
        const ws = storage.getPlayerConnection(player.id);
        if (ws) {
          const sanitizedRoom = sanitizeRoomForPlayer(room, player.id);
          
          if (messageType === 'game_state_update') {
            sendMessage(ws, {
              type: 'game_state_update',
              room: sanitizedRoom,
            });
          } else if (messageType === 'player_joined') {
            sendMessage(ws, {
              type: 'player_joined',
              room: sanitizedRoom,
            });
          } else if (messageType === 'player_left') {
            sendMessage(ws, {
              type: 'player_left',
              room: sanitizedRoom,
              playerId: excludePlayerId || '',
            });
          }
        }
      }
    });
  }

  return wss;
}

