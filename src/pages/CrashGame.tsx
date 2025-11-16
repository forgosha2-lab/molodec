import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Gem } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/useWebSocket";
import ufoImage from "@/assets/ufo.png";

interface GameRound {
  id: string;
  crashPoint: number;
  timestamp: number;
}

interface PlayerBet {
  playerId: string;
  playerName: string;
  amount: number;
  multiplier?: number;
  status: 'active' | 'won' | 'lost';
}

interface ChatMessage {
  id: string;
  playerName: string;
  message: string;
  timestamp: number;
}

const CrashGame = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    playerId,
    playerName,
    balance,
    crashState,
    liveFeed,
    crashHistory,
    sendMessage,
  } = useWebSocket();

  const [betAmount, setBetAmount] = useState(100);
  const [autoCashoutX, setAutoCashoutX] = useState(2.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', playerName: 'Player1', message: 'Удачи всем!', timestamp: Date.now() - 5000 },
  ]);
  const [chatInput, setChatInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ufoImageRef = useRef<HTMLImageElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentBet, setCurrentBet] = useState<PlayerBet | null>(null);
  const [gameHistory, setGameHistory] = useState<GameRound[]>([]);
  const [backgroundOffset, setBackgroundOffset] = useState(0);

  // Load UFO image
  useEffect(() => {
    const img = new Image();
    img.src = ufoImage;
    img.onload = () => {
      ufoImageRef.current = img;
    };
  }, []);

  // Update current bet when crash state changes
  useEffect(() => {
    if (playerId && crashState.bets) {
      const playerBet = crashState.bets.find(bet => bet.playerId === playerId);
      if (playerBet) {
        setCurrentBet({
          playerId: playerBet.playerId,
          playerName: playerBet.playerName,
          amount: playerBet.amount,
          multiplier: playerBet.cashoutMultiplier,
          status: playerBet.cashoutMultiplier ? 'won' : 'active'
        });
      } else {
        setCurrentBet(null);
      }
    }
  }, [crashState, playerId]);

  // Animate background based on multiplier
  useEffect(() => {
    if (crashState.status === 'running') {
      const speed = Math.min(crashState.multiplier * 2, 20);
      setBackgroundOffset(prev => (prev + speed) % 1000);
    }
  }, [crashState.multiplier, crashState.status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw animated background stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 80; i++) {
      const x = ((i * 73 + backgroundOffset) % width);
      const y = (i * 97) % height;
      const size = Math.sin(i + backgroundOffset / 100) * 1.5 + 1.5;
      ctx.fillRect(x, y, size, size);
    }

    if (crashState.status === 'running' || crashState.status === 'crashed') {
      const maxMultiplier = Math.max(crashState.multiplier, 2);
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i <= 100; i++) {
        const progress = i / 100;
        const mult = Math.pow(Math.E, progress * Math.log(crashState.multiplier));
        
        const x = progress * width * 0.6 + width * 0.05;
        const y = height - (((mult - 1) / (maxMultiplier - 1)) * height * 0.7 + height * 0.1);
        points.push({ x, y });
      }

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#4169E1');
      gradient.addColorStop(0.5, '#8B5CF6');
      gradient.addColorStop(1, '#EC4899');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Draw UFO at the end of the line
      if (points.length > 0 && ufoImageRef.current) {
        const lastPoint = points[points.length - 1];
        
        // Add shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        // Calculate wobble for high multipliers
        const wobble = crashState.multiplier > 5 ? Math.sin(Date.now() / 100) * 3 : 0;
        
        // Draw UFO
        const ufoSize = 40 + Math.min(crashState.multiplier * 2, 30);
        ctx.drawImage(
          ufoImageRef.current, 
          lastPoint.x - ufoSize / 2 + wobble, 
          lastPoint.y - ufoSize / 2, 
          ufoSize, 
          ufoSize
        );
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      if (crashState.status === 'crashed') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(0, 0, width, height);
      }
    }
  }, [crashState, backgroundOffset]);

  const placeBet = () => {
    if (crashState.status !== 'waiting' || betAmount <= 0 || betAmount > balance) return;
    
    sendMessage({ 
      type: 'placeBet', 
      data: { 
        amount: betAmount,
        autoCashout: autoCashoutEnabled,
        autoCashoutAt: autoCashoutX
      } 
    });
  };

  const cashout = () => {
    if (!currentBet || crashState.status !== 'running') return;
    
    sendMessage({ type: 'cashout' });
  };

  const toggleAutoCashout = () => {
    setAutoCashoutEnabled(!autoCashoutEnabled);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      playerName,
      message: chatInput,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, message]);
    setChatInput('');
    sendMessage({ type: 'chatMessage', data: { message: chatInput } });
  };

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  // Update game history when crashHistory changes
  useEffect(() => {
    const history = crashHistory.map((point, index) => ({
      id: `history-${index}`,
      crashPoint: point,
      timestamp: Date.now() - index * 10000
    }));
    setGameHistory(history);
  }, [crashHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 transition-all duration-300"
          style={{ 
            background: 'linear-gradient(180deg, #0a0a1e 0%, #1a1a3e 50%, #2a2a5e 100%)',
            transform: `translateY(${-backgroundOffset / 5}px)`
          }}
        ></div>
        
        {/* Animated clouds */}
        <div className="absolute inset-0 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className="cloud absolute rounded-full bg-gray-400/20"
              style={{
                width: `${60 + i * 20}px`,
                height: `${20 + i * 10}px`,
                top: `${20 + i * 20}%`,
                animation: `moveCloud${i} ${25 - crashState.multiplier * 2}s linear infinite`,
                left: '-100px'
              }}
            >
              <div 
                className="absolute rounded-full bg-gray-400/20"
                style={{
                  width: `${30 + i * 10}px`,
                  height: `${20 + i * 5}px`,
                  top: `${-10 - i * 5}px`,
                  left: `${5 + i * 5}px`
                }}
              ></div>
              <div 
                className="absolute rounded-full bg-gray-400/20"
                style={{
                  width: `${35 + i * 10}px`,
                  height: `${15 + i * 5}px`,
                  top: `${-5 - i * 3}px`,
                  right: `${5 + i * 5}px`
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Animation styles */}
      <style>{`
        @keyframes moveCloud1 {
          from { transform: translateX(-100px); }
          to { transform: translateX(calc(100vw + 100px)); }
        }
        
        @keyframes moveCloud2 {
          from { transform: translateX(-150px); }
          to { transform: translateX(calc(100vw + 150px)); }
        }
        
        @keyframes moveCloud3 {
          from { transform: translateX(-120px); }
          to { transform: translateX(calc(100vw + 120px)); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
          50% { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-2deg); }
          75% { transform: translateX(5px) rotate(2deg); }
        }
      `}</style>

      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10 relative">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-300">Online: {isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg">
              <Gem className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-white">{balance}</span>
            </div>
            <div className="text-sm text-slate-300">
              Игрок: <span className="text-white font-medium">{playerName}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 relative z-10">
        <div className="grid lg:grid-cols-[1fr,320px] gap-4">
          {/* Main Game Area */}
          <div className="flex flex-col gap-4">
            {/* Game History - Positioned higher and smaller */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-3">
              <h3 className="text-sm font-semibold text-white mb-2">История</h3>
              <div className="flex gap-1.5 overflow-x-auto">
                {gameHistory.slice(0, 15).map((round) => (
                  <div 
                    key={round.id} 
                    className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                      round.crashPoint < 2 
                        ? 'bg-red-500/20 text-red-400' 
                        : round.crashPoint < 5 
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {round.crashPoint.toFixed(2)}x
                  </div>
                ))}
              </div>
            </Card>

            {/* Game Canvas */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-0 overflow-hidden">
              <div className="relative h-96 w-full">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="w-full h-full"
                />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-center">
                    {crashState.status === 'waiting' ? (
                      <>
                        <div className="text-6xl font-bold font-mono text-white mb-2">
                          {crashState.countdown}
                        </div>
                        <div className="text-slate-300 text-lg">секунд до старта</div>
                      </>
                    ) : (
                      <>
                        <div 
                          className={`text-7xl font-bold font-mono ${
                            crashState.status === 'crashed' 
                              ? 'text-red-500' 
                              : crashState.status === 'running' 
                                ? 'text-green-400' 
                                : 'text-white'
                          }`}
                          style={{
                            animation: crashState.status === 'running' 
                              ? crashState.multiplier > 5 
                                ? 'glow 1s ease-in-out infinite, shake 0.5s ease-in-out infinite' 
                                : 'pulse 2s ease-in-out infinite, glow 2s ease-in-out infinite'
                              : 'none'
                          }}
                        >
                          {crashState.multiplier.toFixed(2)}x
                        </div>
                        <div className="text-slate-300 mt-2">
                          {crashState.status === 'running' && 'Игра идет! 🚀'}
                          {crashState.status === 'crashed' && `💥 Краш!`}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Controls */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Ставка
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(Number(e.target.value))}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="10"
                        max={balance}
                      />
                      <Button 
                        onClick={placeBet}
                        disabled={crashState.status !== 'waiting' || !betAmount || betAmount > balance}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Поставить
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoCashoutEnabled}
                        onChange={toggleAutoCashout}
                        className="rounded"
                      />
                      <label className="text-sm font-medium text-slate-300">
                        Авто вывод при
                      </label>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={autoCashoutX}
                        onChange={(e) => setAutoCashoutX(Number(e.target.value))}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="1.01"
                        step="0.1"
                        disabled={!autoCashoutEnabled}
                      />
                      <span className="text-slate-300">x</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Ваша ставка
                    </label>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      {currentBet ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-300">Сумма:</span>
                            <span className="text-white font-medium">{currentBet.amount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-300">Множитель:</span>
                            <span className="text-white font-medium">{crashState.multiplier.toFixed(2)}x</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-300">Выигрыш:</span>
                            <span className="text-green-400 font-medium">
                              {(currentBet.amount * crashState.multiplier).toFixed(2)}
                            </span>
                          </div>
                          <Button 
                            onClick={cashout}
                            disabled={crashState.status !== 'running' || !!currentBet.multiplier}
                            className="w-full mt-2 bg-green-600 hover:bg-green-700"
                          >
                            Забрать выигрыш
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-3 text-slate-400 text-sm">
                          Нет активной ставки
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* All Players Bets */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Ставки игроков</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {crashState.bets && crashState.bets.length > 0 ? (
                  crashState.bets.map((bet, index) => (
                    <div 
                      key={bet.id || index} 
                      className="flex items-center justify-between bg-slate-700/30 rounded p-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 font-medium">{bet.playerName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-white">{bet.amount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {bet.cashoutMultiplier ? (
                          <>
                            <span className="text-green-400 font-medium">{bet.cashoutMultiplier.toFixed(2)}x</span>
                            <span className="text-green-500 text-xs">✓ Вывел</span>
                          </>
                        ) : crashState.status === 'crashed' ? (
                          <span className="text-red-500 text-xs">✗ Проиграл</span>
                        ) : (
                          <span className="text-yellow-400 font-medium">{crashState.multiplier.toFixed(2)}x</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    Нет активных ставок
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Chat */}
            <Card className="bg-slate-800/50 border-slate-700/50 flex-1 flex flex-col">
              <div className="p-3 border-b border-slate-700/50">
                <h3 className="font-semibold text-white text-sm">Чат</h3>
              </div>
              
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-purple-400">{msg.playerName}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-300">{msg.message}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-3 border-t border-slate-700/50 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Сообщение..."
                  className="bg-slate-700 border-purple-500/30 text-white text-xs h-8"
                />
                <Button
                  size="sm"
                  onClick={sendChatMessage}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-8 w-8 p-0"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CrashGame;
