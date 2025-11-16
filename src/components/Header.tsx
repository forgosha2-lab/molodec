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
      <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-3 md:gap-6">
          <img 
            src={logo} 
            alt="PPYLSE" 
            className="h-7 md:h-8 w-auto cursor-pointer" 
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
          <div className="flex items-center gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-card border border-border">
            <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">Баланс</span>
            <span className="font-bold flex items-center gap-1 text-sm md:text-base">
              {syncedBalance.toFixed(2)} <Gem className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </span>
          </div>
          <Button 
            className="bg-success hover:bg-success/90 text-xs md:text-sm px-2 md:px-4 h-8 md:h-10" 
            onClick={onDepositClick}
          >
            <span className="hidden sm:inline">Пополнить/Вывести</span>
            <span className="sm:hidden">+/-</span>
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