import { useEffect, useRef, useCallback } from "react";

interface VoiceCommand {
  keywords: string[];
  action: () => void;
}

interface UseVoiceCommandsOptions {
  enabled: boolean;
  commands: VoiceCommand[];
  onUnrecognized?: (transcript: string) => void;
}

const useVoiceCommands = ({ enabled, commands, onUnrecognized }: UseVoiceCommandsOptions) => {
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const startListening = useCallback(() => {
    if (!enabled || isListeningRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;

        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        console.log("[VoiceCommand] heard:", transcript);

        let matched = false;
        for (const cmd of commands) {
          if (cmd.keywords.some((kw) => transcript.includes(kw))) {
            cmd.action();
            matched = true;
            break;
          }
        }
        if (!matched && onUnrecognized) {
          onUnrecognized(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[VoiceCommand] error:", event.error);
      if (event.error === "not-allowed") {
        isListeningRef.current = false;
        return;
      }
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (enabled && isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    try {
      recognition.start();
      isListeningRef.current = true;
      recognitionRef.current = recognition;
    } catch {
      // ignore
    }
  }, [enabled, commands, onUnrecognized]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return stopListening;
  }, [enabled, startListening, stopListening]);

  return { isListening: isListeningRef.current };
};

export default useVoiceCommands;
