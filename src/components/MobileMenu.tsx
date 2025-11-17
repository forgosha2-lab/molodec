import { Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

interface MobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAuthenticated?: boolean;
}

export const MobileMenu = ({ activeTab, onTabChange, isAuthenticated }: MobileMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string, tab: string) => {
    onTabChange(tab);
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-center justify-around p-2">
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            isActive("/") ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => handleNavigation("/", "home")}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Главная</span>
        </Button>

        {isAuthenticated && (
          <Button
            variant="ghost"
            size="icon"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${
              isActive("/profile") ? "text-primary bg-primary/10" : "text-muted-foreground"
            }`}
            onClick={() => handleNavigation("/profile", "profile")}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Профиль</span>
          </Button>
        )}
      </div>
    </div>
  );
};
