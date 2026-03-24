import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AccessibilityContextType {
  isBlindMode: boolean;
  toggleBlindMode: () => void;
  speak: (text: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  isBlindMode: false,
  toggleBlindMode: () => {},
  speak: () => {},
});

export const useAccessibility = () => useContext(AccessibilityContext);

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [isBlindMode, setIsBlindMode] = useState(false);

  const toggleBlindMode = useCallback(() => {
    setIsBlindMode((prev) => {
      const next = !prev;
      const utterance = new SpeechSynthesisUtterance(
        next
          ? "Mode aksesibilitas diaktifkan. Gunakan perintah suara: foto, ulangi, ganti kamera."
          : "Mode aksesibilitas dinonaktifkan."
      );
      utterance.lang = "id-ID";
      utterance.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return next;
    });
  }, []);

  const speak = useCallback((text: string) => {
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
  }, []);

  return (
    <AccessibilityContext.Provider value={{ isBlindMode, toggleBlindMode, speak }}>
      {children}
    </AccessibilityContext.Provider>
  );
};
