import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Check } from "lucide-react";

interface RoutineTimerProps {
  routineTitle: string;
  estimatedDuration?: number; // in minutes
  onComplete: (timeSpent: number) => void;
}

export function RoutineTimer({ routineTitle, estimatedDuration, onComplete }: RoutineTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && !isCompleted) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isCompleted]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
    setIsCompleted(false);
  };

  const handleComplete = () => {
    setIsRunning(false);
    setIsCompleted(true);
    const minutesSpent = Math.ceil(seconds / 60);
    onComplete(minutesSpent);
  };

  const progress = estimatedDuration
    ? Math.min((seconds / (estimatedDuration * 60)) * 100, 100)
    : 0;

  const isOvertime = estimatedDuration && seconds > estimatedDuration * 60;

  return (
    <Card className={`${isCompleted ? 'bg-green-50 border-green-300' : ''}`}>
      <CardHeader>
        <CardTitle className="text-lg">{routineTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className={`text-6xl font-bold ${
            isCompleted ? 'text-green-600' : 
            isOvertime ? 'text-orange-600' : 
            'text-purple-600'
          }`}>
            {formatTime(seconds)}
          </div>
          {estimatedDuration && (
            <div className="text-sm text-gray-600 mt-2">
              Tempo estimado: {estimatedDuration} min
              {isOvertime && (
                <span className="ml-2 text-orange-600 font-semibold">
                  (+{Math.ceil((seconds - estimatedDuration * 60) / 60)} min)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {estimatedDuration && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-green-600' :
                  isOvertime ? 'bg-orange-500' : 
                  'bg-purple-600'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isCompleted ? (
            <>
              {!isRunning ? (
                <Button onClick={handleStart} className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  {seconds > 0 ? 'Continuar' : 'Iniciar'}
                </Button>
              ) : (
                <Button onClick={handlePause} variant="outline" className="flex-1">
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </Button>
              )}
              
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handleComplete}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                disabled={seconds === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                Registrar tempo
              </Button>
            </>
          ) : (
            <div className="text-center w-full">
              {/* O cronômetro registra tempo; quem conclui a rotina é a
                  marcação das tarefas. Dizer "rotina concluída" aqui
                  afirmaria algo que não aconteceu. */}
              <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                <Check className="w-6 h-6" />
                <span className="font-semibold">
                  Tempo registrado: {Math.ceil(seconds / 60)} min
                </span>
              </div>
              <Button onClick={handleReset} variant="outline" size="sm">
                Reiniciar Timer
              </Button>
            </div>
          )}
        </div>

        {/* Estado do cronômetro, em linguagem literal: nada de metáfora
            nem de suposição sobre como a pessoa está se sentindo. */}
        {!isCompleted && seconds > 0 && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-sm text-purple-800">
              {isRunning
                ? `Cronômetro em andamento há ${formatTime(seconds)}.`
                : `Cronômetro pausado em ${formatTime(seconds)}. Toque em Continuar para retomar.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
