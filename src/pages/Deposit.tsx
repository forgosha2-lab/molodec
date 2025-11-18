import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Wallet, Info, ArrowDownToLine } from "lucide-react";
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

    if (depositAmount < 300) {
      toast({
        title: "Ошибка",
        description: "Минимальная сумма пополнения - 300 💎",
        variant: "destructive",
      });
      return;
    }

    if (depositAmount > 50000) {
      toast({
        title: "Ошибка",
        description: "Максимальная сумма пополнения - 50,000 💎",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Пополнение через Криптобот",
      description: "Функция в разработке. Скоро будет доступна!",
    });
  };

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
        <main className="flex-1 container px-3 md:px-4 py-4 md:py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 md:mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Баланс</h1>

          <Tabs defaultValue="deposit" className="w-full max-w-2xl">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="deposit" className="gap-2">
                <Wallet className="h-4 w-4" />
                Пополнение
              </TabsTrigger>
              <TabsTrigger value="withdrawal" className="gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                Вывод
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposit" className="space-y-4 md:space-y-6">
              <Card className="p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Способ оплаты
                </h2>

                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedMethod("cryptobot")}
                    className={`w-full p-3 md:p-4 rounded-lg border-2 transition-all ${
                      selectedMethod === "cryptobot"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Wallet className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm md:text-base">Crypto Bot</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Пополнение через Telegram
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

              <Card className="p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4">Сумма пополнения</h2>

                <div className="space-y-4">
                  <div>
                    <Input
                      type="number"
                      placeholder="Введите сумму"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-base md:text-lg h-12 md:h-auto"
                      min="300"
                      max="50000"
                    />
                    <p className="text-xs md:text-sm text-muted-foreground mt-2">
                      Минимум: 300 💎 | Максимум: 50,000 💎
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[300, 500, 1000, 2500, 5000, 10000].map((value) => (
                      <Button
                        key={value}
                        variant="outline"
                        onClick={() => setAmount(value.toString())}
                        className="w-full text-xs md:text-sm h-10 md:h-auto"
                      >
                        {value} 💎
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-start gap-2 md:gap-3">
                  <Info className="h-4 w-4 md:h-5 md:w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1 text-sm md:text-base">Важная информация</p>
                    <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
                      <li>• Пополнение происходит мгновенно</li>
                      <li>• Минимальная сумма: 300 💎</li>
                      <li>• Максимальная сумма: 50,000 💎</li>
                      <li>• 1 алмаз = 1₽</li>
                      <li>• Для пополнения используйте Telegram Crypto Bot</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Button
                size="lg"
                className="w-full h-12 md:h-auto text-sm md:text-base"
                onClick={handleDeposit}
                disabled={!amount || parseInt(amount) < 300 || parseInt(amount) > 50000}
              >
                Пополнить на {amount || "0"} 💎
              </Button>
            </TabsContent>

            <TabsContent value="withdrawal" className="space-y-4 md:space-y-6">
              <Card className="p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Способ вывода
                </h2>

                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedMethod("cryptobot")}
                    className={`w-full p-3 md:p-4 rounded-lg border-2 transition-all ${
                      selectedMethod === "cryptobot"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Wallet className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm md:text-base">Crypto Bot</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Вывод через Telegram
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

              <Card className="p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4">Сумма вывода</h2>

                <div className="space-y-4">
                  <div>
                    <Input
                      type="number"
                      placeholder="Введите сумму"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-base md:text-lg h-12 md:h-auto"
                      min="500"
                      max={Math.min(balance, 50000)}
                    />
                    <p className="text-xs md:text-sm text-muted-foreground mt-2">
                      Минимум: 500 💎 | Максимум: 50,000 💎 | Доступно: {balance.toLocaleString()} 💎
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[500, 1000, 2500, 5000, 10000, Math.min(balance, 50000)].map((value, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => setAmount(value.toString())}
                        className="w-full text-xs md:text-sm h-10 md:h-auto"
                        disabled={value > balance}
                      >
                        {index === 5 ? "Макс" : `${value} 💎`}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-start gap-2 md:gap-3">
                  <Info className="h-4 w-4 md:h-5 md:w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1 text-sm md:text-base">Важная информация</p>
                    <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
                      <li>• Вывод обрабатывается в течение 24 часов</li>
                      <li>• Минимальная сумма: 500 💎</li>
                      <li>• Максимальная сумма: 50,000 💎</li>
                      <li>• 1 алмаз = 1₽</li>
                      <li>• Для вывода используйте Telegram Crypto Bot</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Button
                size="lg"
                className="w-full h-12 md:h-auto text-sm md:text-base"
                onClick={handleWithdrawal}
                disabled={!amount || parseInt(amount) < 500 || parseInt(amount) > Math.min(balance, 50000)}
              >
                Вывести {amount || "0"} 💎
              </Button>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Deposit;
