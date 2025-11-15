# Инструкция по копированию изображений

Для корректной работы изображений игр необходимо скопировать файлы в папку `src/assets/`.

## Способ 1: Через проводник Windows

1. Откройте проводник Windows
2. Перейдите в `C:\Users\User\Desktop\private2\`
3. Найдите файлы:
   - `crush.png`
   - `coinflipe.png`
   - `rolls.png`
4. Скопируйте их (Ctrl+C)
5. Перейдите в `C:\Users\User\Desktop\private2\pyplse-game-hub-main\src\assets\`
6. Вставьте файлы (Ctrl+V)

## Способ 2: Через командную строку

Откройте командную строку (cmd) и выполните:

```cmd
cd C:\Users\User\Desktop\private2
copy crush.png pyplse-game-hub-main\src\assets\crush.png
copy coinflipe.png pyplse-game-hub-main\src\assets\coinflipe.png
copy rolls.png pyplse-game-hub-main\src\assets\rolls.png
```

## Способ 3: Через PowerShell

Откройте PowerShell и выполните:

```powershell
cd C:\Users\User\Desktop\private2
Copy-Item crush.png pyplse-game-hub-main\src\assets\crush.png -Force
Copy-Item coinflipe.png pyplse-game-hub-main\src\assets\coinflipe.png -Force
Copy-Item rolls.png pyplse-game-hub-main\src\assets\rolls.png -Force
```

После копирования файлов перезапустите сервер разработки (если он запущен).

