import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ColorPickerProps {
  isOpen: boolean;
  onColorSelect: (color: 'red' | 'yellow' | 'green' | 'blue') => void;
}

const colors = [
  { name: 'red', label: 'Красный', bg: 'bg-red-500', border: 'border-red-700' },
  { name: 'yellow', label: 'Желтый', bg: 'bg-yellow-400', border: 'border-yellow-600' },
  { name: 'green', label: 'Зеленый', bg: 'bg-green-500', border: 'border-green-700' },
  { name: 'blue', label: 'Синий', bg: 'bg-blue-500', border: 'border-blue-700' },
] as const;

export function ColorPicker({ isOpen, onColorSelect }: ColorPickerProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-foreground">
            Выберите цвет
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {colors.map((color) => (
              <motion.button
                key={color.name}
                onClick={() => onColorSelect(color.name)}
                className={`
                  ${color.bg} ${color.border}
                  border-4 rounded-2xl h-24 
                  flex items-center justify-center
                  text-white font-bold text-xl
                  transition-all
                  hover:scale-105 active:scale-95
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {color.label}
              </motion.button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

