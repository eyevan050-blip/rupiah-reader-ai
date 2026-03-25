import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import WelcomeScreen from "@/components/WelcomeScreen";
import CameraView from "@/components/CameraView";

type AppScreen = "splash" | "welcome" | "camera";

const Index = () => {
  const [screen, setScreen] = useState<AppScreen>("splash");

  return (
    <div className="w-full h-screen overflow-hidden bg-camera-bg">
      <AnimatePresence mode="wait">
        {screen === "splash" && (
          <SplashScreen key="splash" onComplete={() => setScreen("welcome")} />
        )}
        {screen === "welcome" && (
          <WelcomeScreen key="welcome" onStart={() => setScreen("camera")} />
        )}
        {screen === "camera" && <CameraView key="camera" />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
