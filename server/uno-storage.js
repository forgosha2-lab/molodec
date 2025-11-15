import { randomUUID } from 'crypto';

export class UnoStorage {
  constructor() {
    this.rooms = new Map();
    this.roomCodes = new Map();
    this.playerConnections = new Map();
    this.playerRooms = new Map();
  }

  createRoom(code) {
    const roomId = randomUUID();
    const room = {
      id: roomId,
      code,
      players: [],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      drawPile: [],
      discardPile: [],
      gameState: 'waiting',
      selectedColor: null,
      winner: null,
      mustDrawCount: 0,
    };

    this.rooms.set(roomId, room);
    this.roomCodes.set(code, roomId);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code) {
    const roomId = this.roomCodes.get(code);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  updateRoom(roomId, room) {
    this.rooms.set(roomId, room);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      this.roomCodes.delete(room.code);
      this.rooms.delete(roomId);
      room.players.forEach(player => {
        this.playerRooms.delete(player.id);
      });
    }
  }

  addPlayerConnection(playerId, ws) {
    this.playerConnections.set(playerId, ws);
  }

  removePlayerConnection(playerId) {
    this.playerConnections.delete(playerId);
  }

  getPlayerConnection(playerId) {
    return this.playerConnections.get(playerId);
  }

  getPlayerRoom(playerId) {
    return this.playerRooms.get(playerId);
  }

  setPlayerRoom(playerId, roomId) {
    this.playerRooms.set(playerId, roomId);
  }

  removePlayerFromRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.players.length === 0) {
          this.deleteRoom(roomId);
        } else {
          this.updateRoom(roomId, room);
        }
      }
      this.playerRooms.delete(playerId);
    }
  }
}

