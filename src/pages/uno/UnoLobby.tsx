import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Users, Plus } from "lucide-react";

interface LobbyProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
}

export default function UnoLobby({ onCreateRoom, onJoinRoom }: LobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      onCreateRoom(playerName.trim());
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-6xl md:text-8xl font-black mb-4 bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 to-blue-500 bg-clip-text text-transparent uppercase tracking-wider">
            UNO
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Играйте онлайн с друзьями
          </p>
        </motion.div>

        {mode === 'menu' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            <Button
              onClick={() => setMode('create')}
              size="lg"
              className="w-full h-20 text-xl font-bold uppercase tracking-wide"
            >
              <Plus className="w-8 h-8 mr-3" />
              Создать комнату
            </Button>
            <Button
              onClick={() => setMode('join')}
              variant="outline"
              size="lg"
              className="w-full h-20 text-xl font-bold uppercase tracking-wide"
            >
              <Users className="w-8 h-8 mr-3" />
              Присоединиться
            </Button>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-3xl font-black">Создать комнату</CardTitle>
                <CardDescription className="text-base">
                  Введите ваше имя и создайте новую игровую комнату
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="create-name" className="text-base font-semibold">
                    Ваше имя
                  </Label>
                  <Input
                    id="create-name"
                    placeholder="Введите имя"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                    className="h-12 text-lg"
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCreateRoom}
                    disabled={!playerName.trim()}
                    size="lg"
                    className="flex-1 text-lg font-bold uppercase"
                  >
                    Создать
                  </Button>
                  <Button
                    onClick={() => setMode('menu')}
                    variant="outline"
                    size="lg"
                    className="text-lg font-semibold"
                  >
                    Назад
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-3xl font-black">Присоединиться</CardTitle>
                <CardDescription className="text-base">
                  Введите код комнаты и ваше имя
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="join-code" className="text-base font-semibold">
                    Код комнаты
                  </Label>
                  <Input
                    id="join-code"
                    placeholder="XXXXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="h-12 text-2xl font-mono text-center tracking-widest uppercase"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join-name" className="text-base font-semibold">
                    Ваше имя
                  </Label>
                  <Input
                    id="join-name"
                    placeholder="Введите имя"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    className="h-12 text-lg"
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleJoinRoom}
                    disabled={!playerName.trim() || !roomCode.trim() || roomCode.length !== 6}
                    size="lg"
                    className="flex-1 text-lg font-bold uppercase"
                  >
                    Присоединиться
                  </Button>
                  <Button
                    onClick={() => setMode('menu')}
                    variant="outline"
                    size="lg"
                    className="text-lg font-semibold"
                  >
                    Назад
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

