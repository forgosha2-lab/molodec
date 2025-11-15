import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Gem, 
  Trophy, 
  TrendingUp, 
  Award,
  Gamepad2,
  Edit,
  Crown,
  ArrowLeft
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
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>

            {/* Profile Header */}
            <Card className="p-6 mb-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
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

            {/* Достижения */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Достижения
              </h2>
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">Скоро...</p>
              </div>
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

export default Profile;

