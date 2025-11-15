import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Gem } from "lucide-react";

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
  }, []);

  const flip = () => {
    if (betAmount > balance) {
      alert('Недостаточно средств');
      return;
    }

    setBalance(balance - betAmount);
    setGameStatus('flipping');

    // Анимация вращения
    setTimeout(() => {
      const random = Math.random();
      const flipResult = random < 0.5 ? 'heads' : 'tails';
      const won = flipResult === selectedSide;

      setResult(flipResult);
      setIsWin(won);
      setGameStatus('result');

      if (won) {
        const winAmount = betAmount * 1.95;
        setBalance(prev => prev + winAmount);
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
                <div
                  className={`w-64 h-64 mx-auto mb-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl ${
                    gameStatus === 'flipping' ? 'animate-spin' : ''
                  }`}
                  style={{
                    animation: gameStatus === 'flipping' ? 'spin 1.5s ease-out' : 'none',
                  }}
                >
                  <div className="text-8xl font-bold">
                    {gameStatus === 'result' ? (result === 'heads' ? '🦅' : '🪙') : selectedSide === 'heads' ? '🦅' : '🪙'}
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
                  <button
                    key={idx}
                    className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap text-sm transition-all ${
                      round.result === 'heads'
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                        : 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                    }`}
                  >
                    {round.result === 'heads' ? '🦅' : '🪙'}
                  </button>
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
                      className={`h-20 text-lg font-bold ${
                        selectedSide === 'heads'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500'
                          : 'border-purple-500/50 text-purple-300'
                      }`}
                      onClick={() => setSelectedSide('heads')}
                      disabled={gameStatus !== 'idle'}
                    >
                      🦅 Орел
                    </Button>
                    <Button
                      size="lg"
                      variant={selectedSide === 'tails' ? 'default' : 'outline'}
                      className={`h-20 text-lg font-bold ${
                        selectedSide === 'tails'
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white border-orange-500'
                          : 'border-purple-500/50 text-purple-300'
                      }`}
                      onClick={() => setSelectedSide('tails')}
                      disabled={gameStatus !== 'idle'}
                    >
                      🪙 Решка
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
        @keyframes spin {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          50% { transform: rotateY(1800deg) rotateX(20deg); }
          100% { transform: rotateY(3600deg) rotateX(0deg); }
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
