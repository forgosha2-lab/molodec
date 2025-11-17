import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wallet, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBalance, subscribeToBalance } from "@/lib/balanceSync";

const Deposit = () => {
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

  const handleDeposit = () => {
    const depositAmount = parseInt(amount);
    if (!depositAmount || depositAmount <= 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректную сумму",
        variant: "destructive",
      });
      return;
    }

    if (depositAmount < 50) {
      toast({
        title: "Ошибка",
        description: "Минимальная сумма пополнения - 50 💎",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Пополнение через Криптобот",
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

          <h1 className="text-3xl font-bold mb-6">Пополнение баланса</h1>

          <div className="grid gap-6 max-w-2xl">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Способ оплаты
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
                          Пополнение через Telegram Crypto Bot
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
              <h2 className="text-xl font-semibold mb-4">Сумма пополнения</h2>

              <div className="space-y-4">
                <div>
                  <Input
                    type="number"
                    placeholder="Введите сумму"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg"
                    min="50"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Минимальная сумма: 50 💎
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[100, 500, 1000, 2500, 5000, 10000].map((value) => (
                    <Button
                      key={value}
                      variant="outline"
                      onClick={() => setAmount(value.toString())}
                      className="w-full"
                    >
                      {value} 💎
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Важная информация</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Пополнение происходит мгновенно</li>
                    <li>• Минимальная сумма пополнения: 50 💎</li>
                    <li>• Комиссия платежной системы может варьироваться</li>
                    <li>• Для пополнения используйте Telegram Crypto Bot</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={handleDeposit}
              disabled={!amount || parseInt(amount) < 50}
            >
              Пополнить на {amount || "0"} 💎
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Deposit;
