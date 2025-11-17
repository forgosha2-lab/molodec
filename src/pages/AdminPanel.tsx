import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, DollarSign, Users, Search, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBalance, subscribeToBalance } from "@/lib/balanceSync";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [adminKey, setAdminKey] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [earnings, setEarnings] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleLogin = async () => {
    if (!adminKey) {
      toast({
        title: "Ошибка",
        description: "Введите ключ администратора",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/earnings?adminKey=${adminKey}`);
      if (response.ok) {
        const { data } = await response.json();
        setEarnings(data);
        setIsAuthorized(true);
        await loadUsers();
        toast({
          title: "Успешно",
          description: "Вход выполнен",
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Неверный ключ администратора",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?adminKey=${adminKey}${searchQuery ? `&search=${searchQuery}` : ''}`);
      if (response.ok) {
        const { data } = await response.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSearch = async () => {
    await loadUsers();
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Админ Панель</h1>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Введите ключ администратора"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Войти
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onMenuClick={() => {}}
        balance={balance}
        username={username}
        onDepositClick={() => navigate("/deposit")}
      />

      <div className="flex">
        <main className="flex-1 container px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>

          <h1 className="text-3xl font-bold mb-6">Административная панель</h1>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Общий доход</h3>
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold">{earnings?.total ? `${parseFloat(earnings.total).toFixed(2)} 💎` : '0 💎'}</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Rolls заработок</h3>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">
                  {earnings?.byGame?.find((g: any) => g.game === 'rolls')?.total_earnings 
                    ? `${parseFloat(earnings.byGame.find((g: any) => g.game === 'rolls').total_earnings).toFixed(2)} 💎`
                    : '0 💎'}
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Coinflip заработок</h3>
                  <TrendingUp className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold">
                  {earnings?.byGame?.find((g: any) => g.game === 'coinflip')?.total_earnings 
                    ? `${parseFloat(earnings.byGame.find((g: any) => g.game === 'coinflip').total_earnings).toFixed(2)} 💎`
                    : '0 💎'}
                </p>
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Пользователи
              </h2>

              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Поиск по имени пользователя"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Пользователь</th>
                      <th className="text-left p-2">Баланс</th>
                      <th className="text-left p-2">Уровень</th>
                      <th className="text-left p-2">Побед</th>
                      <th className="text-left p-2">Игр</th>
                      <th className="text-left p-2">Создан</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-secondary/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {user.avatar_url && (
                              <img
                                src={user.avatar_url}
                                alt={user.username}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <span>{user.username}</span>
                          </div>
                        </td>
                        <td className="p-2 font-semibold">💎 {(user.diamonds_balance || 0).toLocaleString()}</td>
                        <td className="p-2">{user.level || 1}</td>
                        <td className="p-2">{user.total_wins || 0}</td>
                        <td className="p-2">{user.total_games || 0}</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
