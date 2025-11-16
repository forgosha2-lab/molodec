import { Button } from "@/components/ui/button";
import { Home, Gamepad2, Trophy, Gift, Menu, Gem, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { getBalance, subscribeToBalance } from "@/lib/balanceSync";

interface HeaderProps {
  onMenuClick: () => void;
  balance?: number;
  username?: string;
  onDepositClick?: () => void;
}

export const Header = ({ onMenuClick, balance = 0, username = "Игрок", onDepositClick }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  const [syncedBalance, setSyncedBalance] = useState(() => getBalance());

  // Subscribe to centralized balance changes
  useEffect(() => {
    // Initialize from BalanceSync on mount
    const currentBalance = getBalance();
    setSyncedBalance(currentBalance);
    
    const unsubscribe = subscribeToBalance((newBalance) => {
      setSyncedBalance(newBalance);
    });
    
    return unsubscribe;
  }, []);

  const handleNavigation = (path: string, tab: string) => {
    setActiveTab(tab);
    navigate(path);
  };

  // Update active tab based on current location
  const currentPath = location.pathname;
  const getActiveTab = () => {
    if (currentPath === "/") return "home";
    if (currentPath === "/games") return "games";
    if (currentPath === "/lobbies") return "lobbies";
    if (currentPath === "/tournaments") return "tournaments";
    if (currentPath === "/profile") return "profile";
    return "home";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onMenuClick}
            className="md:mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <img 
            src={logo} 
            alt="PPYLSE" 
            className="h-8 w-auto cursor-pointer" 
            onClick={() => handleNavigation("/", "home")}
          />

          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant={getActiveTab() === "home" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => handleNavigation("/", "home")}
            >
              <Home className="h-4 w-4" />
              Главная
            </Button>
            <Button
              variant={getActiveTab() === "tournaments" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => handleNavigation("/tournaments", "tournaments")}
            >
              <Trophy className="h-4 w-4" />
              Соревнования
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <span className="text-sm text-muted-foreground">Баланс</span>
            <span className="font-bold flex items-center gap-1">
              {syncedBalance.toFixed(2)} <Gem className="h-4 w-4 text-primary" />
            </span>
          </div>
          <Button className="hidden md:flex bg-success hover:bg-success/90" onClick={onDepositClick}>
            Пополнить/Вывести
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex"
            onClick={() => handleNavigation("/profile", "profile")}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};