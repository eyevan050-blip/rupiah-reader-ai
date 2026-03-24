import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  SwitchCamera,
  Flashlight,
  Volume2,
  VolumeX,
  RotateCcw,
  Upload,
} from "lucide-react";
import BoundingBox from "./BoundingBox";
import TotalDisplay from "./TotalDisplay";

interface Detection {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const NOMINAL_MAP: Record<string, number> = {
  "1k": 1000,
  "2k": 2000,
  "5k": 5000,
  "10k": 10000,
  "20k": 20000,
  "50k": 50000,
  "100k": 100000,
};

const DEMO_SCENARIOS: Detection[][] = [
  [
    { label: "10k", confidence: 93, x: 15, y: 20, width: 35, height: 25 },
    { label: "5k", confidence: 88, x: 55, y: 45, width: 30, height: 22 },
  ],
  [
    { label: "50k", confidence: 96, x: 20, y: 30, width: 40, height: 28 },
  ],
  [
    { label: "100k", confidence: 91, x: 10, y: 15, width: 38, height: 26 },
    { label: "20k", confidence: 89, x: 52, y: 50, width: 32, height: 24 },
    { label: "2k", confidence: 86, x: 30, y: 70, width: 25, height: 18 },
  ],
  [
    { label: "1k", confidence: 92, x: 25, y: 35, width: 30, height: 22 },
    { label: "100k", confidence: 95, x: 58, y: 25, width: 35, height: 26 },
  ],
];

const CameraView = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [hasDetected, setHasDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scenarioRef = useRef(0);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch {
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const speak = (text: string) => {
    if (!ttsEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const calculateTotal = (dets: Detection[]) => {
    return dets.reduce((sum, d) => sum + (NOMINAL_MAP[d.label] || 0), 0);
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  };

  const handleCapture = () => {
    if (hasDetected) return;
    setIsScanning(true);
    setIsDetecting(true);

    // Simulate detection after a short delay
    setTimeout(() => {
      const scenario = DEMO_SCENARIOS[scenarioRef.current % DEMO_SCENARIOS.length];
      scenarioRef.current++;
      setDetections(scenario);
      setHasDetected(true);
      setIsScanning(false);
      setIsDetecting(false);

      const total = scenario.reduce((sum, d) => sum + (NOMINAL_MAP[d.label] || 0), 0);
      const formatted = formatRupiah(total);
      speak(`Terdeteksi uang sejumlah ${formatted}`);
    }, 2000);
  };

  const handleReset = () => {
    setDetections([]);
    setHasDetected(false);
    setIsDetecting(false);
    setIsScanning(false);
    window.speechSynthesis.cancel();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Simulate detection on uploaded image
    handleCapture();
  };

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-camera-bg px-6 text-center">
        <Camera className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-primary-foreground text-lg font-medium mb-2">{error}</p>
        <button
          onClick={() => startCamera(facingMode)}
          className="mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          Coba Lagi
        </button>
        <label className="mt-3 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold cursor-pointer flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Gambar
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-camera-bg">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay when detecting */}
      <AnimatePresence>
        {(isScanning || hasDetected) && (
          <motion.div
            className="absolute inset-0 bg-camera-overlay/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Scanning line animation */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-primary shadow-lg shadow-primary/50 z-20"
            initial={{ top: "0%" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Status indicator */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-primary/90 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="text-primary-foreground text-sm font-semibold flex items-center gap-2">
              <motion.span
                className="w-2 h-2 rounded-full bg-primary-foreground"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              Sedang mendeteksi...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bounding Boxes */}
      <AnimatePresence>
        {hasDetected &&
          detections.map((det, i) => (
            <BoundingBox key={i} detection={det} />
          ))}
      </AnimatePresence>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <div className="diamond-shape w-8 h-8 bg-primary flex items-center justify-center">
            <span className="font-display font-bold text-[10px] text-primary-foreground">Rp</span>
          </div>
          <span className="text-primary-foreground font-display font-bold text-sm">NETRA RUPIAH</span>
        </div>
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className="w-10 h-10 rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center"
        >
          {ttsEnabled ? (
            <Volume2 className="w-5 h-5 text-primary-foreground" />
          ) : (
            <VolumeX className="w-5 h-5 text-primary-foreground/50" />
          )}
        </button>
      </div>

      {/* Total Display */}
      <AnimatePresence>
        {hasDetected && detections.length > 0 && (
          <TotalDisplay total={calculateTotal(detections)} formatted={formatRupiah(calculateTotal(detections))} />
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-6 px-6">
        <div className="flex items-center justify-around">
          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          >
            <SwitchCamera className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* Main Capture / Reset */}
          {!hasDetected ? (
            <button
              onClick={handleCapture}
              disabled={isScanning}
              className="relative flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center bg-primary/20 backdrop-blur-sm active:scale-90 transition-transform">
                <div className="w-14 h-14 rounded-full bg-primary" />
              </div>
              <span className="text-primary-foreground text-xs font-semibold mt-2 tracking-wide">
                {isScanning ? "MENDETEKSI..." : "KETUK UNTUK FOTO"}
              </span>
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="relative flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full border-4 border-destructive flex items-center justify-center bg-destructive/20 backdrop-blur-sm active:scale-90 transition-transform">
                <RotateCcw className="w-8 h-8 text-destructive" />
              </div>
              <span className="text-primary-foreground text-xs font-semibold mt-2 tracking-wide">
                ULANGI FOTO
              </span>
            </button>
          )}

          {/* Upload fallback */}
          <label className="w-12 h-12 rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center cursor-pointer active:scale-90 transition-transform">
            <Upload className="w-5 h-5 text-primary-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
