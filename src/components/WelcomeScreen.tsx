import { motion } from "framer-motion";
import { ScanLine, Volume2, Camera } from "lucide-react";

interface WelcomeScreenProps {
  onStart: () => void;
}

const features = [
  { icon: Camera, text: "Deteksi uang kertas Rupiah secara real-time" },
  { icon: ScanLine, text: "Hitung total nominal secara otomatis" },
  { icon: Volume2, text: "Suara audio untuk aksesibilitas" },
];

const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-between bg-background px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
        {/* Logo small */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mb-8"
        >
          <div className="diamond-shape w-20 h-20 bg-primary flex items-center justify-center">
            <span className="font-display font-black text-xl text-primary-foreground">Rp</span>
          </div>
        </motion.div>

        <motion.h1
          className="font-display font-bold text-2xl text-foreground text-center mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Selamat Datang di{" "}
          <span className="text-primary">Netra Rupiah</span>
        </motion.h1>

        <motion.p
          className="text-muted-foreground text-center text-base leading-relaxed mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Siap membantu Anda mengenali nominal Rupiah kapan saja dan di mana saja
        </motion.p>

        {/* Feature list */}
        <div className="w-full space-y-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg tracking-wide shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          MULAI SEKARANG
        </button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Aplikasi memerlukan akses kamera
        </p>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;
