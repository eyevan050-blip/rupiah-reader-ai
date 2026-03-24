import { useRef, useState, useEffect, useCallback, useMemo, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  SwitchCamera,
  Volume2,
  VolumeX,
  RotateCcw,
  Upload,
  Loader2,
  Mic,
  MicOff,
  Accessibility,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccessibility } from "./AccessibilityContext";
import { useHaptic } from "@/hooks/useHaptic";
import useVoiceCommands from "@/hooks/useVoiceCommands";
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

const CameraView = forwardRef<HTMLDivElement>((_, ref) => {
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
  const [voiceActive, setVoiceActive] = useState(false);

  const { isBlindMode, toggleBlindMode, speak: accessibilitySpeak } = useAccessibility();
  const haptic = useHaptic();

  // Size classes based on blind mode
  const sz = isBlindMode
    ? {
        captureBtn: "w-28 h-28",
        captureBtnInner: "w-20 h-20",
        sideBtn: "w-16 h-16",
        sideBtnIcon: "w-7 h-7",
        topBtn: "w-14 h-14",
        topBtnIcon: "w-7 h-7",
        labelText: "text-lg",
        statusText: "text-lg",
        errorText: "text-xl",
        captureLabel: "text-base mt-3",
        logoSize: "w-10 h-10",
        logoText: "text-xs",
        brandText: "text-lg",
      }
    : {
        captureBtn: "w-20 h-20",
        captureBtnInner: "w-14 h-14",
        sideBtn: "w-12 h-12",
        sideBtnIcon: "w-5 h-5",
        topBtn: "w-10 h-10",
        topBtnIcon: "w-5 h-5",
        labelText: "text-sm",
        statusText: "text-sm",
        errorText: "text-lg",
        captureLabel: "text-xs mt-2",
        logoSize: "w-8 h-8",
        logoText: "text-[10px]",
        brandText: "text-sm",
      };

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

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
    if (isBlindMode) accessibilitySpeak("Kamera diganti");
  }, [facingMode, startCamera, isBlindMode, accessibilitySpeak]);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = isBlindMode ? 0.8 : 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, isBlindMode]);

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

    if (isBlindMode) speak("Mengambil foto dan mendeteksi uang");

    const imageData = captureFrame();
    if (!imageData) {
      setIsScanning(false);
      setIsDetecting(false);
      setAiError("Gagal mengambil gambar dari kamera");
      haptic("error");
      if (isBlindMode) speak("Gagal mengambil gambar");
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
        if (isBlindMode) {
          setTimeout(() => {
            haptic("success");
            const detail = results.map((d) => `${d.label.replace("k", " ribu")} rupiah`).join(", ");
            speak(`Rincian: ${detail}`);
          }, 3000);
        }
      } else {
        haptic("error");
        speak("Tidak ada uang yang terdeteksi");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deteksi gagal";
      setAiError(msg);
      haptic("error");
      if (isBlindMode) speak(`Error: ${msg}`);
    } finally {
      setIsScanning(false);
      setIsDetecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDetected, isScanning, isBlindMode, speak, haptic]);

  const handleReset = useCallback(() => {
    setDetections([]);
    setHasDetected(false);
    setIsDetecting(false);
    setIsScanning(false);
    setAiError(null);
    window.speechSynthesis.cancel();
    if (isBlindMode) {
      setTimeout(() => accessibilitySpeak("Siap untuk scan ulang. Katakan foto untuk mengambil gambar."), 300);
    }
  }, [isBlindMode, accessibilitySpeak]);

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
          speak(`Terdeteksi uang sejumlah ${formatRupiah(total)}`);
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

  // Voice commands
  const voiceCommands = useMemo(
    () => [
      { keywords: ["foto", "ambil", "capture", "scan", "pindai"], action: () => handleCapture() },
      { keywords: ["ulangi", "ulang", "reset", "baru"], action: () => handleReset() },
      { keywords: ["ganti kamera", "balik kamera", "switch"], action: () => switchCamera() },
      {
        keywords: ["suara", "mute", "diam"],
        action: () => {
          setTtsEnabled((prev) => !prev);
          accessibilitySpeak("Suara " + (ttsEnabled ? "dimatikan" : "dinyalakan"));
        },
      },
      {
        keywords: ["bantuan", "help", "tolong"],
        action: () => {
          accessibilitySpeak(
            "Perintah tersedia: foto untuk mengambil gambar, ulangi untuk scan ulang, ganti kamera untuk beralih kamera, suara untuk toggle audio"
          );
        },
      },
    ],
    [handleCapture, handleReset, switchCamera, ttsEnabled, accessibilitySpeak]
  );

  useVoiceCommands({
    enabled: isBlindMode && voiceActive,
    commands: voiceCommands,
    onUnrecognized: (t) => {
      if (isBlindMode) accessibilitySpeak(`Perintah tidak dikenali: ${t}. Katakan bantuan untuk daftar perintah.`);
    },
  });

  // Auto-announce on blind mode activation
  useEffect(() => {
    if (isBlindMode) {
      setVoiceActive(true);
    }
  }, [isBlindMode]);

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-camera-bg px-6 text-center">
        <Camera className={`${isBlindMode ? "w-24 h-24" : "w-16 h-16"} text-muted-foreground mb-4`} />
        <p className={`text-primary-foreground ${sz.errorText} font-medium mb-2`}>{error}</p>
        <button
          onClick={() => startCamera(facingMode)}
          className={`mt-4 px-8 ${isBlindMode ? "py-5 text-xl" : "py-3 text-base"} rounded-xl bg-primary text-primary-foreground font-semibold`}
        >
          Coba Lagi
        </button>
        <label
          className={`mt-3 px-8 ${isBlindMode ? "py-5 text-xl" : "py-3 text-base"} rounded-xl bg-secondary text-secondary-foreground font-semibold cursor-pointer flex items-center gap-2`}
        >
          <Upload className="w-5 h-5" />
          Upload Gambar
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  return (
    <div ref={ref} className="fixed inset-0 bg-camera-bg touch-manipulation">
      <canvas ref={canvasRef} className="hidden" />

      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

      {/* High contrast border for blind mode */}
      {isBlindMode && (
        <div className="absolute inset-0 z-10 pointer-events-none border-4 border-primary rounded-lg" />
      )}

      {/* Dark overlay */}
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

      {/* Scanning line */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            className={`absolute left-0 right-0 ${isBlindMode ? "h-1" : "h-0.5"} bg-primary shadow-lg shadow-primary/50 z-20`}
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
            className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 ${isBlindMode ? "px-6 py-4" : "px-4 py-2"} rounded-full bg-primary/90 backdrop-blur-sm`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className={`text-primary-foreground ${sz.statusText} font-semibold flex items-center gap-2`}>
              <Loader2 className={`${isBlindMode ? "w-6 h-6" : "w-4 h-4"} animate-spin`} />
              Sedang mendeteksi...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Error */}
      <AnimatePresence>
        {aiError && (
          <motion.div
            className={`absolute top-20 left-4 right-4 z-30 ${isBlindMode ? "px-6 py-5" : "px-4 py-3"} rounded-xl bg-destructive/90 backdrop-blur-sm`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className={`text-destructive-foreground ${sz.statusText} font-medium`}>{aiError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No detection */}
      <AnimatePresence>
        {hasDetected && detections.length === 0 && !aiError && (
          <motion.div
            className={`absolute top-20 left-4 right-4 z-30 ${isBlindMode ? "px-6 py-5" : "px-4 py-3"} rounded-xl bg-muted/90 backdrop-blur-sm`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className={`text-foreground ${sz.statusText} font-medium text-center`}>
              Tidak ada uang Rupiah yang terdeteksi. Coba arahkan kamera ke uang kertas.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bounding Boxes */}
      <AnimatePresence>
        {hasDetected && detections.map((det, i) => <BoundingBox key={i} detection={det} isLarge={isBlindMode} />)}
      </AnimatePresence>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <div className={`diamond-shape ${sz.logoSize} bg-primary flex items-center justify-center`}>
            <span className={`font-display font-bold ${sz.logoText} text-primary-foreground`}>Rp</span>
          </div>
          <span className={`text-primary-foreground font-display font-bold ${sz.brandText}`}>NETRA RUPIAH</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice command toggle (blind mode) */}
          {isBlindMode && (
            <button
              onClick={() => {
                setVoiceActive((prev) => !prev);
                accessibilitySpeak(voiceActive ? "Perintah suara dimatikan" : "Perintah suara diaktifkan");
              }}
              className={`${sz.topBtn} rounded-full ${voiceActive ? "bg-accent/80" : "bg-camera-overlay/60"} backdrop-blur-sm flex items-center justify-center`}
              aria-label={voiceActive ? "Matikan perintah suara" : "Aktifkan perintah suara"}
            >
              {voiceActive ? (
                <Mic className={`${sz.topBtnIcon} text-accent-foreground`} />
              ) : (
                <MicOff className={`${sz.topBtnIcon} text-primary-foreground/50`} />
              )}
            </button>
          )}

          {/* Accessibility toggle */}
          <button
            onClick={toggleBlindMode}
            className={`${sz.topBtn} rounded-full ${isBlindMode ? "bg-accent/80" : "bg-camera-overlay/60"} backdrop-blur-sm flex items-center justify-center`}
            aria-label={isBlindMode ? "Nonaktifkan mode aksesibilitas" : "Aktifkan mode aksesibilitas"}
          >
            <Accessibility className={`${sz.topBtnIcon} ${isBlindMode ? "text-accent-foreground" : "text-primary-foreground"}`} />
          </button>

          {/* TTS toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`${sz.topBtn} rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center`}
            aria-label={ttsEnabled ? "Matikan suara" : "Aktifkan suara"}
          >
            {ttsEnabled ? (
              <Volume2 className={`${sz.topBtnIcon} text-primary-foreground`} />
            ) : (
              <VolumeX className={`${sz.topBtnIcon} text-primary-foreground/50`} />
            )}
          </button>
        </div>
      </div>

      {/* Voice command hint (blind mode) */}
      <AnimatePresence>
        {isBlindMode && voiceActive && !isScanning && !hasDetected && (
          <motion.div
            className="absolute top-28 left-4 right-4 z-30 px-5 py-3 rounded-xl bg-accent/20 backdrop-blur-sm border border-accent/40"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-primary-foreground text-center font-semibold text-base">
              🎤 Perintah suara aktif — Katakan "foto", "ulangi", atau "bantuan"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Total Display */}
      <AnimatePresence>
        {hasDetected && detections.length > 0 && (
          <TotalDisplay
            total={calculateTotal(detections)}
            formatted={formatRupiah(calculateTotal(detections))}
            isLarge={isBlindMode}
          />
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-6 px-6">
        <div className="flex items-center justify-around">
          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            className={`${sz.sideBtn} rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform`}
            aria-label="Ganti kamera"
          >
            <SwitchCamera className={`${sz.sideBtnIcon} text-primary-foreground`} />
          </button>

          {/* Main Capture / Reset */}
          {!hasDetected ? (
            <button
              onClick={handleCapture}
              disabled={isScanning}
              className="relative flex flex-col items-center"
              aria-label="Ambil foto untuk deteksi uang"
            >
              <div
                className={`${sz.captureBtn} rounded-full border-4 border-primary flex items-center justify-center bg-primary/20 backdrop-blur-sm active:scale-90 transition-transform`}
              >
                {isScanning ? (
                  <Loader2 className={`${isBlindMode ? "w-12 h-12" : "w-8 h-8"} text-primary animate-spin`} />
                ) : (
                  <div className={`${sz.captureBtnInner} rounded-full bg-primary`} />
                )}
              </div>
              <span className={`text-primary-foreground font-semibold ${sz.captureLabel} tracking-wide`}>
                {isScanning ? "MENDETEKSI..." : "KETUK UNTUK FOTO"}
              </span>
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="relative flex flex-col items-center"
              aria-label="Ulangi foto"
            >
              <div
                className={`${sz.captureBtn} rounded-full border-4 border-destructive flex items-center justify-center bg-destructive/20 backdrop-blur-sm active:scale-90 transition-transform`}
              >
                <RotateCcw className={`${isBlindMode ? "w-12 h-12" : "w-8 h-8"} text-destructive`} />
              </div>
              <span className={`text-primary-foreground font-semibold ${sz.captureLabel} tracking-wide`}>
                ULANGI FOTO
              </span>
            </button>
          )}

          {/* Upload fallback */}
          <label
            className={`${sz.sideBtn} rounded-full bg-camera-overlay/60 backdrop-blur-sm flex items-center justify-center cursor-pointer active:scale-90 transition-transform`}
            aria-label="Upload gambar"
          >
            <Upload className={`${sz.sideBtnIcon} text-primary-foreground`} />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    </div>
  );
});

CameraView.displayName = "CameraView";

export default CameraView;
