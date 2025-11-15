import { randomUUID } from 'crypto';

// Create a full UNO deck (108 cards)
export function createDeck() {
  const deck = [];
  const colors = ['red', 'yellow', 'green', 'blue'];

  colors.forEach(color => {
    deck.push({ id: randomUUID(), color, type: 'number', value: 0 });

    for (let i = 1; i <= 9; i++) {
      deck.push({ id: randomUUID(), color, type: 'number', value: i });
      deck.push({ id: randomUUID(), color, type: 'number', value: i });
    }

    deck.push({ id: randomUUID(), color, type: 'skip', value: null });
    deck.push({ id: randomUUID(), color, type: 'skip', value: null });

    deck.push({ id: randomUUID(), color, type: 'reverse', value: null });
    deck.push({ id: randomUUID(), color, type: 'reverse', value: null });

    deck.push({ id: randomUUID(), color, type: 'draw2', value: null });
    deck.push({ id: randomUUID(), color, type: 'draw2', value: null });
  });

  for (let i = 0; i < 4; i++) {
    deck.push({ id: randomUUID(), color: 'wild', type: 'wild', value: null });
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ id: randomUUID(), color: 'wild', type: 'wild_draw4', value: null });
  }

  return deck;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(players, drawPile) {
  const updatedPlayers = players.map(player => ({
    ...player,
    cards: [],
    hasCalledUno: false,
  }));

  let remainingDrawPile = [...drawPile];

  for (let i = 0; i < 7; i++) {
    updatedPlayers.forEach(player => {
      if (remainingDrawPile.length > 0) {
        player.cards.push(remainingDrawPile.pop());
      }
    });
  }

  return { players: updatedPlayers, drawPile: remainingDrawPile };
}

export function isValidPlay(card, topCard, selectedColor) {
  if (card.type === 'wild' || card.type === 'wild_draw4') {
    return true;
  }

  const matchColor = selectedColor || topCard.color;
  if (card.color === matchColor && matchColor !== 'wild') {
    return true;
  }

  if (card.type === topCard.type && card.type !== 'number') {
    return true;
  }

  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }

  return false;
}

export function applyCardEffect(room, playedCard, selectedColor) {
  let updatedRoom = { ...room };

  if (playedCard.type !== 'wild' && playedCard.type !== 'wild_draw4') {
    updatedRoom.selectedColor = null;
  }

  switch (playedCard.type) {
    case 'skip':
      updatedRoom = moveToNextPlayer(updatedRoom);
      break;

    case 'reverse':
      updatedRoom.direction = updatedRoom.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
      if (updatedRoom.players.length === 2) {
        updatedRoom = moveToNextPlayer(updatedRoom);
      }
      break;

    case 'draw2':
      updatedRoom.mustDrawCount = 2;
      break;

    case 'wild':
      if (selectedColor && selectedColor !== 'wild') {
        updatedRoom.selectedColor = selectedColor;
      }
      break;

    case 'wild_draw4':
      updatedRoom.mustDrawCount = 4;
      if (selectedColor && selectedColor !== 'wild') {
        updatedRoom.selectedColor = selectedColor;
      }
      break;
  }

  return updatedRoom;
}

export function moveToNextPlayer(room) {
  const playerCount = room.players.length;
  let nextIndex;

  if (room.direction === 'clockwise') {
    nextIndex = (room.currentPlayerIndex + 1) % playerCount;
  } else {
    nextIndex = (room.currentPlayerIndex - 1 + playerCount) % playerCount;
  }

  return {
    ...room,
    currentPlayerIndex: nextIndex,
  };
}

export function drawCards(drawPile, discardPile, count) {
  let updatedDrawPile = [...drawPile];
  let updatedDiscardPile = [...discardPile];
  const drawnCards = [];

  for (let i = 0; i < count; i++) {
    if (updatedDrawPile.length === 0 && updatedDiscardPile.length > 1) {
      const topCard = updatedDiscardPile.pop();
      updatedDrawPile = shuffleDeck(updatedDiscardPile);
      updatedDiscardPile = [topCard];
    }

    if (updatedDrawPile.length > 0) {
      drawnCards.push(updatedDrawPile.pop());
    }
  }

  return { drawnCards, drawPile: updatedDrawPile, discardPile: updatedDiscardPile };
}

export function checkWin(player) {
  return player.cards.length === 0;
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function initializeGame(room) {
  let deck = createDeck();
  deck = shuffleDeck(deck);

  const { players, drawPile } = dealCards(room.players, deck);

  let firstCard = drawPile.pop();
  while (firstCard.type !== 'number') {
    drawPile.unshift(firstCard);
    firstCard = drawPile.pop();
  }

  return {
    ...room,
    players,
    drawPile,
    discardPile: [firstCard],
    currentPlayerIndex: 0,
    direction: 'clockwise',
    gameState: 'playing',
    selectedColor: null,
    mustDrawCount: 0,
  };
}

export function sanitizeRoomForPlayer(room, playerId) {
  return {
    ...room,
    drawPile: room.drawPile.map(() => ({
      id: 'hidden',
      color: 'wild',
      type: 'wild',
      value: null,
    })),
    players: room.players.map(player => {
      if (player.id === playerId) {
        return player;
      } else {
        return {
          ...player,
          cards: player.cards.map(() => ({
            id: 'hidden',
            color: 'wild',
            type: 'wild',
            value: null,
          })),
        };
      }
    }),
  };
}

