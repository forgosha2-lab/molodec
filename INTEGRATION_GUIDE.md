# Руководство по интеграции игр

## Текущий статус

✅ Созданы базовые обертки для всех игр:
- `/crash-coin-rolls` - Crash, Coinflip, Rolls (с переключением режимов)
- `/durak-game` - Игра Дурак
- `/uno-game` - Игра UNO

✅ Улучшена синхронизация Telegram:
- Автоматическая регистрация пользователей из Telegram
- Сохранение ID пользователя в localStorage

✅ Подготовка к деплою на Vercel:
- Создан `vercel.json`
- Настроены маршруты

## Что нужно сделать для полной интеграции

### 1. Интеграция CrashCoinRolls

1. Скопировать компоненты из `CrashCoinRolls/client/src/components/games/`:
   - `CrashGame.tsx`
   - `CoinflipGame.tsx`
   - `RollsGame.tsx`
   - `GameTabs.tsx`
   - `BetInput.tsx`
   - `LiveBetFeed.tsx`

2. Скопировать хук `useWebSocket.ts` из `CrashCoinRolls/client/src/hooks/`

3. Скопировать shared схему из `CrashCoinRolls/shared/schema.ts`

4. Настроить WebSocket сервер из `CrashCoinRolls/server/` в основной `server.js`

### 2. Интеграция Durak

1. Скопировать компоненты из `DurakGame/client/src/components/`:
   - `BattleArea.tsx`
   - `Card.tsx`
   - `Deck.tsx`
   - `GameControls.tsx`
   - `GameStatus.tsx`
   - `OpponentArea.tsx`
   - `PlayerHand.tsx`
   - `TrumpCard.tsx`
   - `EndGameModal.tsx`

2. Скопировать страницу `Game.tsx` из `DurakGame/client/src/pages/`

3. Настроить API endpoints из `DurakGame/server/` в основной `server.js`

### 3. Интеграция UNO

1. Скопировать компоненты из `UnoMobileOnline/client/src/components/`:
   - `UnoCard.tsx`
   - `PlayerHand.tsx`
   - `OpponentArea.tsx`
   - `ColorPicker.tsx`
   - `GameOverModal.tsx`

2. Скопировать страницы из `UnoMobileOnline/client/src/pages/`:
   - `lobby.tsx`
   - `waiting-room.tsx`
   - `game-board.tsx`

3. Скопировать хук `useWebSocket.ts` из `UnoMobileOnline/client/src/hooks/`

4. Настроить WebSocket сервер из `UnoMobileOnline/server/` в основной `server.js`

### 4. Деплой на Vercel

1. Установить Vercel CLI: `npm i -g vercel`

2. Войти в Vercel: `vercel login`

3. Деплой: `vercel --prod`

4. Настроить переменные окружения в Vercel:
   - `NODE_ENV=production`
   - `PORT=3003`
   - `DB_PATH` (опционально)

5. Настроить WebSocket сервер (может потребоваться отдельный сервер для WebSocket)

## Примечания

- WebSocket серверы для игр могут потребовать отдельного хостинга или использования Vercel Serverless Functions
- База данных SQLite может не работать на Vercel - рассмотрите использование внешней БД (PostgreSQL, MongoDB)
- Для продакшена может потребоваться настройка CORS и доменов

