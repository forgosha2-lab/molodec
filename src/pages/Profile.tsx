import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Gem, 
  Trophy, 
  Medal, 
  TrendingUp, 
  Calendar,
  Award,
  Gamepad2,
  Settings,
  Edit,
  Crown
} from "lucide-react";
import { auth } from "@/integrations/database";
import { telegram } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  level: number;
  total_wins: number;
  total_games: number;
  diamonds_won: number;
  diamonds_balance: number;
  created_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    initTelegramAuth();
    loadProfile();
    loadAchievements();
  }, []);

  const initTelegramAuth = async () => {
    try {
      const telegramUserId = telegram.getUserId();
      const telegramUsername = telegram.getUsername();
      
      setUsername(telegramUsername);

      // Check if user exists
      const { data: existingProfile } = await auth.getProfile(telegramUserId);
      
      if (!existingProfile) {
        // Auto-register user from Telegram
        const tempPassword = Math.random().toString(36).substring(2);
        const { user, error } = await auth.signUp(telegramUserId, tempPassword, telegramUsername);
        
        if (!error && user) {
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('session', telegramUserId);
          setBalance(user.diamonds_balance || 100);
          setProfile(user);
          setUsername(user.username || telegramUsername);
          
          toast({
            title: "Добро пожаловать!",
            description: `Вы автоматически зарегистрированы как ${telegramUsername}`,
          });
        }
      } else {
        localStorage.setItem('user', JSON.stringify(existingProfile));
        localStorage.setItem('session', telegramUserId);
        setBalance(existingProfile.diamonds_balance || 100);
        setProfile(existingProfile);
        setUsername(existingProfile.username || telegramUsername);
      }
    } catch (error) {
      console.error("Telegram auth error:", error);
      if (telegram.isAvailable()) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить профиль",
          variant: "destructive",
        });
      }
    }
  };

  const loadProfile = async () => {
    try {
      const session = localStorage.getItem('session');
      if (!session) {
        navigate("/");
        return;
      }

      const { data } = await auth.getProfile(session);
      if (data) {
        setProfile(data);
        setBalance(data.diamonds_balance || 100);
        setUsername(data.username || "Игрок");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadAchievements = () => {
    // Mock achievements
    const mockAchievements: Achievement[] = [
      {
        id: "1",
        name: "Первая победа",
        description: "Выиграй свою первую игру",
        icon: "🏆",
        unlocked_at: "2025-11-10"
      },
      {
        id: "2",
        name: "Опытный игрок",
        description: "Выиграй 10 игр",
        icon: "⭐",
        unlocked_at: "2025-11-12"
      },
      {
        id: "3",
        name: "Богач",
        description: "Накопи 1000 бриллиантов",
        icon: "💎",
      },
      {
        id: "4",
        name: "Мастер дурака",
        description: "Выиграй 50 игр",
        icon: "👑",
      },
    ];
    setAchievements(mockAchievements);
  };

  const winRate = profile 
    ? profile.total_games > 0 
      ? ((profile.total_wins / profile.total_games) * 100).toFixed(1)
      : "0"
    : "0";

  const formatDate = (dateString: string) => {
    if (!dateString) return "Не указано";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        balance={balance}
        username={username}
        onDepositClick={() => toast({ title: "Пополнение", description: "Функция в разработке" })}
      />

      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onDurakClick={() => navigate("/lobbies")}
        />

        <main className={`flex-1 pb-12 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
          <section className="container px-4 py-8">
            {/* Profile Header */}
            <Card className="p-6 mb-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary">
                    Уровень {profile?.level || 1}
                  </Badge>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{username}</h1>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Участник с {formatDate(profile?.created_at || "")}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary">
                      <Gem className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{balance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <span className="font-semibold">{profile?.total_wins || 0} побед</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary">
                      <Gamepad2 className="h-5 w-5 text-blue-400" />
                      <span className="font-semibold">{profile?.total_games || 0} игр</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Процент побед</span>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <div className="text-3xl font-bold">{winRate}%</div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Выиграно бриллиантов</span>
                  <Gem className="h-4 w-4 text-primary" />
                </div>
                <div className="text-3xl font-bold flex items-center gap-1">
                  <Gem className="h-6 w-6 text-primary" />
                  {(profile?.diamonds_won || 0).toLocaleString()}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Текущий баланс</span>
                  <Crown className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="text-3xl font-bold flex items-center gap-1">
                  <Gem className="h-6 w-6 text-primary" />
                  {balance.toLocaleString()}
                </div>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="achievements" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="achievements">Достижения</TabsTrigger>
                <TabsTrigger value="history">История</TabsTrigger>
                <TabsTrigger value="settings">Настройки</TabsTrigger>
              </TabsList>

              <TabsContent value="achievements" className="mt-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Award className="h-6 w-6 text-primary" />
                    Достижения
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          achievement.unlocked_at
                            ? "bg-primary/10 border-primary/50 hover:border-primary"
                            : "bg-secondary/50 border-border opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{achievement.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold">{achievement.name}</h3>
                            {achievement.unlocked_at && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Разблокировано
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                        {achievement.unlocked_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(achievement.unlocked_at)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    История игр
                  </h2>
                  <div className="space-y-4">
                    {[
                      { game: "Дурак", result: "Победа", date: "2025-11-13", prize: 50 },
                      { game: "Дурак", result: "Поражение", date: "2025-11-12", prize: -10 },
                      { game: "UNO", result: "Победа", date: "2025-11-11", prize: 30 },
                      { game: "Дурак", result: "Победа", date: "2025-11-10", prize: 25 },
                    ].map((game, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            game.result === "Победа" 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {game.result === "Победа" ? "✓" : "✗"}
                          </div>
                          <div>
                            <span className="font-semibold block">{game.game}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(game.date)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${
                            game.prize > 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {game.prize > 0 ? "+" : ""}
                            <Gem className="h-4 w-4 inline-block ml-1" />
                            {Math.abs(game.prize)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" />
                    Настройки
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-secondary">
                      <h3 className="font-semibold mb-2">Уведомления</h3>
                      <p className="text-sm text-muted-foreground">
                        Настройки уведомлений будут доступны в следующем обновлении
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary">
                      <h3 className="font-semibold mb-2">Приватность</h3>
                      <p className="text-sm text-muted-foreground">
                        Настройки приватности будут доступны в следующем обновлении
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
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

export default Profile;

