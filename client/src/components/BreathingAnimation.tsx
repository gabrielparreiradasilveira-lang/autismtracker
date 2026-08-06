import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw } from "lucide-react";

interface BreathingPattern {
  name: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
}

const patterns: Record<string, BreathingPattern> = {
  "box": { name: "Box Breathing (4-4-4-4)", inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
  "478": { name: "4-7-8", inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
  "calm": { name: "Respiração Calmante", inhale: 4, hold1: 2, exhale: 6, hold2: 0 },
};

interface Props {
  patternKey?: string;
  onComplete?: () => void;
}

export default function BreathingAnimation({ patternKey = "box", onComplete }: Props) {
  const pattern = patterns[patternKey] || patterns.box;
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<"inhale" | "hold1" | "exhale" | "hold2">("inhale");
  const [counter, setCounter] = useState(pattern.inhale);
  const [cycles, setCycles] = useState(0);
  const totalCycles = 4;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCounter((prev) => {
        if (prev <= 1) {
          // Move to next phase
          if (phase === "inhale") {
            if (pattern.hold1 > 0) {
              setPhase("hold1");
              return pattern.hold1;
            } else {
              setPhase("exhale");
              return pattern.exhale;
            }
          } else if (phase === "hold1") {
            setPhase("exhale");
            return pattern.exhale;
          } else if (phase === "exhale") {
            if (pattern.hold2 > 0) {
              setPhase("hold2");
              return pattern.hold2;
            } else {
              // Complete cycle
              setCycles((c) => {
                const newCycles = c + 1;
                if (newCycles >= totalCycles) {
                  setIsPlaying(false);
                  onComplete?.();
                  return 0;
                }
                return newCycles;
              });
              setPhase("inhale");
              return pattern.inhale;
            }
          } else if (phase === "hold2") {
            // Complete cycle
            setCycles((c) => {
              const newCycles = c + 1;
              if (newCycles >= totalCycles) {
                setIsPlaying(false);
                onComplete?.();
                return 0;
              }
              return newCycles;
            });
            setPhase("inhale");
            return pattern.inhale;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, phase, pattern, onComplete]);

  const getPhaseLabel = () => {
    switch (phase) {
      case "inhale":
        return "Inspire";
      case "hold1":
        return "Segure";
      case "exhale":
        return "Expire";
      case "hold2":
        return "Segure";
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case "inhale":
        return "from-blue-400 to-blue-600";
      case "hold1":
        return "from-purple-400 to-purple-600";
      case "exhale":
        return "from-green-400 to-green-600";
      case "hold2":
        return "from-yellow-400 to-yellow-600";
    }
  };

  const getCircleScale = () => {
    const maxDuration = Math.max(pattern.inhale, pattern.hold1, pattern.exhale, pattern.hold2);
    const progress = counter / maxDuration;

    switch (phase) {
      case "inhale":
        return 0.5 + (1 - progress) * 0.5; // Grow from 0.5 to 1
      case "hold1":
        return 1; // Stay at 1
      case "exhale":
        return 1 - (1 - progress) * 0.5; // Shrink from 1 to 0.5
      case "hold2":
        return 0.5; // Stay at 0.5
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPhase("inhale");
    setCounter(pattern.inhale);
    setCycles(0);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">{pattern.name}</h3>
          <p className="text-sm text-muted-foreground">
            Ciclo {cycles + 1} de {totalCycles}
          </p>
        </div>

        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Animated circle */}
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${getPhaseColor()} transition-transform duration-1000 ease-in-out flex items-center justify-center`}
            style={{
              transform: `scale(${getCircleScale()})`,
            }}
          >
            <div className="text-white text-center">
              <div className="text-4xl font-bold mb-2">{counter}</div>
              <div className="text-lg font-medium">{getPhaseLabel()}</div>
            </div>
          </div>

          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            size="lg"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 max-w-[200px]"
          >
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Pausar
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                {cycles > 0 ? "Continuar" : "Iniciar"}
              </>
            )}
          </Button>
          <Button size="lg" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 text-center text-sm">
          <div className={`p-2 rounded ${phase === "inhale" ? "bg-blue-100 text-blue-800" : "bg-muted"}`}>
            <div className="font-semibold">{pattern.inhale}s</div>
            <div className="text-xs">Inspire</div>
          </div>
          {pattern.hold1 > 0 && (
            <div className={`p-2 rounded ${phase === "hold1" ? "bg-purple-100 text-purple-800" : "bg-muted"}`}>
              <div className="font-semibold">{pattern.hold1}s</div>
              <div className="text-xs">Segure</div>
            </div>
          )}
          <div className={`p-2 rounded ${phase === "exhale" ? "bg-green-100 text-green-800" : "bg-muted"}`}>
            <div className="font-semibold">{pattern.exhale}s</div>
            <div className="text-xs">Expire</div>
          </div>
          {pattern.hold2 > 0 && (
            <div className={`p-2 rounded ${phase === "hold2" ? "bg-yellow-100 text-yellow-800" : "bg-muted"}`}>
              <div className="font-semibold">{pattern.hold2}s</div>
              <div className="text-xs">Segure</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
