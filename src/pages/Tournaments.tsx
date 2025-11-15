import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Gem, Clock, Calendar, Crown, Medal, Zap } from "lucide-react";
import { auth } from "@/integrations/database";
import { telegram } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  gameType: string;
  prizePool: number;
  entryFee: number;
  maxParticipants: number;
  currentParticipants: number;
  startDate: string;
  status: "upcoming" | "active" | "finished";
  duration: string;
}

const Tournaments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [activeTab, setActiveTab] = useState("tournaments");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "upcoming" | "active" | "finished">("all");

  useEffect(() => {
    initTelegramAuth();
  }, []);

  const initTelegramAuth = async () => {
    try {
      const telegramUserId = telegram.getUserId();
      const telegramUsername = telegram.getUsername();
      
      setUsername(telegramUsername);

      const { data: existingProfile } = await auth.getProfile(telegramUserId);
      
      if (existingProfile) {
        localStorage.setItem('user', JSON.stringify(existingProfile));
        localStorage.setItem('session', telegramUserId);
        setBalance(existingProfile.diamonds_balance || 100);
      }
    } catch (error) {
      console.error("Telegram auth error:", error);
    }
  };

  // Mock tournaments data
  const tournaments: Tournament[] = [
    {
      id: "1",
      name: "Еженедельный турнир Дурака",
      gameType: "Дурак",
      prizePool: 50000,
      entryFee: 100,
      maxParticipants: 100,
      currentParticipants: 67,
      startDate: "2025-11-15T18:00:00",
      status: "upcoming",
      duration: "2 часа"
    },
    {
      id: "2",
      name: "Быстрый турнир UNO",
      gameType: "UNO",
      prizePool: 25000,
      entryFee: 50,
      maxParticipants: 50,
      currentParticipants: 32,
      startDate: "2025-11-14T20:00:00",
      status: "active",
      duration: "1 час"
    },
    {
      id: "3",
      name: "Гранд-турнир",
      gameType: "Дурак",
      prizePool: 200000,
      entryFee: 500,
      maxParticipants: 200,
      currentParticipants: 145,
      startDate: "2025-11-20T12:00:00",
      status: "upcoming",
      duration: "4 часа"
    },
    {
      id: "4",
      name: "Ночной турнир",
      gameType: "Дурак",
      prizePool: 30000,
      entryFee: 75,
      maxParticipants: 80,
      currentParticipants: 80,
      startDate: "2025-11-13T22:00:00",
      status: "finished",
      duration: "2 часа"
    },
    {
      id: "5",
      name: "Турнир для новичков",
      gameType: "Дурак",
      prizePool: 15000,
      entryFee: 25,
      maxParticipants: 60,
      currentParticipants: 45,
      startDate: "2025-11-16T16:00:00",
      status: "upcoming",
      duration: "1.5 часа"
    },
    {
      id: "6",
      name: "Экспресс-турнир",
      gameType: "UNO",
      prizePool: 20000,
      entryFee: 40,
      maxParticipants: 40,
      currentParticipants: 28,
      startDate: "2025-11-14T19:00:00",
      status: "active",
      duration: "30 минут"
    }
  ];

  const filteredTournaments = tournaments.filter(t => 
    selectedFilter === "all" || t.status === selectedFilter
  );

  const handleJoinTournament = (tournament: Tournament) => {
    if (balance < tournament.entryFee) {
      toast({
        title: "Недостаточно средств",
        description: `Для участия нужно ${tournament.entryFee} бриллиантов`,
        variant: "destructive",
      });
      return;
    }

    if (tournament.currentParticipants >= tournament.maxParticipants) {
      toast({
        title: "Турнир заполнен",
        description: "Все места заняты",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успешно!",
      description: `Вы зарегистрированы на турнир "${tournament.name}"`,
    });
  };

  const getStatusBadge = (status: Tournament["status"]) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Предстоящий</Badge>;
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Активный</Badge>;
      case "finished":
        return <Badge className="bg-muted text-muted-foreground">Завершен</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
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
          {/* Hero Section */}
          <section className="container px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
                  <Trophy className="h-8 w-8 text-primary" />
                  Соревнования
                </h1>
                <p className="text-muted-foreground">
                  Участвуйте в турнирах и выигрывайте призы
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={selectedFilter === "all" ? "default" : "outline"}
                onClick={() => setSelectedFilter("all")}
                size="sm"
              >
                Все
              </Button>
              <Button
                variant={selectedFilter === "upcoming" ? "default" : "outline"}
                onClick={() => setSelectedFilter("upcoming")}
                size="sm"
              >
                Предстоящие
              </Button>
              <Button
                variant={selectedFilter === "active" ? "default" : "outline"}
                onClick={() => setSelectedFilter("active")}
                size="sm"
              >
                Активные
              </Button>
              <Button
                variant={selectedFilter === "finished" ? "default" : "outline"}
                onClick={() => setSelectedFilter("finished")}
                size="sm"
              >
                Завершенные
              </Button>
            </div>

            {/* Tournaments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map((tournament) => (
                <Card key={tournament.id} className="p-6 hover:shadow-lg transition-all hover:border-primary/50">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {tournament.status === "active" && (
                            <Zap className="h-4 w-4 text-green-400 animate-pulse" />
                          )}
                          <h3 className="text-xl font-bold">{tournament.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{tournament.gameType}</p>
                        {getStatusBadge(tournament.status)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-yellow-400" />
                          <span className="text-sm text-muted-foreground">Призовой фонд</span>
                        </div>
                        <span className="font-bold text-lg flex items-center gap-1">
                          <Gem className="h-5 w-5 text-primary" />
                          {tournament.prizePool.toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>
                            {tournament.currentParticipants}/{tournament.maxParticipants}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Gem className="h-4 w-4 text-primary" />
                          <span>Вход: {tournament.entryFee}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{tournament.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">
                            {formatDate(tournament.startDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleJoinTournament(tournament)}
                      disabled={
                        tournament.status === "finished" ||
                        tournament.currentParticipants >= tournament.maxParticipants ||
                        balance < tournament.entryFee
                      }
                    >
                      {tournament.status === "finished"
                        ? "Завершен"
                        : tournament.currentParticipants >= tournament.maxParticipants
                        ? "Мест нет"
                        : balance < tournament.entryFee
                        ? "Недостаточно средств"
                        : "Участвовать"}
                    </Button>
                  </div>
                </Card>
              ))}

              {filteredTournaments.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-lg">
                    Турниры не найдены
                  </p>
                </div>
              )}
            </div>

            {/* Leaderboard Section */}
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Medal className="h-6 w-6 text-primary" />
                Топ игроков турниров
              </h2>

              <Card className="p-6">
                <div className="space-y-4">
                  {[
                    { rank: 1, name: "Champion***", wins: 45, prize: "💎 1,250,000" },
                    { rank: 2, name: "Winner***", wins: 38, prize: "💎 980,000" },
                    { rank: 3, name: "Pro***", wins: 32, prize: "💎 750,000" },
                    { rank: 4, name: "Master***", wins: 28, prize: "💎 620,000" },
                    { rank: 5, name: "Elite***", wins: 25, prize: "💎 510,000" },
                  ].map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          player.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                          player.rank === 2 ? "bg-gray-400/20 text-gray-300" :
                          player.rank === 3 ? "bg-orange-500/20 text-orange-400" :
                          "bg-primary/20 text-primary"
                        }`}>
                          {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank === 3 ? "🥉" : player.rank}
                        </div>
                        <div>
                          <span className="font-semibold block">{player.name}</span>
                          <span className="text-xs text-muted-foreground">{player.wins} побед</span>
                        </div>
                      </div>
                      <span className="font-bold text-lg">{player.prize}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
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

export default Tournaments;

