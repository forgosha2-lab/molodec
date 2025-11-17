import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gem, Coins, ChevronLeft, ChevronRight, Dices, TrendingUp, Circle, Target } from "lucide-react";
import durakImg from "@/assets/durak.png";
import unoImg from "@/assets/uno.png";
import bonusBanner from "@/assets/bonus-banner.png";
import coinflipImg from "@/assets/coinflipe.png";
import rollsImg from "@/assets/rolls.png";
import { auth } from "@/integrations/database";
import { telegram } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";
import { getBalance, fetchBalanceFromServer, subscribeToBalance } from "@/lib/balanceSync";
import useEmblaCarousel from "embla-carousel-react";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [activeTab, setActiveTab] = useState("home");
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [emblaRef] = useEmblaCarousel({ 
    align: 'start', 
    dragFree: true,
    containScroll: 'trimSnaps'
  });

  useEffect(() => {
    const init = async () => {
      await initTelegramAuth();
      
      // Load balance from server
      const serverBalance = await fetchBalanceFromServer();
      setBalance(serverBalance);
      
      // Load top players
      await loadTopPlayers();
    };
    
    init();
    
    // Subscribe to balance changes
    const unsubscribe = subscribeToBalance((newBalance) => {
      setBalance(newBalance);
    });
    
    return unsubscribe;
  }, []);

  const loadTopPlayers = async () => {
    try {
      const response = await fetch('/api/leaderboard/top?limit=5');
      const { data } = await response.json();
      if (data) {
        setTopPlayers(data);
      }
    } catch (error) {
      console.error('Error loading top players:', error);
    }
  };

  const initTelegramAuth = async () => {
    try {
      const telegramUserId = telegram.getUserId();
      const telegramUsername = telegram.getUsername();
      
      setUsername(telegramUsername);

      // Check if user exists
      let existingProfile = null;
      try {
        const profileResult = await auth.getProfile(telegramUserId);
        existingProfile = profileResult.data;
      } catch (error) {
        // Profile not found, will try to register
        console.log("Profile not found, will register");
      }
      
      if (!existingProfile) {
        // Auto-register user from Telegram
        const tempPassword = Math.random().toString(36).substring(2);
        const { user, error } = await auth.signUp(telegramUserId, tempPassword, telegramUsername);
        
        if (!error && user) {
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('session', telegramUserId);
          setBalance(user.diamonds_balance || 100);
          
          toast({
            title: "Добро пожаловать!",
            description: `Вы автоматически зарегистрированы как ${telegramUsername}`,
          });
        } else if (error && error.includes('уже существует')) {
          // User already exists, try to get profile again
          try {
            const profileResult = await auth.getProfile(telegramUserId);
            if (profileResult.data) {
              localStorage.setItem('user', JSON.stringify(profileResult.data));
              localStorage.setItem('session', telegramUserId);
              setBalance(profileResult.data.diamonds_balance || 100);
              setUsername(profileResult.data.username || telegramUsername);
            }
          } catch (err) {
            console.error("Failed to get existing profile:", err);
          }
        } else if (error) {
          console.error("Registration error:", error);
        }
      } else {
        localStorage.setItem('user', JSON.stringify(existingProfile));
        localStorage.setItem('session', telegramUserId);
        setBalance(existingProfile.diamonds_balance || 100);
        setUsername(existingProfile.username || telegramUsername);
      }
    } catch (error) {
      console.error("Telegram auth error:", error);
      // Не показываем ошибку пользователю, если это просто проблема с Telegram в разработке
      if (telegram.isAvailable()) {
      toast({
        title: "Ошибка",
        description: "Не удалось авторизоваться через Telegram",
        variant: "destructive",
      });
      }
    }
  };

  const handleDurakClick = () => {
    navigate("/lobbies");
  };

  const handleUnoClick = () => {
    navigate("/uno-game");
  };


  const handleTournamentsClick = () => {
    navigate("/tournaments");
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onMenuClick={() => {}}
        balance={balance}
        username={username}
        onDepositClick={() => navigate("/deposit")}
      />

      <div className="flex">
        <main className="flex-1 pb-12">
          {/* Hero Banner Section */}
          <section className="container px-3 md:px-4 py-4 md:py-8">
            <div className="relative rounded-xl md:rounded-2xl overflow-hidden">
              <img
                src={bonusBanner}
                alt="Bonus Banner"
                className="w-full h-[160px] sm:h-[200px] md:h-[280px] lg:h-[350px] object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 md:px-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/30 hover:bg-black/50 text-white h-8 w-8 md:h-10 md:w-10"
                >
                  <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/30 hover:bg-black/50 text-white h-8 w-8 md:h-10 md:w-10"
                >
                  <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
                </Button>
              </div>
            </div>
          </section>

          {/* Games Section */}
          <section className="container px-3 md:px-4 py-4 md:py-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Coins className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Игры
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-3 md:flex md:flex-nowrap md:overflow-x-auto">
              <GameCard
                title="UNO"
                image={unoImg}
                gradient="bg-gradient-to-br from-red-600 via-blue-600 to-green-600"
                onClick={handleUnoClick}
              />
              <GameCard
                title="Дурак"
                image={durakImg}
                gradient="bg-gradient-to-br from-purple-600 via-pink-600 to-red-600"
                onClick={handleDurakClick}
              />
              <GameCard
                title="Coinflip"
                image={coinflipImg}
                gradient="bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600"
                onClick={() => navigate("/coinflip-game")}
              />
              <GameCard
                title="Rolls"
                image={rollsImg}
                gradient="bg-gradient-to-br from-green-600 via-teal-600 to-blue-600"
                onClick={() => navigate("/rolls-game")}
              />
            </div>
          </section>

          {/* Leaderboard Section */}
          <section className="container px-3 md:px-4 py-4 md:py-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
              <Gem className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Рейтинг богатейших игроков
            </h2>

            <Card className="p-4 md:p-6">
              {topPlayers.length > 0 ? (
                <div className="space-y-2 md:space-y-3">
                  {topPlayers.map((player, index) => (
                    <div
                      key={player.id || index}
                      className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs md:text-sm">
                          {index + 1}
                        </div>
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.username}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                            <span className="text-sm md:text-base font-bold text-primary">
                              {player.username?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <span className="font-semibold text-sm md:text-base">{player.username}</span>
                      </div>
                      <span className="font-bold text-sm md:text-base">💎 {(player.diamondsBalance || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm md:text-base">Пока нет игроков в рейтинге</p>
                  <p className="text-xs md:text-sm mt-2">Начните играть, чтобы попасть в топ!</p>
                </div>
              )}
            </Card>
          </section>
        </main>
      </div>

      <MobileMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAuthenticated={true}
      />
    </div>
  );
};

export default Index;
