import { motion } from "framer-motion";

interface Detection {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoundingBoxProps {
  detection: Detection;
}

const BoundingBox = ({ detection }: BoundingBoxProps) => {
  return (
    <motion.div
      className="absolute z-20 border-2 border-accent rounded-md"
      style={{
        left: `${detection.x}%`,
        top: `${detection.y}%`,
        width: `${detection.width}%`,
        height: `${detection.height}%`,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Corner accents */}
      <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-accent rounded-tl" />
      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-accent rounded-tr" />
      <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-accent rounded-bl" />
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-accent rounded-br" />

      {/* Label */}
      <motion.div
        className="absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-bold whitespace-nowrap"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span>{detection.label}</span>
        <span className="opacity-80">{detection.confidence}%</span>
      </motion.div>

      {/* Inner glow */}
      <div className="absolute inset-0 bg-accent/5 rounded" />
    </motion.div>
  );
};

export default BoundingBox;
