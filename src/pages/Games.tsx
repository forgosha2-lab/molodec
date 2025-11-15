import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Gem, Coins } from "lucide-react";
import durakImg from "@/assets/durak.png";
import unoImg from "@/assets/uno.png";
import { auth } from "@/integrations/database";
import { telegram } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";

const Games = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [activeTab, setActiveTab] = useState("games");

  useEffect(() => {
    initTelegramAuth();
  }, []);

  const initTelegramAuth = async () => {
    try {
      const telegramUserId = telegram.getUserId();
      const telegramUsername = telegram.getUsername();
      
      setUsername(telegramUsername);

      const { data: existingProfile } = await auth.getProfile(telegramUserId);
      
      if (!existingProfile) {
        const tempPassword = Math.random().toString(36).substring(2);
        const { user, error } = await auth.signUp(telegramUserId, tempPassword, telegramUsername);
        
        if (!error && user) {
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('session', telegramUserId);
          setBalance(user.diamonds_balance || 100);
        }
      } else {
        localStorage.setItem('user', JSON.stringify(existingProfile));
        localStorage.setItem('session', telegramUserId);
        setBalance(existingProfile.diamonds_balance || 100);
      }
    } catch (error) {
      console.error("Telegram auth error:", error);
    }
  };

  const handleDurakClick = () => {
    navigate("/lobbies");
  };

  const handleUnoClick = () => {
    navigate("/uno-game");
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
          onDurakClick={handleDurakClick}
        />

        <main className={`flex-1 pb-12 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
          {/* Classic Games Section */}
          <section className="container px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Gem className="h-6 w-6 text-primary" />
                Классические игры
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <GameCard
                title="Дурак"
                image={durakImg}
                gradient="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700"
                onClick={handleDurakClick}
              />
              <GameCard
                title="UNO"
                image={unoImg}
                gradient="bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600"
                onClick={handleUnoClick}
              />
            </div>
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

export default Games;

