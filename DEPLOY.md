# Инструкция по деплою на Vercel

## Быстрый деплой

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Войдите в Vercel:
```bash
vercel login
```

3. Перейдите в директорию проекта:
```bash
cd pyplse-game-hub-main
```

4. Деплой:
```bash
vercel --prod
```

## Через веб-интерфейс Vercel

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New Project"
3. Подключите ваш Git репозиторий
4. Настройки:
   - Framework Preset: Vite
   - Root Directory: `pyplse-game-hub-main`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Переменные окружения

В настройках проекта Vercel добавьте:
- `NODE_ENV=production`
- `PORT=3003` (или оставьте по умолчанию)

## Важные замечания

⚠️ **WebSocket серверы**: Vercel Serverless Functions не поддерживают постоянные WebSocket соединения. Для игр с WebSocket (CrashCoinRolls, UNO, Durak) потребуется:
- Отдельный сервер для WebSocket (например, Railway, Render, или собственный VPS)
- Или использование альтернативных решений (Socket.io с адаптерами)

⚠️ **База данных**: SQLite может не работать на Vercel. Рекомендуется:
- Использовать внешнюю БД (PostgreSQL, MongoDB)
- Или использовать Vercel Postgres

## Альтернативные платформы для деплоя

- **Railway**: Поддерживает WebSocket и SQLite
- **Render**: Поддерживает WebSocket
- **Fly.io**: Поддерживает WebSocket и SQLite

