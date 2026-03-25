import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  SwitchCamera,
  Volume2,
  VolumeX,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHaptic } from "@/hooks/useHaptic";
import BoundingBox from "./BoundingBox";
import TotalDisplay from "./TotalDisplay";
import logoMataHati from "@/assets/logo-mata-hati.jpeg";

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

const CameraView = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [hasDetected, setHasDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const haptic = useHaptic();

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
    // Speak guidance when camera opens
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(
        "Kamera sudah terbuka. Arahkan kamera ke uang kertas, lalu tekan tombol bulat besar di tengah bawah layar untuk mengambil foto."
      );
      utterance.lang = "id-ID";
      utterance.rate = 0.75;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang.startsWith("id"));
      if (idVoice) utterance.voice = idVoice;
      window.speechSynthesis.speak(utterance);
    }, 1000);
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled) return;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.75;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang.startsWith("id"));
      if (idVoice) utterance.voice = idVoice;
      window.speechSynthesis.speak(utterance);
    }, 100);
  }, [ttsEnabled]);

  const calculateTotal = (dets: Detection[]) =>
    dets.reduce((sum, d) => sum + (NOMINAL_MAP[d.label] || 0), 0);

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const detectWithAI = async (imageData: string) => {
    const { data, error: fnError } = await supabase.functions.invoke("detect-currency", {
      body: { image: imageData },
    });
    if (fnError) throw new Error(fnError.message || "Detection failed");
    if (data?.error) throw new Error(data.error);
    return (data?.detections || []) as Detection[];
  };

  const handleCapture = useCallback(async () => {
    if (hasDetected || isScanning) return;
    haptic("tap");
    setIsScanning(true);
    setIsDetecting(true);
    setAiError(null);

    speak("Mengambil foto dan mendeteksi uang");

    const imageData = captureFrame();
    if (!imageData) {
      setIsScanning(false);
      setIsDetecting(false);
      setAiError("Gagal mengambil gambar dari kamera");
      haptic("error");
      speak("Gagal mengambil gambar");
      return;
    }

    try {
      const results = await detectWithAI(imageData);
      setDetections(results);
      setHasDetected(true);
      if (results.length > 0) {
        haptic("detection");
        const total = results.reduce((sum, d) => sum + (NOMINAL_MAP[d.label] || 0), 0);
        const formatted = formatRupiah(total);
        speak(`Terdeteksi uang sejumlah ${formatted}`);
      } else {
        haptic("error");
        speak("Tidak ada uang yang terdeteksi");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deteksi gagal";
      setAiError(msg);
      haptic("error");
      speak(`Error: ${msg}`);
    } finally {
      setIsScanning(false);
      setIsDetecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDetected, isScanning, speak, haptic]);

  const handleReset = useCallback(() => {
    setDetections([]);
    setHasDetected(false);
    setIsDetecting(false);
    setIsScanning(false);
    setAiError(null);
    window.speechSynthesis.cancel();
    setTimeout(() => speak("Siap untuk scan ulang. Tekan tombol bulat di tengah bawah layar."), 300);
  }, [speak]);

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-camera-bg px-6 text-center">
        <Camera className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-primary-foreground text-lg font-medium mb-2">{error}</p>
        <button
          onClick={() => startCamera(facingMode)}
          className="mt-4 px-8 py-3 text-base rounded-xl bg-primary text-primary-foreground font-semibold touch-manipulation"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-camera-bg touch-manipulation">
      <canvas ref={canvasRef} className="hidden" />

      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

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

      <AnimatePresence>
        {isScanning && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-primary/90 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="text-primary-foreground text-sm font-semibold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sedang mendeteksi...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiError && (
          <motion.div
            className="absolute top-20 left-4 right-4 z-30 px-4 py-3 rounded-xl bg-destructive/90 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="text-destructive-foreground text-sm font-medium">{aiError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasDetected && detections.length === 0 && !aiError && (
          <motion.div
            className="absolute top-20 left-4 right-4 z-30 px-4 py-3 rounded-xl bg-muted/90 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="text-foreground text-sm font-medium text-center">
              Tidak ada uang Rupiah yang terdeteksi. Coba arahkan kamera ke uang kertas.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasDetected && detections.map((det, i) => <BoundingBox key={i} detection={det} isLarge={false} />)}
      </AnimatePresence>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src={logoMataHati} alt="Suara Hati" className="w-full h-full object-cover" />
          </div>
          <span className="text-primary-foreground font-display font-bold text-sm">SUARA HATI</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className="w-10 h-10 rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center touch-manipulation"
            aria-label={ttsEnabled ? "Matikan suara" : "Aktifkan suara"}
          >
            {ttsEnabled ? (
              <Volume2 className="w-5 h-5 text-primary-foreground" />
            ) : (
              <VolumeX className="w-5 h-5 text-primary-foreground/50" />
            )}
          </button>
        </div>
      </div>

      {/* Total Display */}
      <AnimatePresence>
        {hasDetected && detections.length > 0 && (
          <TotalDisplay
            total={calculateTotal(detections)}
            formatted={formatRupiah(calculateTotal(detections))}
            isLarge={false}
          />
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-6 px-6">
        <div className="flex items-center justify-around">
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform touch-manipulation"
            aria-label="Ganti kamera"
          >
            <SwitchCamera className="w-5 h-5 text-primary-foreground" />
          </button>

          {!hasDetected ? (
            <button
              onClick={handleCapture}
              disabled={isScanning}
              className="relative flex flex-col items-center touch-manipulation"
              aria-label="Ambil foto untuk deteksi uang"
            >
              <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center bg-primary/20 backdrop-blur-sm active:scale-90 transition-transform">
                {isScanning ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-primary-foreground font-semibold text-xs mt-2 tracking-wide">
                {isScanning ? "MENDETEKSI..." : "KETUK UNTUK FOTO"}
              </span>
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="relative flex flex-col items-center touch-manipulation"
              aria-label="Ulangi foto"
            >
              <div className="w-20 h-20 rounded-full border-4 border-destructive flex items-center justify-center bg-destructive/20 backdrop-blur-sm active:scale-90 transition-transform">
                <RotateCcw className="w-8 h-8 text-destructive" />
              </div>
              <span className="text-primary-foreground font-semibold text-xs mt-2 tracking-wide">
                ULANGI FOTO
              </span>
            </button>
          )}

          <div className="w-12 h-12 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default CameraView;
