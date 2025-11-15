import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Games from "./pages/Games";
import Lobbies from "./pages/Lobbies";
import Tournaments from "./pages/Tournaments";
import Profile from "./pages/Profile";
import Game from "./pages/Game";
import DurakGame from "./pages/DurakGame";
import UnoGame from "./pages/UnoGame";
import CrashGame from "./pages/CrashGame";
import CoinflipGame from "./pages/CoinflipGame";
import RollsGame from "./pages/RollsGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/games" element={<Games />} />
          <Route path="/lobbies" element={<Lobbies />} />
          <Route path="/game/:lobbyId" element={<Game />} />
          <Route path="/durak-game" element={<DurakGame />} />
          <Route path="/uno-game" element={<UnoGame />} />
          <Route path="/crash-game" element={<CrashGame />} />
          <Route path="/coinflip-game" element={<CoinflipGame />} />
          <Route path="/rolls-game" element={<RollsGame />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
