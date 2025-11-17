import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Gem } from "lucide-react";
import coinHeads from "@/assets/coin-heads.png";
import coinTails from "@/assets/coin-tails.png";
import { getBalance, setBalance as saveBalance, subscribeToBalance } from "@/lib/balanceSync";

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

  // Загрузить баланс и подписаться на изменения
  useEffect(() => {
    const initialBalance = getBalance();
    setBalance(initialBalance);
    
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
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
    
    // Подписаться на изменения баланса
    const unsubscribe = subscribeToBalance((newBalance) => {
      setBalance(newBalance);
    });
    
    return unsubscribe;
  }, []);
  
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

    const newBalance = balance - betAmount;
    setBalance(newBalance);
    saveBalance(newBalance);
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
        const currentBalance = getBalance();
        const newBalance = currentBalance + winAmount;
        setBalance(newBalance);
        saveBalance(newBalance);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b border-purple-500/30 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-purple-500/20 text-white h-8 w-8 md:h-10 md:w-10"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">
              COINFLIP
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center gap-1 md:gap-2">
              <Gem className="h-4 w-4 md:h-5 md:w-5 text-purple-300" />
              <div className="text-sm md:text-lg font-bold text-white">{balance.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Coin Display */}
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-purple-500/30 p-4 md:p-8 min-h-[250px] md:min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="perspective-1000 w-40 h-40 md:w-64 md:h-64 mx-auto mb-4 md:mb-8">
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
                  <div className={`text-xl md:text-3xl font-bold animate-slide-up ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                    {isWin ? '🎉 ВЫИГРЫШ!' : '😢 ПРОИГРЫШ'}
                  </div>
                )}
              </div>
            </Card>

            {/* Game History */}
            <Card className="bg-slate-800/50 border-purple-500/30 p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-purple-300 mb-2 md:mb-3">История</h3>
              <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-2">
                {gameHistory.map((round, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all border-2 flex-shrink-0 ${
                      round.result === 'heads'
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-orange-500/20 border-orange-500/50'
                    }`}
                  >
                    <img
                      src={round.result === 'heads' ? coinHeads : coinTails}
                      alt={round.result}
                      className="w-6 h-6 md:w-8 md:h-8 object-contain"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Controls */}
            <Card className="bg-slate-800/50 border-purple-500/30 p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {/* Side Selection */}
                <div>
                  <label className="text-xs md:text-sm font-medium text-purple-300 mb-2 md:mb-3 block">
                    Выберите сторону
                  </label>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <Button
                      size="lg"
                      variant={selectedSide === 'heads' ? 'default' : 'outline'}
                      className={`h-16 md:h-24 text-sm md:text-lg font-bold flex flex-col items-center justify-center gap-1 md:gap-2 ${
                        selectedSide === 'heads'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500'
                          : 'border-purple-500/50 text-purple-300'
                      }`}
                      onClick={() => setSelectedSide('heads')}
                      disabled={gameStatus !== 'idle'}
                    >
                      <img src={coinHeads} alt="Heads" className="w-8 h-8 md:w-12 md:h-12 object-contain" />
                      <span>Орел</span>
                    </Button>
                    <Button
                      size="lg"
                      variant={selectedSide === 'tails' ? 'default' : 'outline'}
                      className={`h-16 md:h-24 text-sm md:text-lg font-bold flex flex-col items-center justify-center gap-1 md:gap-2 ${
                        selectedSide === 'tails'
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white border-orange-500'
                          : 'border-purple-500/50 text-purple-300'
                      }`}
                      onClick={() => setSelectedSide('tails')}
                      disabled={gameStatus !== 'idle'}
                    >
                      <img src={coinTails} alt="Tails" className="w-8 h-8 md:w-12 md:h-12 object-contain" />
                      <span>Решка</span>
                    </Button>
                  </div>
                </div>

                {/* Bet Amount */}
                <div>
                  <label className="text-xs md:text-sm font-medium text-purple-300 mb-2 block">
                    Сумма ставки
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(Math.max(10, betAmount - 100))}
                      className="border-purple-500/50 text-purple-300 h-8 md:h-10"
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      disabled={gameStatus !== 'idle'}
                      className="flex-1 bg-slate-700 border-purple-500/30 text-white text-center text-sm md:text-base h-8 md:h-10"
                      min="1"
                      max={balance}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(betAmount + 100)}
                      className="border-purple-500/50 text-purple-300 h-8 md:h-10"
                    >
                      +
                    </Button>
                  </div>
                  <div className="flex gap-1.5 md:gap-2 mt-2">
                    {[50, 100, 200, 500].map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount(amount)}
                        disabled={gameStatus !== 'idle'}
                        className="flex-1 border-purple-500/50 text-purple-300 text-xs h-7 md:h-9"
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
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-10 md:h-12 text-sm md:text-base"
                      onClick={flip}
                      disabled={betAmount > balance}
                    >
                      БРОСИТЬ МОНЕТУ (1.95x)
                    </Button>
                  )}

                  {gameStatus === 'flipping' && (
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold h-10 md:h-12 text-sm md:text-base"
                      disabled
                    >
                      ВРАЩЕНИЕ...
                    </Button>
                  )}

                  {gameStatus === 'result' && (
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-10 md:h-12 text-sm md:text-base"
                      onClick={reset}
                    >
                      ЕЩЕ РАЗ
                    </Button>
                  )}
                </div>

              </div>
            </Card>
          </div>

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
