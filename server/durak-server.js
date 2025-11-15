// Durak game server logic
// Based on DurakGame/server implementation

const Suit = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
};

const Rank = {
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  JACK: 'В',
  QUEEN: 'Д',
  KING: 'К',
  ACE: 'Т',
};

const rankValues = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'В': 11,
  'Д': 12,
  'К': 13,
  'Т': 14,
};

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function createDeck() {
  const deck = [];
  const suits = Object.values(Suit);
  const ranks = Object.values(Rank);

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: randomUUID(),
        suit,
        rank,
      });
    }
  }

  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function initializeGame(numberOfPlayers) {
  let deck = createDeck();
  deck = shuffleDeck(deck);

  const players = [
    {
      id: 'player',
      name: 'Вы',
      hand: [],
      isAI: false,
      isOut: false,
    },
  ];

  for (let i = 1; i < numberOfPlayers; i++) {
    players.push({
      id: `ai-${i}`,
      name: `Игрок ${i + 1}`,
      hand: [],
      isAI: true,
      isOut: false,
    });
  }

  // Deal 6 cards to each player
  for (let i = 0; i < 6; i++) {
    for (const player of players) {
      const card = deck.pop();
      if (card) player.hand.push(card);
    }
  }

  // Set trump card
  const trumpCard = deck.pop() || null;
  const trumpSuit = trumpCard?.suit || null;

  // Put trump card at the bottom of deck
  if (trumpCard) {
    deck.unshift(trumpCard);
  }

  // Find player with lowest trump
  let firstAttackerIndex = 0;
  if (trumpSuit) {
    let lowestTrumpValue = Infinity;
    players.forEach((player, index) => {
      player.hand.forEach(card => {
        if (card.suit === trumpSuit) {
          const value = rankValues[card.rank];
          if (value < lowestTrumpValue) {
            lowestTrumpValue = value;
            firstAttackerIndex = index;
          }
        }
      });
    });
  }

  return {
    players,
    deck,
    trumpCard,
    trumpSuit,
    discardPile: [],
    battlePairs: [],
    currentAttackerIndex: firstAttackerIndex,
    currentDefenderIndex: (firstAttackerIndex + 1) % players.length,
    phase: 'attacking',
    canThrow: false,
    winner: null,
    loser: null,
  };
}

function canBeat(attackCard, defendCard, trumpSuit) {
  const attackValue = rankValues[attackCard.rank];
  const defendValue = rankValues[defendCard.rank];

  // Same suit - higher rank wins
  if (attackCard.suit === defendCard.suit) {
    return defendValue > attackValue;
  }

  // Defend with trump if attack is not trump
  if (defendCard.suit === trumpSuit && attackCard.suit !== trumpSuit) {
    return true;
  }

  return false;
}

function canThrowCard(card, battlePairs) {
  if (battlePairs.length === 0) return false;

  const ranksOnTable = new Set();
  battlePairs.forEach(pair => {
    ranksOnTable.add(pair.attackCard.rank);
    if (pair.defendCard) {
      ranksOnTable.add(pair.defendCard.rank);
    }
  });

  return ranksOnTable.has(card.rank);
}

function attackWithCards(state, cardIds) {
  const attacker = state.players[state.currentAttackerIndex];
  const defender = state.players[state.currentDefenderIndex];

  if (state.phase !== 'attacking') {
    return { success: false, message: 'Сейчас не фаза атаки' };
  }

  // Check if cards exist in attacker's hand
  const cards = cardIds.map(id => attacker.hand.find(c => c.id === id)).filter(Boolean);
  
  if (cards.length !== cardIds.length) {
    return { success: false, message: 'Некоторые карты не найдены в руке' };
  }

  // First attack - all cards must be same rank
  if (state.battlePairs.length === 0) {
    if (cards.length > 1) {
      const firstRank = cards[0].rank;
      if (!cards.every(c => c.rank === firstRank)) {
        return { success: false, message: 'При первой атаке все карты должны быть одного достоинства' };
      }
    }
  } else {
    // Throwing - cards must match ranks on table
    for (const card of cards) {
      if (!canThrowCard(card, state.battlePairs)) {
        return { success: false, message: `Карту ${card.rank}${card.suit} нельзя подкинуть` };
      }
    }
  }

  // Check defender has enough cards
  const undefendedPairs = state.battlePairs.filter(p => !p.defendCard).length;
  if (undefendedPairs + cards.length > defender.hand.length) {
    return { success: false, message: 'Нельзя подкинуть больше карт, чем у защищающегося' };
  }

  // Remove cards from attacker and add to battle
  const newState = { ...state };
  newState.players = state.players.map((p, i) => {
    if (i === state.currentAttackerIndex) {
      return {
        ...p,
        hand: p.hand.filter(c => !cardIds.includes(c.id)),
      };
    }
    return p;
  });

  newState.battlePairs = [
    ...state.battlePairs,
    ...cards.map(card => ({ attackCard: card })),
  ];

  newState.phase = 'defending';

  return { success: true, message: 'Карты сыграны', state: newState };
}

function defendWithCard(state, defendCardId, attackCardId) {
  const defender = state.players[state.currentDefenderIndex];

  if (state.phase !== 'defending') {
    return { success: false, message: 'Сейчас не фаза защиты' };
  }

  const defendCard = defender.hand.find(c => c.id === defendCardId);
  if (!defendCard) {
    return { success: false, message: 'Карта не найдена' };
  }

  const pairIndex = state.battlePairs.findIndex(p => p.attackCard.id === attackCardId && !p.defendCard);
  if (pairIndex === -1) {
    return { success: false, message: 'Атакующая карта не найдена' };
  }

  const attackCard = state.battlePairs[pairIndex].attackCard;
  if (!canBeat(attackCard, defendCard, state.trumpSuit)) {
    return { success: false, message: 'Эта карта не может побить атакующую' };
  }

  const newState = { ...state };
  newState.players = state.players.map((p, i) => {
    if (i === state.currentDefenderIndex) {
      return {
        ...p,
        hand: p.hand.filter(c => c.id !== defendCardId),
      };
    }
    return p;
  });

  newState.battlePairs = state.battlePairs.map((pair, i) => {
    if (i === pairIndex) {
      return { ...pair, defendCard };
    }
    return pair;
  });

  // Check if all cards are defended
  const allDefended = newState.battlePairs.every(p => p.defendCard);
  if (allDefended) {
    newState.canThrow = true;
    newState.phase = 'attacking';
  }

  return { success: true, message: 'Карта отбита', state: newState };
}

function takeCards(state) {
  const defender = state.players[state.currentDefenderIndex];
  const allCards = [];
  
  state.battlePairs.forEach(pair => {
    allCards.push(pair.attackCard);
    if (pair.defendCard) {
      allCards.push(pair.defendCard);
    }
  });

  const newState = { ...state };
  newState.players = state.players.map((p, i) => {
    if (i === state.currentDefenderIndex) {
      return {
        ...p,
        hand: [...p.hand, ...allCards],
      };
    }
    return p;
  });

  newState.battlePairs = [];
  newState.phase = 'attacking';
  newState.canThrow = false;

  // Move to next attacker (skip defender)
  let nextAttackerIndex = (state.currentAttackerIndex + 1) % state.players.length;
  while (nextAttackerIndex === state.currentDefenderIndex || newState.players[nextAttackerIndex].isOut) {
    nextAttackerIndex = (nextAttackerIndex + 1) % state.players.length;
  }
  newState.currentAttackerIndex = nextAttackerIndex;
  newState.currentDefenderIndex = (nextAttackerIndex + 1) % state.players.length;

  return refillHands(newState);
}

function passAttack(state) {
  // All cards defended - move to discard
  state.battlePairs.forEach(pair => {
    state.discardPile.push(pair.attackCard);
    if (pair.defendCard) {
      state.discardPile.push(pair.defendCard);
    }
  });

  const newState = { ...state };
  newState.battlePairs = [];
  newState.canThrow = false;
  
  // Defender becomes attacker
  newState.currentAttackerIndex = state.currentDefenderIndex;
  let nextDefenderIndex = (state.currentDefenderIndex + 1) % state.players.length;
  while (newState.players[nextDefenderIndex].isOut) {
    nextDefenderIndex = (nextDefenderIndex + 1) % state.players.length;
  }
  newState.currentDefenderIndex = nextDefenderIndex;

  return refillHands(newState);
}

function refillHands(state) {
  const newState = { ...state };
  
  // Refill in order: attacker first, then others clockwise, defender last
  const refillOrder = [];
  let index = state.currentAttackerIndex;
  for (let i = 0; i < state.players.length; i++) {
    if (!state.players[index].isOut) {
      refillOrder.push(index);
    }
    index = (index + 1) % state.players.length;
    if (index === state.currentDefenderIndex) {
      // Add defender last
      const defenderIndex = index;
      index = (index + 1) % state.players.length;
      for (let j = i + 1; j < state.players.length - 1; j++) {
        if (!state.players[index].isOut) {
          refillOrder.push(index);
        }
        index = (index + 1) % state.players.length;
      }
      if (!state.players[defenderIndex].isOut) {
        refillOrder.push(defenderIndex);
      }
      break;
    }
  }

  for (const playerIndex of refillOrder) {
    const player = newState.players[playerIndex];
    while (player.hand.length < 6 && newState.deck.length > 0) {
      const card = newState.deck.pop();
      if (card) {
        player.hand.push(card);
      }
    }
  }

  // Check if game is over
  return checkGameEnd(newState);
}

function checkGameEnd(state) {
  if (state.deck.length > 0) {
    return state;
  }

  // Deck is empty - check for players with no cards
  const newState = { ...state };
  newState.players = state.players.map(p => {
    if (p.hand.length === 0 && !p.isOut) {
      return { ...p, isOut: true };
    }
    return p;
  });

  const playersStillIn = newState.players.filter(p => !p.isOut);
  
  if (playersStillIn.length <= 1) {
    newState.phase = 'ended';
    if (playersStillIn.length === 1) {
      newState.loser = playersStillIn[0].name;
    }
    const winnersOrOut = newState.players.filter(p => p.isOut);
    if (winnersOrOut.length > 0) {
      newState.winner = winnersOrOut[0].name;
    }
  }

  return newState;
}

// AI Player logic (simplified)
function getAIAttackCards(state, playerId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.hand.length === 0) return [];

  const defender = state.players[state.currentDefenderIndex];

  // First attack - choose lowest cards of same rank
  if (state.battlePairs.length === 0) {
    const rankGroups = new Map();
    player.hand.forEach(card => {
      const group = rankGroups.get(card.rank) || [];
      group.push(card);
      rankGroups.set(card.rank, group);
    });

    let bestGroup = [];
    let bestScore = Infinity;

    rankGroups.forEach((cards, rank) => {
      const value = rankValues[rank];
      const score = value - (cards.length * 2);
      if (score < bestScore && cards.length <= defender.hand.length) {
        bestScore = score;
        bestGroup = cards;
      }
    });

    return bestGroup.length > 0 ? [bestGroup[0].id] : [player.hand[0].id];
  }

  // Throwing
  const throwableCards = player.hand.filter(card => 
    canThrowCard(card, state.battlePairs)
  );

  if (throwableCards.length === 0) return [];

  const undefendedCount = state.battlePairs.filter(p => !p.defendCard).length;
  const maxThrows = Math.min(
    throwableCards.length,
    defender.hand.length - undefendedCount
  );

  if (maxThrows <= 0) return [];

  const sorted = throwableCards.sort((a, b) => 
    rankValues[a.rank] - rankValues[b.rank]
  );

  return sorted.slice(0, Math.min(2, maxThrows)).map(c => c.id);
}

function getAIDefendCard(state, playerId, attackCardId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;

  const pair = state.battlePairs.find(p => p.attackCard.id === attackCardId && !p.defendCard);
  if (!pair) return null;

  const attackCard = pair.attackCard;

  const validDefends = player.hand.filter(card => 
    canBeat(attackCard, card, state.trumpSuit)
  );

  if (validDefends.length === 0) return null;

  const nonTrumpDefends = validDefends.filter(c => c.suit !== state.trumpSuit);
  const trumpDefends = validDefends.filter(c => c.suit === state.trumpSuit);

  let chosenCard;

  if (nonTrumpDefends.length > 0) {
    chosenCard = nonTrumpDefends.sort((a, b) => 
      rankValues[a.rank] - rankValues[b.rank]
    )[0];
  } else {
    chosenCard = trumpDefends.sort((a, b) => 
      rankValues[a.rank] - rankValues[b.rank]
    )[0];
  }

  return chosenCard.id;
}

function shouldAITakeCards(state, playerId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return true;

  const undefendedCount = state.battlePairs.filter(p => !p.defendCard).length;
  
  if (undefendedCount === 0) return false;

  let canDefendAll = true;
  const usedCardIds = new Set();

  for (const pair of state.battlePairs) {
    if (pair.defendCard) continue;

    const availableCards = player.hand.filter(c => !usedCardIds.has(c.id));
    const validDefend = availableCards.find(card => 
      canBeat(pair.attackCard, card, state.trumpSuit)
    );

    if (!validDefend) {
      canDefendAll = false;
      break;
    }

    usedCardIds.add(validDefend.id);
  }

  if (canDefendAll) return false;

  const trumpsNeeded = Array.from(usedCardIds).filter(id => {
    const card = player.hand.find(c => c.id === id);
    return card && card.suit === state.trumpSuit;
  }).length;

  return trumpsNeeded > 2 || !canDefendAll;
}

function shouldAIPass(state, playerId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return true;

  const throwableCards = player.hand.filter(card => 
    canThrowCard(card, state.battlePairs)
  );

  if (throwableCards.length === 0) return true;

  return Math.random() < 0.3;
}

async function processAITurns(state) {
  let currentState = { ...state };
  let maxIterations = 50;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    if (currentState.phase === 'ended') break;

    const currentPlayer = currentState.players[
      currentState.phase === 'defending' 
        ? currentState.currentDefenderIndex 
        : currentState.currentAttackerIndex
    ];

    if (!currentPlayer.isAI) break;

    await new Promise(resolve => setTimeout(resolve, 500));

    if (currentState.phase === 'attacking') {
      const cardIds = getAIAttackCards(currentState, currentPlayer.id);
      
      if (cardIds.length === 0 || currentState.canThrow) {
        if (shouldAIPass(currentState, currentPlayer.id)) {
          currentState = passAttack(currentState);
          continue;
        }
      }

      if (cardIds.length > 0) {
        const result = attackWithCards(currentState, cardIds);
        if (result.success && result.state) {
          currentState = result.state;
          continue;
        }
      }

      currentState = passAttack(currentState);
    } else if (currentState.phase === 'defending') {
      const undefendedPairs = currentState.battlePairs.filter(p => !p.defendCard);
      
      if (undefendedPairs.length === 0) {
        currentState.phase = 'attacking';
        continue;
      }

      if (shouldAITakeCards(currentState, currentPlayer.id)) {
        currentState = takeCards(currentState);
        continue;
      }

      const pairToDefend = undefendedPairs[0];
      const defendCardId = getAIDefendCard(
        currentState, 
        currentPlayer.id, 
        pairToDefend.attackCard.id
      );

      if (!defendCardId) {
        currentState = takeCards(currentState);
        continue;
      }

      const result = defendWithCard(currentState, defendCardId, pairToDefend.attackCard.id);
      if (result.success && result.state) {
        currentState = result.state;
        continue;
      }

      currentState = takeCards(currentState);
    }
  }

  return currentState;
}

export function setupDurakRoutes(app, durakGames) {
  // Create new game
  app.post('/api/game/new', async (req, res) => {
    try {
      const { numberOfPlayers = 2 } = req.body;
      const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId || 'player';
      
      const gameState = initializeGame(numberOfPlayers);
      // Update player name if we have user info
      if (userId !== 'player') {
        gameState.players[0].id = userId;
        gameState.players[0].name = 'Вы';
      }

      durakGames.set(userId, gameState);
      res.json({ gameState });
    } catch (error) {
      console.error('Error creating game:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get current game state
  app.get('/api/game/state', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] || req.query.userId || 'player';
      const gameState = durakGames.get(userId);

      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json({ gameState });
    } catch (error) {
      console.error('Error getting game state:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Play cards (attack or defend)
  app.post('/api/game/play', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId || 'player';
      const gameState = durakGames.get(userId);

      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const { cardIds, attackCardId } = req.body;

      let result;
      if (attackCardId) {
        // Defending action
        result = defendWithCard(gameState, cardIds[0], attackCardId);
      } else {
        // Attacking action
        result = attackWithCards(gameState, cardIds);
      }

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      let newState = result.state;
      
      // Process AI turns
      newState = await processAITurns(newState);

      durakGames.set(userId, newState);
      res.json({ gameState: newState, message: result.message });
    } catch (error) {
      console.error('Error playing cards:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Take cards
  app.post('/api/game/take', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId || 'player';
      const gameState = durakGames.get(userId);

      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      let newState = takeCards(gameState);
      newState = await processAITurns(newState);

      durakGames.set(userId, newState);
      res.json({ gameState: newState });
    } catch (error) {
      console.error('Error taking cards:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Pass (end attack)
  app.post('/api/game/pass', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId || 'player';
      const gameState = durakGames.get(userId);

      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      let newState = passAttack(gameState);
      newState = await processAITurns(newState);

      durakGames.set(userId, newState);
      res.json({ gameState: newState });
    } catch (error) {
      console.error('Error passing:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

