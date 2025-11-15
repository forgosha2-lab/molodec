import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Gem, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lobby {
  id: string;
  name: string;
  host_id: string;
  max_players: number;
  current_players: number;
  bet_amount: number;
  is_private: boolean;
  is_throw_in: boolean;
  deck_size: number;
  status: string;
  profiles: {
    username: string;
  };
}

const Lobbies = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("lobbies");
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Create lobby form state
  const [lobbyName, setLobbyName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [betAmount, setBetAmount] = useState("10");
  const [deckSize, setDeckSize] = useState("36");
  const [isThrowIn, setIsThrowIn] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    checkAuth();
    loadLobbies();
  }, []);

  const checkAuth = async () => {
    const session = localStorage.getItem('session');
    const userStr = localStorage.getItem('user');
    
    if (!session || !userStr) {
      navigate("/");
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      setUserId(user.id);
    } catch (error) {
      console.error("Error parsing user:", error);
      navigate("/");
    }
  };

  const loadLobbies = async () => {
    try {
      const response = await fetch('/api/lobbies');
      const { data, error } = await response.json();
      
      if (error || !data) {
        console.error("Error loading lobbies:", error);
        return;
      }

      const formattedLobbies = data.map((lobby: any) => ({
        ...lobby,
        profiles: { username: lobby.host_username }
      }));

      setLobbies(formattedLobbies);
    } catch (error) {
      console.error("Error loading lobbies:", error);
    }
  };



  const createLobby = async () => {
    if (!userId) return;

    if (!lobbyName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название лобби",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/lobbies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: lobbyName,
          maxPlayers: parseInt(maxPlayers),
          betAmount: parseInt(betAmount),
          deckSize: parseInt(deckSize),
          isThrowIn,
          isPrivate,
          password: isPrivate ? password : null
        })
      });

      const { data, error } = await response.json();

      if (error || !data) {
        toast({
          title: "Ошибка",
          description: error || "Не удалось создать лобби",
          variant: "destructive",
        });
        return;
      }

      setIsCreateDialogOpen(false);
      toast({
        title: "Лобби создано",
        description: "Ожидайте присоединения других игроков",
      });

      navigate(`/game/${data.lobbyId}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать лобби",
        variant: "destructive",
      });
    }
  };

  const joinLobby = async (lobby: Lobby) => {
    if (!userId) return;

    // If lobby is private, prompt for password
    let password = null;
    if (lobby.is_private) {
      password = prompt("Введите пароль лобби:");
      if (!password) return;
    }

    try {
      const response = await fetch('/api/lobbies/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lobbyId: lobby.id,
          password
        })
      });

      const { data, error } = await response.json();

      if (error || !data) {
        toast({
          title: "Ошибка",
          description: error || "Не удалось присоединиться к лобби",
          variant: "destructive",
        });
        return;
      }

      navigate(`/game/${lobby.id}`);
    } catch (error) {
      console.error("Error joining lobby:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось присоединиться к лобби",
        variant: "destructive",
      });
    }
  };

  // Filter states
  const [filterBet, setFilterBet] = useState("all");
  const [filterPlayers, setFilterPlayers] = useState("all");
  const [filterDeck, setFilterDeck] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const filteredLobbies = lobbies.filter(lobby => {
    if (filterBet !== "all" && lobby.bet_amount !== parseInt(filterBet)) return false;
    if (filterPlayers !== "all" && lobby.max_players !== parseInt(filterPlayers)) return false;
    if (filterDeck !== "all" && lobby.deck_size !== parseInt(filterDeck)) return false;
    if (filterType !== "all") {
      if (filterType === "подкидной" && !lobby.is_throw_in) return false;
      if (filterType === "переводной" && lobby.is_throw_in) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        balance={0}
        onDepositClick={() => {}}
      />

      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onDurakClick={() => navigate("/lobbies")}
        />

        <main className={`flex-1 pb-12 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
          <section className="container px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                Лобби игры "Дурак"
              </h1>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Создать лобби
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Создать новое лобби</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Название лобби</Label>
                      <Input
                        id="name"
                        value={lobbyName}
                        onChange={(e) => setLobbyName(e.target.value)}
                        placeholder="Моя игра"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="players">Количество игроков</Label>
                      <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 игрока</SelectItem>
                          <SelectItem value="3">3 игрока</SelectItem>
                          <SelectItem value="4">4 игрока</SelectItem>
                          <SelectItem value="6">6 игроков</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bet">Ставка (бриллианты)</Label>
                      <Input
                        id="bet"
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deck">Колода карт</Label>
                      <Select value={deckSize} onValueChange={setDeckSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 карты</SelectItem>
                          <SelectItem value="36">36 карт</SelectItem>
                          <SelectItem value="52">52 карты</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="throw-in">Подкидной дурак</Label>
                      <Switch
                        id="throw-in"
                        checked={isThrowIn}
                        onCheckedChange={setIsThrowIn}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="private">Приватное лобби</Label>
                      <Switch
                        id="private"
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                      />
                    </div>

                    {isPrivate && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Пароль</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Введите пароль"
                        />
                      </div>
                    )}

                    <Button className="w-full" onClick={createLobby}>
                      Создать
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters Section */}
            <Card className="p-4 mb-6">
              <h3 className="font-semibold mb-4">Фильтры</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Ставка</Label>
                  <Select value={filterBet} onValueChange={setFilterBet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Любая" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Любая</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Игроков</Label>
                  <Select value={filterPlayers} onValueChange={setFilterPlayers}>
                    <SelectTrigger>
                      <SelectValue placeholder="Любое" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Любое</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Колода</Label>
                  <Select value={filterDeck} onValueChange={setFilterDeck}>
                    <SelectTrigger>
                      <SelectValue placeholder="Любая" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Любая</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="36">36</SelectItem>
                      <SelectItem value="52">52</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Тип игры</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      <SelectItem value="подкидной">Подкидной</SelectItem>
                      <SelectItem value="переводной">Переводной</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLobbies.map((lobby) => (
                <Card key={lobby.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          {lobby.is_private ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Unlock className="h-4 w-4 text-muted-foreground" />
                          )}
                          {lobby.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Хост: {lobby.profiles?.username || "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Игроки:</span>
                        <span className="font-semibold">
                          {lobby.current_players}/{lobby.max_players}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ставка:</span>
                        <span className="font-semibold flex items-center gap-1">
                          <Gem className="h-4 w-4 text-primary" />
                          {lobby.bet_amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Колода:</span>
                        <span className="font-semibold">{lobby.deck_size} карт</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Тип:</span>
                        <span className="font-semibold">
                          {lobby.is_throw_in ? "Подкидной" : "Переводной"}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => joinLobby(lobby)}
                      disabled={lobby.current_players >= lobby.max_players}
                    >
                      {lobby.current_players >= lobby.max_players
                        ? "Лобби заполнено"
                        : "Присоединиться"}
                    </Button>
                  </div>
                </Card>
              ))}

              {filteredLobbies.length === 0 && lobbies.length > 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Лобби с такими фильтрами не найдено
                  </p>
                </div>
              )}

              {lobbies.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Нет доступных лобби. Создайте своё!
                  </p>
                </div>
              )}
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

export default Lobbies;
