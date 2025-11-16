import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Gem } from "lucide-react";
import coinHeads from "@/assets/coin-heads.png";
import coinTails from "@/assets/coin-tails.png";

const CoinflipGame = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(1000);
  const [username, setUsername] = useState("Player");
  const [betAmount, setBetAmount] = useState(100);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [gameStatus, setGameStatus] = useState<'idle' | 'flipping' | 'result'>('idle');
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [isWin, setIsWin] = useState(false);
  const [gameHistory, setGameHistory] = useState<Array<{ result: 'heads' | 'tails'; timestamp: number }>>([
    { result: 'heads', timestamp: Date.now() - 60000 },
    { result: 'tails', timestamp: Date.now() - 120000 },
    { result: 'heads', timestamp: Date.now() - 180000 },
    { result: 'tails', timestamp: Date.now() - 240000 },
    { result: 'heads', timestamp: Date.now() - 300000 },
  ]);
  
  // RTP tracking
  const [totalWagered, setTotalWagered] = useState(0);
  const [totalWon, setTotalWon] = useState(0);

  // Загрузить баланс из localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setBalance(userData.diamonds_balance || 1000);
        setUsername(userData.username || 'Player');
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    
    // Загрузить RTP статистику
    const rtpData = localStorage.getItem('coinflip_rtp');
    if (rtpData) {
      try {
        const { wagered, won } = JSON.parse(rtpData);
        setTotalWagered(wagered || 0);
        setTotalWon(won || 0);
      } catch (e) {
        console.error('Failed to parse RTP data:', e);
      }
    }
    
    // Слушатель для синхронизации баланса между вкладками
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const userData = JSON.parse(e.newValue);
          setBalance(userData.diamonds_balance || 1000);
        } catch (err) {
          console.error('Failed to sync balance:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Сохранить баланс в localStorage и синхронизировать
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        userData.diamonds_balance = balance;
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {
        console.error('Failed to save balance:', e);
      }
    }
  }, [balance]);
  
  // Сохранить RTP статистику
  useEffect(() => {
    localStorage.setItem('coinflip_rtp', JSON.stringify({
      wagered: totalWagered,
      won: totalWon
    }));
  }, [totalWagered, totalWon]);

  const flip = () => {
    if (betAmount > balance) {
      alert('Недостаточно средств');
      return;
    }

    setBalance(balance - betAmount);
    setGameStatus('flipping');
    
    // Обновить статистику ставок
    setTotalWagered(prev => prev + betAmount);

    // Анимация вращения
    setTimeout(() => {
      // Расчет RTP: если игрок выиграл больше 95% от проигранного, снизить шансы
      const netLoss = totalWagered - totalWon; // Сколько игрок проиграл
      const maxAllowedWin = totalWagered * 0.95; // Максимум 95% от всех ставок
      const currentRTP = totalWagered > 0 ? (totalWon / totalWagered) : 0;
      
      let winChance = 0.5; // Базовый шанс 50%
      
      // Если RTP игрока больше 95%, уменьшаем шансы на выигрыш
      if (currentRTP > 0.95) {
        winChance = 0.3; // Снижаем до 30%
      } else if (currentRTP > 0.90) {
        winChance = 0.4; // Снижаем до 40%
      }
      
      const random = Math.random();
      let flipResult: 'heads' | 'tails';
      let won: boolean;
      
      // Определяем результат с учетом RTP
      if (random < winChance) {
        flipResult = selectedSide; // Игрок выигрывает
        won = true;
      } else {
        flipResult = selectedSide === 'heads' ? 'tails' : 'heads'; // Игрок проигрывает
        won = false;
      }

      setResult(flipResult);
      setIsWin(won);
      setGameStatus('result');

      if (won) {
        const winAmount = betAmount * 1.95;
        setBalance(prev => prev + winAmount);
        setTotalWon(prev => prev + winAmount);
      }

      // Добавить в историю
      setGameHistory(prev => [
        { result: flipResult, timestamp: Date.now() },
        ...prev.slice(0, 19)
      ]);
    }, 1500);
  };

  const reset = () => {
    setGameStatus('idle');
    setResult(null);
    setIsWin(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-purple-500/30 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-purple-500/20 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">
              COINFLIP
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center gap-2">
              <Gem className="h-5 w-5 text-purple-300" />
              <div className="text-lg font-bold text-white">{balance.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr,300px] gap-6">
          {/* Game Area */}
          <div className="flex flex-col gap-4">
            {/* Coin Display */}
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-purple-500/30 p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="perspective-1000 w-64 h-64 mx-auto mb-8">
                  <div
                    className={`coin-container w-full h-full relative`}
                    style={{
                      transform: gameStatus === 'result' 
                        ? result === 'tails' 
                          ? 'rotateY(180deg)' 
                          : 'rotateY(0deg)'
                        : selectedSide === 'tails'
                          ? 'rotateY(180deg)'
                          : 'rotateY(0deg)',
                      animation: gameStatus === 'flipping' ? 'coinFlip 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                    }}
                  >
                    <div className="coin-face coin-front">
                      <img
                        src={coinHeads}
                        alt="Heads"
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                    </div>
                    <div className="coin-face coin-back">
                      <img
                        src={coinTails}
                        alt="Tails"
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                    </div>
                  </div>
                </div>
                {gameStatus === 'result' && (
                  <div className={`text-3xl font-bold animate-slide-up ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                    {isWin ? '🎉 ВЫИГРЫШ!' : '😢 ПРОИГРЫШ'}
                  </div>
                )}
              </div>
            </Card>

            {/* Game History */}
            <Card className="bg-slate-800/50 border-purple-500/30 p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">История</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {gameHistory.map((round, idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
                      round.result === 'heads'
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-orange-500/20 border-orange-500/50'
                    }`}
                  >
                    <img
                      src={round.result === 'heads' ? coinHeads : coinTails}
                      alt={round.result}
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Controls */}
            <Card className="bg-slate-800/50 border-purple-500/30 p-6">
              <div className="space-y-4">
                {/* Side Selection */}
                <div>
                  <label className="text-sm font-medium text-purple-300 mb-3 block">
                    Выберите сторону
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      size="lg"
                      variant={selectedSide === 'heads' ? 'default' : 'outline'}
                      className={`h-24 text-lg font-bold flex flex-col items-center justify-center gap-2 ${
                        selectedSide === 'heads'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500'
                          : 'border-purple-500/50 text-purple-300'
                      }`}
                      onClick={() => setSelectedSide('heads')}
                      disabled={gameStatus !== 'idle'}
                    >
                      <img src={coinHeads} alt="Heads" className="w-12 h-12 object-contain" />
                      <span>Орел</span>
                    </Button>
                    <Button
                      size="lg"
                      variant={selectedSide === 'tails' ? 'default' : 'outline'}
                      className={`h-24 text-lg font-bold flex flex-col items-center justify-center gap-2 ${
                        selectedSide === 'tails'
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white border-orange-500'
                          : 'border-purple-500/50 text-purple-300'
                      }`}
                      onClick={() => setSelectedSide('tails')}
                      disabled={gameStatus !== 'idle'}
                    >
                      <img src={coinTails} alt="Tails" className="w-12 h-12 object-contain" />
                      <span>Решка</span>
                    </Button>
                  </div>
                </div>

                {/* Bet Amount */}
                <div>
                  <label className="text-sm font-medium text-purple-300 mb-2 block">
                    Сумма ставки
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(Math.max(10, betAmount - 100))}
                      className="border-purple-500/50 text-purple-300"
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      disabled={gameStatus !== 'idle'}
                      className="flex-1 bg-slate-700 border-purple-500/30 text-white text-center"
                      min="1"
                      max={balance}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(betAmount + 100)}
                      className="border-purple-500/50 text-purple-300"
                    >
                      +
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[50, 100, 200, 500].map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount(amount)}
                        disabled={gameStatus !== 'idle'}
                        className="flex-1 border-purple-500/50 text-purple-300 text-xs"
                      >
                        +{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {gameStatus === 'idle' && (
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-12"
                      onClick={flip}
                      disabled={betAmount > balance}
                    >
                      БРОСИТЬ МОНЕТУ (1.95x)
                    </Button>
                  )}

                  {gameStatus === 'flipping' && (
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold h-12"
                      disabled
                    >
                      ВРАЩЕНИЕ...
                    </Button>
                  )}

                  {gameStatus === 'result' && (
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-12"
                      onClick={reset}
                    >
                      ЕЩЕ РАЗ
                    </Button>
                  )}
                </div>

                {gameStatus === 'result' && (
                  <div className={`p-4 rounded-lg text-center border-2 ${
                    isWin
                      ? 'bg-green-500/20 border-green-500/50'
                      : 'bg-red-500/20 border-red-500/50'
                  }`}>
                    <div className={`text-sm font-medium ${isWin ? 'text-green-300' : 'text-red-300'}`}>
                      {isWin ? 'Выигрыш' : 'Проигрыш'}
                    </div>
                    <div className={`text-2xl font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                      {isWin ? `+💎 ${(betAmount * 1.95).toFixed(0)}` : `-💎 ${betAmount}`}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Info Panel */}
          <Card className="bg-slate-800/50 border-purple-500/30 p-6 h-fit">
            <h3 className="font-semibold text-purple-300 mb-4">Информация</h3>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg">
                <div className="text-purple-300 text-xs">Текущий баланс</div>
                <div className="font-bold text-white text-lg">💎 {balance.toFixed(0)}</div>
              </div>
              <div className="p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg">
                <div className="text-purple-300 text-xs">Выигрыш</div>
                <div className="font-bold text-white text-lg">1.95x</div>
              </div>
              <div className="p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg">
                <div className="text-purple-300 text-xs">Вероятност��</div>
                <div className="font-bold text-white text-lg">50%</div>
              </div>
              <div className="p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg">
                <div className="text-purple-300 text-xs">RTP</div>
                <div className="font-bold text-white text-lg">95%</div>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .coin-container {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }
        
        .coin-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          background: transparent;
        }
        
        .coin-face img {
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
          mix-blend-mode: normal;
          background: transparent;
        }
        
        .coin-front {
          transform: rotateY(0deg);
        }
        
        .coin-back {
          transform: rotateY(180deg);
        }
        
        @keyframes coinFlip {
          0% { 
            transform: rotateY(0deg) rotateX(0deg);
          }
          25% {
            transform: rotateY(900deg) rotateX(15deg);
          }
          50% { 
            transform: rotateY(1800deg) rotateX(0deg);
          }
          75% {
            transform: rotateY(2700deg) rotateX(-15deg);
          }
          100% { 
            transform: rotateY(3600deg) rotateX(0deg);
          }
        }
        
        .coin-flip {
          animation: coinFlip 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CoinflipGame;
