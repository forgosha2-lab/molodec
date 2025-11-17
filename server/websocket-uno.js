import { Server as SocketIOServer } from 'socket.io';
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
  const io = new SocketIOServer(httpServer, {
    path: '/ws-uno',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const storage = new UnoStorage();
  const socketToPlayer = new Map();

  io.on('connection', (socket) => {
    console.log('New UNO WebSocket connection');

    socket.on('create_room', (data) => {
      handleCreateRoom(socket, data.playerName);
    });

    socket.on('join_room', (data) => {
      handleJoinRoom(socket, data.roomCode, data.playerName);
    });

    socket.on('start_game', (data) => {
      handleStartGame(socket, data.roomId);
    });

    socket.on('play_card', (data) => {
      handlePlayCard(socket, data.roomId, data.cardId, data.selectedColor);
    });

    socket.on('draw_card', (data) => {
      handleDrawCard(socket, data.roomId);
    });

    socket.on('call_uno', (data) => {
      handleCallUno(socket, data.roomId);
    });

    socket.on('disconnect', () => {
      console.log('UNO WebSocket connection closed');
      handleDisconnect(socket);
    });
  });

  function handleCreateRoom(socket, playerName) {
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
    storage.addPlayerConnection(playerId, socket);
    storage.setPlayerRoom(playerId, room.id);
    socketToPlayer.set(socket.id, playerId);

    socket.emit('room_created', {
      room: sanitizeRoomForPlayer(room, playerId),
      playerId,
    });
  }

  function handleJoinRoom(socket, roomCode, playerName) {
    const room = storage.getRoomByCode(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    if (room.gameState !== 'waiting') {
      socket.emit('error', { message: 'Игра уже началась' });
      return;
    }

    if (room.players.length >= 4) {
      socket.emit('error', { message: 'Комната заполнена' });
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
    storage.addPlayerConnection(playerId, socket);
    storage.setPlayerRoom(playerId, room.id);
    socketToPlayer.set(socket.id, playerId);

    socket.emit('room_joined', {
      room: sanitizeRoomForPlayer(room, playerId),
      playerId,
    });

    broadcastToRoomSanitized(room.id, room, 'player_joined', playerId);
  }

  function handleStartGame(socket, roomId) {
    const room = storage.getRoom(roomId);

    if (!room) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', { message: 'Нужно минимум 2 игрока' });
      return;
    }

    if (room.players.length > 4) {
      socket.emit('error', { message: 'Максимум 4 игрока' });
      return;
    }

    const initializedRoom = initializeGame(room);
    storage.updateRoom(roomId, initializedRoom);
    broadcastToRoomSanitized(roomId, initializedRoom, 'game_state_update');
  }

  function handlePlayCard(socket, roomId, cardId, selectedColor) {
    const room = storage.getRoom(roomId);

    if (!room) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    if (room.gameState !== 'playing') {
      socket.emit('error', { message: 'Игра не началась' });
      return;
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const card = currentPlayer.cards.find(c => c.id === cardId);

    if (!card) {
      socket.emit('error', { message: 'Карта не найдена' });
      return;
    }

    const topCard = room.discardPile[room.discardPile.length - 1];
    if (!isValidPlay(card, topCard, room.selectedColor)) {
      socket.emit('error', { message: 'Невозможно сыграть эту карту' });
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
        const playerSocket = storage.getPlayerConnection(player.id);
        if (playerSocket) {
          playerSocket.emit('game_over', {
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

  function handleDrawCard(socket, roomId) {
    const room = storage.getRoom(roomId);

    if (!room) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    if (room.gameState !== 'playing') {
      socket.emit('error', { message: 'Игра не началась' });
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
      socket.emit('error', { message: 'Нет карт в колоде' });
    }
  }

  function handleCallUno(socket, roomId) {
    const room = storage.getRoom(roomId);

    if (!room) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    const playerId = socketToPlayer.get(socket.id);
    if (!playerId) {
      socket.emit('error', { message: 'Игрок не найден' });
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit('error', { message: 'Игрок не в этой комнате' });
      return;
    }

    if (player.cards.length === 1) {
      player.hasCalledUno = true;
      storage.updateRoom(roomId, room);
      broadcastToRoomSanitized(roomId, room, 'game_state_update');
    }
  }

  function handleDisconnect(socket) {
    const playerId = socketToPlayer.get(socket.id);
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
      socketToPlayer.delete(socket.id);
    }
  }

  function broadcastToRoomSanitized(roomId, room, messageType, excludePlayerId) {
    room.players.forEach(player => {
      if (player.id !== excludePlayerId) {
        const playerSocket = storage.getPlayerConnection(player.id);
        if (playerSocket) {
          const sanitizedRoom = sanitizeRoomForPlayer(room, player.id);
          
          if (messageType === 'game_state_update') {
            playerSocket.emit('game_state_update', {
              room: sanitizedRoom,
            });
          } else if (messageType === 'player_joined') {
            playerSocket.emit('player_joined', {
              room: sanitizedRoom,
            });
          } else if (messageType === 'player_left') {
            playerSocket.emit('player_left', {
              room: sanitizedRoom,
              playerId: excludePlayerId || '',
            });
          }
        }
      }
    });
  }

  return io;
}
