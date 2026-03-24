import { useCallback } from "react";

type HapticPattern = "detection" | "success" | "error" | "tap";

const patterns: Record<HapticPattern, number | number[]> = {
  detection: [100, 50, 100, 50, 200], // double pulse + long
  success: [50, 30, 50, 30, 50, 30, 150], // triple short + long
  error: [300], // single long
  tap: [30], // light tap
};

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern) => {
    if (!("vibrate" in navigator)) return;
    try {
      navigator.vibrate(patterns[pattern]);
    } catch {
      // Vibration API not supported or denied
    }
  }, []);

  return vibrate;
}
