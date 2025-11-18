import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Gem, MessageCircle, Send, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBalance, setBalance as saveBalance, subscribeToBalance } from "@/lib/balanceSync";
import { useRollsWebSocket } from "@/hooks/useRollsWebSocket";

interface Bet {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  color: string;
  percentage: number;
  startAngle: number;
  endAngle: number;
  avatar_url?: string;
}

interface GameState {
  status: 'waiting' | 'countdown' | 'spinning' | 'result';
  bets: Bet[];
  totalPot: number;
  timeRemaining: number;
  winnerBet: Bet | null;
  rotation: number;
  roundId: string;
  chatMessages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

const RollsGame = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [userId, setUserId] = useState("tg_123456789");
  const [betAmount, setBetAmount] = useState(100);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    status: wsStatus,
    gameState: rollsGameState,
    player: rollsPlayer,
    chatMessages: rollsChatMessages,
    joinGame,
    placeBet: rollsPlaceBet,
    cancelBet: rollsCancelBet,
    sendChatMessage: rollsSendChatMessage,
  } = useRollsWebSocket();

  // Load user data and balance
  useEffect(() => {
    const initialBalance = getBalance();
    setBalance(initialBalance);

    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUsername(userData.username || 'Игрок');
        setUserId(userData.id || 'tg_123456789');
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    const unsubscribe = subscribeToBalance((newBalance) => {
      setBalance(newBalance);
    });

    return unsubscribe;
  }, []);

  // Join game when connected
  useEffect(() => {
    if (wsStatus === 'connected' && username && userId) {
      joinGame(userId, username);
    }
  }, [wsStatus, username, userId, joinGame]);

  // Sync balance from rollsPlayer
  useEffect(() => {
    if (rollsPlayer?.balance !== undefined) {
      setBalance(rollsPlayer.balance);
      saveBalance(rollsPlayer.balance);
    }
  }, [rollsPlayer]);

  // Animated starry background
  useEffect(() => {
    const canvas = starsCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const stars: { x: number; y: number; radius: number; opacity: number; speed: number }[] = [];
    
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random(),
        speed: Math.random() * 0.002 + 0.001
      });
    }

    let animationFrame: number;
    function animate() {
      ctx.fillStyle = 'rgba(10, 10, 30, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        star.opacity += star.speed;
        if (star.opacity > 1) star.opacity = 0;
        if (star.opacity < 0) star.opacity = 1;

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(star.opacity * Math.PI))})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rollsGameState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    const rotation = (rollsGameState as any).rotation || 0;
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    if (rollsGameState.bets.length === 0) {
      // Empty wheel
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#60A5FA');
      gradient.addColorStop(1, '#3B82F6');
      
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#60A5FA';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Draw bet segments
      rollsGameState.bets.forEach((bet, index) => {
        const isMyBet = bet.playerId === rollsPlayer?.id;
        
        // Create gradient for lighter, glowing colors
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        const baseColor = bet.color;
        gradient.addColorStop(0, baseColor + 'CC');
        gradient.addColorStop(1, baseColor);
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = isMyBet ? 40 : 20;
        ctx.shadowColor = baseColor;
        
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

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw avatar in the middle of segment
        if (bet.avatar_url) {
          const midAngle = ((bet.startAngle + bet.endAngle) / 2 * Math.PI) / 180;
          const avatarRadius = radius * 0.65;
          const avatarX = centerX + Math.cos(midAngle) * avatarRadius;
          const avatarY = centerY + Math.sin(midAngle) * avatarRadius;
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, 25, 0, Math.PI * 2);
          ctx.clip();
          
          const img = new Image();
          img.src = bet.avatar_url;
          ctx.drawImage(img, avatarX - 25, avatarY - 25, 50, 50);
          
          ctx.restore();
        }

        // Player name and percentage
        const midAngle = ((bet.startAngle + bet.endAngle) / 2 * Math.PI) / 180;
        const textRadius = radius * 0.8;
        const textX = centerX + Math.cos(midAngle) * textRadius;
        const textY = centerY + Math.sin(midAngle) * textRadius;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000000';
        ctx.fillText(`${bet.percentage.toFixed(1)}%`, textX, textY);
      });
    }

    ctx.restore();

    // Center circle with total pot
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.3);
    centerGradient.addColorStop(0, 'rgba(20, 20, 50, 0.95)');
    centerGradient.addColorStop(1, 'rgba(10, 10, 30, 0.95)');
    
    ctx.fillStyle = centerGradient;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#8B5CF6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💎${rollsGameState.totalPot.toFixed(0)}`, centerX, centerY);

    // Arrow pointer
    ctx.save();
    ctx.fillStyle = '#FF6B6B';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF6B6B';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 25);
    ctx.lineTo(centerX - 15, centerY - radius - 45);
    ctx.lineTo(centerX + 15, centerY - radius - 45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [rollsGameState, rollsPlayer]);

  function placeBet() {
    if (betAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    rollsPlaceBet(betAmount, 'red', userId);
  }

  function cancelBet() {
    rollsCancelBet();
  }

  function sendChatMessageHandler() {
    if (!chatMessage.trim()) return;
    rollsSendChatMessage(chatMessage.trim());
    setChatMessage('');
  }

  const myBet = rollsGameState?.bets.find(bet => bet.playerId === rollsPlayer?.id);
  const timeLeftSeconds = Math.ceil(((rollsGameState as any)?.timeRemaining || 0) / 1000);

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0">
      {/* Animated starry background */}
      <canvas
        ref={starsCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'radial-gradient(circle, #0a0a1e 0%, #000000 100%)' }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-purple-500/30 bg-black/60 backdrop-blur-sm sticky top-0 z-50">
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
              <div className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                ROLLS
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
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-[1fr,380px] gap-4">
              {/* Wheel Section */}
              <div className="space-y-4">
                {/* Timer and Status */}
                <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-lg md:text-xl font-bold text-white">
                      {rollsGameState?.status === 'waiting' && timeLeftSeconds === 0 && 'Ожидание игроков...'}
                      {rollsGameState?.status === 'waiting' && timeLeftSeconds > 0 && `Время: ${timeLeftSeconds}с`}
                      {rollsGameState?.status === 'countdown' && `Время: ${timeLeftSeconds}с`}
                      {rollsGameState?.status === 'spinning' && 'КРУТИТСЯ...'}
                      {rollsGameState?.status === 'result' && 'ПОБЕДИТЕЛЬ!'}
                    </div>
                    <div className="text-sm md:text-lg text-purple-300">
                      Игроков: {rollsGameState?.bets.length || 0}
                    </div>
                  </div>
                </Card>

                {/* Wheel Canvas */}
                <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 p-4 md:p-6 backdrop-blur-sm">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={500}
                    className="w-full max-w-md mx-auto"
                  />
                </Card>

                {/* Winner Display */}
                {rollsGameState?.status === 'result' && (rollsGameState as any).winnerBet && (
                  <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 p-4 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-300 mb-2">
                        🎉 {(rollsGameState as any).winnerBet.playerName} ПОБЕДИЛ!
                      </div>
                      <div className="text-xl text-white">
                        💎 {(rollsGameState as any).winnerBet.amount.toFixed(0)} (95% от банка)
                      </div>
                      <div className="text-sm text-gray-300 mt-1">
                        Комиссия дома 5%
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Betting Panel */}
              <div className="space-y-4">
                {/* My Bet */}
                {myBet && (
                  <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/50 p-4 backdrop-blur-sm shadow-lg shadow-green-500/20">
                    <div className="text-sm font-semibold text-green-300 mb-2">ВАША СТАВКА</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">💎 {myBet.amount}</div>
                        <div className="text-sm text-green-200">Шанс выигрыша: {myBet.percentage.toFixed(1)}%</div>
                      </div>
                      {(rollsGameState?.status === 'waiting' || rollsGameState?.status === 'countdown') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelBet}
                          className="border-red-500/50 text-red-300 hover:bg-red-500/20"
                        >
                          Отменить
                        </Button>
                      )}
                    </div>
                  </Card>
                )}

                {/* Bet Controls */}
                <Card className="bg-gradient-to-br from-slate-900/80 to-purple-900/80 border-purple-500/30 p-4 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-purple-300 mb-2 block">
                        Сумма ставки
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBetAmount(Math.max(10, betAmount - 50))}
                          className="border-purple-500/50 text-purple-300"
                        >
                          −
                        </Button>
                        <Input
                          type="number"
                          value={betAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || value === '0') {
                              setBetAmount(0);
                            } else {
                              setBetAmount(Number(value));
                            }
                          }}
                          onFocus={(e) => {
                            if (betAmount === 0) {
                              e.target.select();
                            }
                          }}
                          className="flex-1 bg-slate-800 border-purple-500/30 text-white text-center"
                          min="10"
                          max={balance}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBetAmount(betAmount + 50)}
                          className="border-purple-500/50 text-purple-300"
                        >
                          +
                        </Button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {[50, 100, 250, 500].map(amount => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setBetAmount(amount)}
                            className="flex-1 border-purple-500/50 text-purple-300 text-xs"
                          >
                            {amount}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={placeBet}
                      disabled={(rollsGameState?.status !== 'waiting' && rollsGameState?.status !== 'countdown') || betAmount > balance}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-12 shadow-lg shadow-purple-500/50"
                    >
                      {myBet ? 'ДОБАВИТЬ' : 'СДЕЛАТЬ СТАВКУ'}
                    </Button>
                  </div>
                </Card>

                {/* All Bets */}
                <Card className="bg-gradient-to-br from-slate-900/80 to-blue-900/80 border-blue-500/30 p-4 backdrop-blur-sm">
                  <div className="text-sm font-semibold text-blue-300 mb-3">ALL BETS ({rollsGameState?.bets.length || 0})</div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {rollsGameState?.bets.map((bet) => (
                        <div
                          key={bet.id}
                          className={`p-3 rounded-lg border ${
                            bet.playerId === rollsPlayer?.id
                              ? 'bg-green-500/20 border-green-500/50'
                              : 'bg-slate-800/50 border-slate-700/50'
                          }`}
                          style={{ boxShadow: `0 0 15px ${bet.color}40` }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: bet.color, boxShadow: `0 0 8px ${bet.color}` }}
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-white text-sm">{bet.playerName}</div>
                              <div className="text-xs text-gray-300">
                                💎 {bet.amount} • {bet.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Chat FAB */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <Button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/50"
          size="icon"
        >
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>

        {chatOpen && (
          <Card className="absolute bottom-16 right-0 w-80 h-96 bg-slate-900/95 border-purple-500/30 backdrop-blur-lg">
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-purple-500/30">
                <div className="font-bold text-white">Чат</div>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {rollsChatMessages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-semibold text-purple-300">{msg.playerName}: </span>
                      <span className="text-white">{msg.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-purple-500/30">
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessageHandler()}
                    placeholder="Введите сообщение..."
                    className="bg-slate-800 border-purple-500/30 text-white"
                  />
                  <Button
                    onClick={sendChatMessageHandler}
                    size="icon"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RollsGame;
