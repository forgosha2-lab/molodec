import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wallet, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBalance, subscribeToBalance } from "@/lib/balanceSync";

const Withdrawal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(100);
  const [username, setUsername] = useState("Игрок");
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("cryptobot");

  useEffect(() => {
    const initialBalance = getBalance();
    setBalance(initialBalance);

    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUsername(userData.username || 'Игрок');
        setBalance(userData.diamondsBalance || userData.diamonds_balance || 100);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    const unsubscribe = subscribeToBalance((newBalance) => {
      setBalance(newBalance);
    });

    return unsubscribe;
  }, []);

  const handleWithdrawal = () => {
    const withdrawalAmount = parseInt(amount);
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректную сумму",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount < 500) {
      toast({
        title: "Ошибка",
        description: "Минимальная сумма вывода - 500 💎",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount > 50000) {
      toast({
        title: "Ошибка",
        description: "Максимальная сумма вывода - 50,000 💎",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount > balance) {
      toast({
        title: "Ошибка",
        description: "Недостаточно средств на балансе",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Вывод через Криптобот",
      description: "Функция в разработке. Скоро будет доступна!",
    });
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
        <main className="flex-1 container px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>

          <h1 className="text-3xl font-bold mb-6">Вывод средств</h1>

          <div className="grid gap-6 max-w-2xl">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Доступный баланс</h2>
                <p className="text-2xl font-bold text-primary">{balance} 💎</p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Способ вывода
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => setSelectedMethod("cryptobot")}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedMethod === "cryptobot"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Crypto Bot</p>
                        <p className="text-sm text-muted-foreground">
                          Вывод через Telegram Crypto Bot
                        </p>
                      </div>
                    </div>
                    {selectedMethod === "cryptobot" && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Сумма вывода</h2>

              <div className="space-y-4">
                <div>
                  <Input
                    type="number"
                    placeholder="Введите сумму"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg"
                    min="500"
                    max={Math.min(balance, 50000)}
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <p>Минимум: 500 💎 | Максимум: 50,000 💎</p>
                    <p>Доступно: {balance.toLocaleString()} 💎</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[500, 1000, 2500, 5000, 10000].map((value) => (
                    <Button
                      key={value}
                      variant="outline"
                      onClick={() => setAmount(value.toString())}
                      disabled={value > balance}
                      className="w-full"
                    >
                      {value} 💎
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setAmount(Math.min(balance, 50000).toString())}
                    className="w-full"
                    disabled={balance < 500}
                  >
                    Макс
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Внимание</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Вывод обрабатывается в течение 24 часов</li>
                    <li>• Минимальная сумма вывода: 500 💎</li>
                    <li>• Максимальная сумма вывода: 50,000 💎</li>
                    <li>• Комиссия сети взимается отдельно</li>
                    <li>• Убедитесь, что указали правильные реквизиты</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Информация о выводе</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Вывод осуществляется через Telegram Crypto Bot</li>
                    <li>• Средства поступают после проверки безопасности</li>
                    <li>• Максимальная сумма вывода в сутки: 50,000 💎</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={handleWithdrawal}
              disabled={!amount || parseInt(amount) < 500 || parseInt(amount) > Math.min(balance, 50000)}
            >
              Вывести {amount || "0"} 💎
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Withdrawal;
