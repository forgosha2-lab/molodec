import { GameRoom } from "@/shared/uno-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WaitingRoomProps {
  room: GameRoom;
  currentPlayerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export default function UnoWaitingRoom({ room, currentPlayerId, onStartGame, onLeaveRoom }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const isHost = room.players[0]?.id === currentPlayerId;
  const canStart = room.players.length >= 2 && room.players.length <= 4;

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast({
        title: "Скопировано!",
        description: "Код комнаты скопирован в буфер обмена",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-black mb-4">Ожидание игроков</CardTitle>
            
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-muted rounded-lg px-6 py-3 border-2 border-border">
                <p className="text-sm text-muted-foreground mb-1">Код комнаты</p>
                <p className="text-4xl font-mono font-black tracking-widest">
                  {room.code}
                </p>
              </div>
              <Button
                onClick={copyRoomCode}
                variant="outline"
                size="icon"
                className="h-12 w-12"
              >
                {copied ? (
                  <Check className="w-6 h-6 text-green-600" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </Button>
            </div>

            <p className="text-muted-foreground">
              {room.players.length}/4 игроков
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {room.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-muted rounded-lg border-2 border-border"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                      {getInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      {player.name}
                    </p>
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs">Хост</Badge>
                    )}
                    {player.id === currentPlayerId && (
                      <Badge variant="default" className="text-xs ml-1">Вы</Badge>
                    )}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                </motion.div>
              ))}

              {[...Array(4 - room.players.length)].map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border-2 border-dashed border-border"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-muted text-muted-foreground">?</AvatarFallback>
                  </Avatar>
                  <p className="text-muted-foreground font-medium">Ожидание игрока...</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {isHost ? (
                <Button
                  onClick={onStartGame}
                  disabled={!canStart}
                  size="lg"
                  className="w-full text-lg font-bold uppercase tracking-wide"
                >
                  {canStart ? 'Начать игру' : 'Нужно 2-4 игрока'}
                </Button>
              ) : (
                <div className="text-center py-4">
                  <p className="text-lg text-muted-foreground">
                    Ожидание хоста...
                  </p>
                </div>
              )}
              
              <Button
                onClick={onLeaveRoom}
                variant="outline"
                size="lg"
                className="w-full text-lg font-semibold"
              >
                Покинуть комнату
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

