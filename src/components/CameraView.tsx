import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  SwitchCamera,
  Volume2,
  VolumeX,
  RotateCcw,
  Upload,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

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
    try {
      const { data, error: fnError } = await supabase.functions.invoke("detect-currency", {
        body: { image: imageData },
      });

      if (fnError) {
        throw new Error(fnError.message || "Detection failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return (data?.detections || []) as Detection[];
    } catch (err) {
      console.error("AI detection error:", err);
      throw err;
    }
  };

  const handleCapture = async () => {
    if (hasDetected || isScanning) return;
    setIsScanning(true);
    setIsDetecting(true);
    setAiError(null);

    const imageData = captureFrame();
    if (!imageData) {
      setIsScanning(false);
      setIsDetecting(false);
      setAiError("Gagal mengambil gambar dari kamera");
      return;
    }

    try {
      const results = await detectWithAI(imageData);
      setDetections(results);
      setHasDetected(true);

      if (results.length > 0) {
        const total = results.reduce((sum, d) => sum + (NOMINAL_MAP[d.label] || 0), 0);
        const formatted = formatRupiah(total);
        speak(`Terdeteksi uang sejumlah ${formatted}`);
      } else {
        speak("Tidak ada uang yang terdeteksi");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Deteksi gagal");
    } finally {
      setIsScanning(false);
      setIsDetecting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setIsDetecting(true);
    setAiError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      try {
        const results = await detectWithAI(imageData);
        setDetections(results);
        setHasDetected(true);

        if (results.length > 0) {
          const total = results.reduce((sum, d) => sum + (NOMINAL_MAP[d.label] || 0), 0);
          const formatted = formatRupiah(total);
          speak(`Terdeteksi uang sejumlah ${formatted}`);
        } else {
          speak("Tidak ada uang yang terdeteksi");
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "Deteksi gagal");
      } finally {
        setIsScanning(false);
        setIsDetecting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setDetections([]);
    setHasDetected(false);
    setIsDetecting(false);
    setIsScanning(false);
    setAiError(null);
    window.speechSynthesis.cancel();
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
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

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
              <Loader2 className="w-4 h-4 animate-spin" />
              Sedang mendeteksi...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Error */}
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

      {/* No detection result */}
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
                {isScanning ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary" />
                )}
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
