import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Bet {
  id: string;
  amount: number;
  color: string;
  percentage: number;
  startAngle: number;
  endAngle: number;
  playerName: string;
}

const RollsGame = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(1000);
  const [username, setUsername] = useState("Player");
  const [betAmount, setBetAmount] = useState(100);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'spinning' | 'result'>('waiting');
  const [bets, setBets] = useState<Bet[]>([
    {
      id: '1',
      amount: 500,
      color: '#4169E1',
      percentage: 50,
      startAngle: 0,
      endAngle: 180,
      playerName: 'Player1',
    },
    {
      id: '2',
      amount: 500,
      color: '#8B5CF6',
      percentage: 50,
      startAngle: 180,
      endAngle: 360,
      playerName: 'Player2',
    },
  ]);
  const [totalPot, setTotalPot] = useState(1000);
  const [rotation, setRotation] = useState(0);
  const [winnerBet, setWinnerBet] = useState<Bet | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Рисовать барабан
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 30;

    ctx.clearRect(0, 0, width, height);

    // Рисовать звезды
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % width;
      const y = (i * 97) % height;
      const size = Math.sin(i) * 1.5 + 1;
      ctx.fillRect(x, y, size, size);
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    if (bets.length === 0) {
      ctx.fillStyle = '#4169E1';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      bets.forEach((bet) => {
        ctx.fillStyle = bet.color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(
          centerX,
          centerY,
          radius,
          (bet.startAngle * Math.PI) / 180,
          (bet.endAngle * Math.PI) / 180
        );
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    }

    ctx.restore();

    // Центр
    ctx.fillStyle = 'rgba(10, 14, 39, 0.95)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.25, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`$${totalPot.toFixed(0)}`, centerX, centerY);

    // Стрелка
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 20);
    ctx.lineTo(centerX - 15, centerY - radius - 40);
    ctx.lineTo(centerX + 15, centerY - radius - 40);
    ctx.closePath();
    ctx.fill();
  }, [bets, totalPot, rotation]);

  const placeBet = () => {
    if (betAmount > balance) {
      alert('Недостаточно средств');
      return;
    }

    if (gameStatus !== 'waiting') {
      alert('Барабан уже крутится');
      return;
    }

    setBalance(balance - betAmount);

    const colors = ['#4169E1', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4'];
    const color = colors[bets.length % colors.length];

    const newTotalPot = totalPot + betAmount;
    const percentage = (betAmount / newTotalPot) * 100;

    let startAngle = 0;
    const updatedBets = bets.map(bet => {
      const newPercentage = (bet.amount / newTotalPot) * 100;
      const newEndAngle = startAngle + (newPercentage / 100) * 360;
      const updatedBet = {
        ...bet,
        percentage: newPercentage,
        startAngle,
        endAngle: newEndAngle,
      };
      startAngle = newEndAngle;
      return updatedBet;
    });

    const endAngle = startAngle + (percentage / 100) * 360;

    const newBet: Bet = {
      id: `bet_${Date.now()}`,
      amount: betAmount,
      color,
      percentage,
      startAngle,
      endAngle,
      playerName: username,
    };

    setBets([...updatedBets, newBet]);
    setTotalPot(newTotalPot);
  };

  const spin = () => {
    if (bets.length < 2) {
      alert('Нужно минимум 2 ставки');
      return;
    }

    setGameStatus('spinning');

    const random = Math.random();
    let accumulated = 0;
    let winningBet = bets[0];

    for (const bet of bets) {
      accumulated += bet.amount / totalPot;
      if (random <= accumulated) {
        winningBet = bet;
        break;
      }
    }

    const winningAngle = (winningBet.startAngle + winningBet.endAngle) / 2;
    const targetRotation = 360 * 5 + winningAngle;

    let startTime = Date.now();
    const duration = 4000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = easeOut * targetRotation;

      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setGameStatus('result');
        setWinnerBet(winningBet);
        setBalance(prev => prev + totalPot);
      }
    };

    animate();
  };

  const reset = () => {
    setGameStatus('waiting');
    setBets([]);
    setTotalPot(0);
    setRotation(0);
    setWinnerBet(null);
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
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-blue-400">
              ROLLS
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50">
              <div className="text-xs text-purple-300">Баланс</div>
              <div className="text-lg font-bold text-white">💎 {balance.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr,300px] gap-6">
          {/* Game Area */}
          <div className="flex flex-col gap-4">
            {/* Wheel Display */}
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-purple-500/30 p-8 flex items-center justify-center min-h-[400px]">
              <div className="relative w-full max-w-md">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
                {gameStatus === 'result' && winnerBet && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-slate-900/95 backdrop-blur-sm p-6 rounded-lg border-2 border-green-500 animate-bounce">
                      <Trophy className="w-12 h-12 mx-auto mb-2 text-green-400" />
                      <div className="text-2xl font-bold text-white">ВЫИГРЫШ!</div>
                      <div className="text-lg text-green-400 font-bold">
                        💎 {totalPot.toFixed(0)}
                      </div>
                      <div className="text-sm text-purple-300 mt-2">
                        {winnerBet.playerName}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Controls */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left Panel */}
              <Card className="bg-slate-800/50 border-purple-500/30 p-6">
                <div className="space-y-4">
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
                        disabled={gameStatus !== 'waiting'}
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
                          disabled={gameStatus !== 'waiting'}
                          className="flex-1 border-purple-500/50 text-purple-300 text-xs"
                        >
                          +{amount}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {gameStatus === 'waiting' && (
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-12"
                      onClick={placeBet}
                      disabled={betAmount > balance}
                    >
                      ПОСТАВИТЬ
                    </Button>
                  )}
                </div>
              </Card>

              {/* Right Panel */}
              <Card className="bg-slate-800/50 border-purple-500/30 p-6">
                <div className="space-y-4">
                  {gameStatus === 'waiting' && bets.length >= 2 && (
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold h-12"
                      onClick={spin}
                    >
                      КРУТИТЬ БАРАБАН
                    </Button>
                  )}

                  {gameStatus === 'spinning' && (
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
                      НОВЫЙ РАУНД
                    </Button>
                  )}

                  {totalPot > 0 && (
                    <div className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg text-center">
                      <div className="text-xs text-purple-300">Общий банк</div>
                      <div className="text-xl font-bold text-white">💎 {totalPot.toFixed(0)}</div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Right Sidebar */}
          <Card className="bg-slate-800/50 border-purple-500/30 p-4 h-fit">
            <h3 className="text-sm font-semibold text-purple-300 mb-3">Ставки ({bets.length})</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {bets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Нет ставок
                  </div>
                ) : (
                  bets.map((bet, idx) => (
                    <div
                      key={bet.id}
                      className="p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: bet.color }}
                        />
                        <span className="text-sm font-semibold text-white">{bet.playerName}</span>
                      </div>
                      <div className="flex justify-between text-xs text-purple-300">
                        <span>💎 {bet.amount}</span>
                        <span>{bet.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </main>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default RollsGame;
