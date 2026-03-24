import { motion } from "framer-motion";
import { ScanLine, Volume2, Camera, Accessibility, Mic } from "lucide-react";
import { useAccessibility } from "./AccessibilityContext";
import logoMataHati from "@/assets/logo-mata-hati.jpeg";

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  const { isBlindMode, toggleBlindMode } = useAccessibility();

  const features = [
    { icon: Camera, text: "Deteksi uang kertas Rupiah secara real-time" },
    { icon: ScanLine, text: "Hitung total nominal secara otomatis" },
    { icon: Volume2, text: "Suara audio untuk aksesibilitas" },
    { icon: Mic, text: "Perintah suara: foto, ulangi, bantuan" },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-between bg-background px-6 py-12 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mb-8"
        >
          <div className={`${isBlindMode ? "w-28 h-28" : "w-20 h-20"} rounded-2xl overflow-hidden shadow-lg`}>
            <img src={logoMataHati} alt="Mata Hati Logo" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        <motion.h1
          className={`font-display font-bold ${isBlindMode ? "text-4xl" : "text-2xl"} text-foreground text-center mb-3`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Selamat Datang di <span className="text-primary">Mata Hati</span>
        </motion.h1>

        <motion.p
          className={`text-muted-foreground text-center ${isBlindMode ? "text-xl" : "text-base"} leading-relaxed mb-10`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Siap membantu Anda mengenali nominal Rupiah kapan saja dan di mana saja
        </motion.p>

        <div className="w-full space-y-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              className={`flex items-center gap-4 ${isBlindMode ? "p-5" : "p-4"} rounded-xl bg-secondary/50 border border-border`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
            >
              <div className={`${isBlindMode ? "w-14 h-14" : "w-10 h-10"} rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0`}>
                <feature.icon className={`${isBlindMode ? "w-7 h-7" : "w-5 h-5"} text-primary`} />
              </div>
              <p className={`${isBlindMode ? "text-lg" : "text-sm"} text-foreground font-medium`}>{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        className="w-full max-w-sm space-y-3 mt-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        <button
          onClick={toggleBlindMode}
          className={`w-full ${isBlindMode ? "py-5 text-xl" : "py-3 text-base"} rounded-2xl ${
            isBlindMode
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground border border-border"
          } font-display font-bold tracking-wide flex items-center justify-center gap-3 active:scale-95 transition-transform touch-manipulation`}
        >
          <Accessibility className={isBlindMode ? "w-7 h-7" : "w-5 h-5"} />
          {isBlindMode ? "MODE AKSESIBILITAS AKTIF ✓" : "AKTIFKAN MODE AKSESIBILITAS"}
        </button>

        <button
          onClick={onStart}
          className={`w-full ${isBlindMode ? "py-6 text-2xl" : "py-4 text-lg"} rounded-2xl bg-primary text-primary-foreground font-display font-bold tracking-wide shadow-lg shadow-primary/30 active:scale-95 transition-transform touch-manipulation`}
        >
          MULAI SEKARANG
        </button>
        <p className={`text-center ${isBlindMode ? "text-base" : "text-xs"} text-muted-foreground mt-3`}>
          Aplikasi memerlukan akses kamera{isBlindMode ? " dan mikrofon" : ""}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;
