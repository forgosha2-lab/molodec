import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileMenu } from "@/components/MobileMenu";
import { GameCard } from "@/components/GameCard";
import { Coins } from "lucide-react";
import durakImg from "@/assets/durak.png";
import unoImg from "@/assets/uno.png";
import coinflipImg from "@/assets/coinflipe.png";
import rollsImg from "@/assets/rolls.png";
import { getBalance, subscribeToBalance } from "@/lib/balanceSync";
import { useToast } from "@/hooks/use-toast";

const Games = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [activeTab, setActiveTab] = useState("games");

  useEffect(() => {
    const initialBalance = getBalance();
    setBalance(initialBalance);
    
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUsername(userData.username || 'Игрок');
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    
    const unsubscribe = subscribeToBalance((newBalance) => {
      setBalance(newBalance);
    });
    
    return unsubscribe;
  }, []);

  const handleDurakClick = () => {
    navigate("/lobbies");
  };

  const handleUnoClick = () => {
    navigate("/uno-game");
  };


  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onMenuClick={() => {}}
        balance={balance}
        username={username}
        onDepositClick={() => toast({ title: "Пополнение", description: "Функция в разработке" })}
      />

      <div className="flex">
        <main className="flex-1 pb-12">
          <section className="container px-4 py-6 md:py-8">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Coins className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                Все игры
              </h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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

