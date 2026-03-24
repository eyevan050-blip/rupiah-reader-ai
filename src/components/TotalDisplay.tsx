import { motion } from "framer-motion";
import { Banknote } from "lucide-react";

interface TotalDisplayProps {
  total: number;
  formatted: string;
}

const TotalDisplay = ({ formatted }: TotalDisplayProps) => {
  return (
    <motion.div
      className="absolute bottom-36 left-4 right-4 z-30"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <div className="bg-total-card/90 backdrop-blur-xl rounded-2xl px-6 py-5 border border-accent/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-primary-foreground/60 text-xs font-medium uppercase tracking-wider">Total Terdeteksi</p>
            <p className="text-primary-foreground font-display font-bold text-2xl">{formatted}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TotalDisplay;
