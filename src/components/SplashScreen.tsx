import { forwardRef } from "react";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = forwardRef<HTMLDivElement, SplashScreenProps>(({ onComplete }, ref) => {
  return (
    <motion.div
      ref={ref}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 2500);
      }}
    >
      {/* Pulse rings */}
      <div className="absolute">
        <motion.div
          className="w-40 h-40 rounded-full border-2 border-primary-foreground/20"
          animate={{ scale: [0.8, 2.5], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      </div>
      <div className="absolute">
        <motion.div
          className="w-40 h-40 rounded-full border-2 border-primary-foreground/20"
          animate={{ scale: [0.8, 2.5], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
        />
      </div>

      {/* Diamond Logo */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      >
        <div className="diamond-shape w-28 h-28 bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
          <div className="diamond-shape w-24 h-24 bg-primary-foreground flex items-center justify-center">
            <span className="font-display font-black text-2xl text-primary" style={{ transform: "rotate(0deg)" }}>
              Rp
            </span>
          </div>
        </div>
      </motion.div>

      {/* App Name */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <h1 className="font-display font-black text-3xl tracking-wider text-primary-foreground text-shadow-glow">
          NETRA RUPIAH
        </h1>
        <motion.p
          className="text-primary-foreground/70 text-sm mt-2 font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Cash Reader AI
        </motion.p>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        className="absolute bottom-20 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-primary-foreground/60"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
});

SplashScreen.displayName = "SplashScreen";

export default SplashScreen;
