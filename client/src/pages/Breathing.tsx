import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const EXERCISE_TYPES = [
  {
    id: "box",
    name: "Respiração Quadrada (Box Breathing)",
    description: "Inspire por 4 segundos, segure por 4, expire por 4, segure por 4",
    pattern: "4-4-4-4",
    duration: 240, // 4 minutos
    phases: [
      { name: "Inspire", duration: 4 },
      { name: "Segure", duration: 4 },
      { name: "Expire", duration: 4 },
      { name: "Segure", duration: 4 },
    ],
  },
  {
    id: "478",
    name: "Respiração 4-7-8",
    description: "Inspire por 4 segundos, segure por 7, expire por 8",
    pattern: "4-7-8",
    duration: 228, // ~4 minutos
    phases: [
      { name: "Inspire", duration: 4 },
      { name: "Segure", duration: 7 },
      { name: "Expire", duration: 8 },
    ],
  },
  {
    id: "deep",
    name: "Respiração Profunda",
    description: "Inspire profundamente por 5 segundos, expire por 5",
    pattern: "5-5",
    duration: 300, // 5 minutos
    phases: [
      { name: "Inspire", duration: 5 },
      { name: "Expire", duration: 5 },
    ],
  },
];

export default function Breathing() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [selectedExercise, setSelectedExercise] = useState<typeof EXERCISE_TYPES[0] | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const createExerciseMutation = trpc.exercises.create.useMutation({
    onSuccess: () => {
      toast.success("Sessão de exercício registrada!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar exercício: " + error.message);
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && selectedExercise) {
      interval = setInterval(() => {
        setPhaseTime((prev) => {
          const nextTime = prev + 1;
          const currentPhaseDuration = selectedExercise.phases[currentPhase].duration;

          if (nextTime >= currentPhaseDuration) {
            const nextPhase = (currentPhase + 1) % selectedExercise.phases.length;
            setCurrentPhase(nextPhase);
            return 0;
          }

          return nextTime;
        });

        setTotalTime((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, selectedExercise, currentPhase]);

  const startExercise = (exercise: typeof EXERCISE_TYPES[0]) => {
    setSelectedExercise(exercise);
    setIsActive(true);
    setCurrentPhase(0);
    setPhaseTime(0);
    setTotalTime(0);
    setStartTime(new Date());
  };

  const pauseExercise = () => {
    setIsActive(false);
  };

  const resumeExercise = () => {
    setIsActive(true);
  };

  const stopExercise = () => {
    if (selectedExercise && startTime) {
      const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      createExerciseMutation.mutate({
        exerciseType: selectedExercise.id,
        duration,
        pattern: selectedExercise.pattern,
        completed: true,
        completedAt: new Date(),
      });
    }

    setIsActive(false);
    setSelectedExercise(null);
    setCurrentPhase(0);
    setPhaseTime(0);
    setTotalTime(0);
    setStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-pink-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Exercícios de Respiração</h1>
          </div>
          <p className="text-gray-600">Pratique técnicas de autorregulação</p>
        </div>

        {!selectedExercise ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXERCISE_TYPES.map((exercise) => (
              <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{exercise.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{exercise.description}</p>
                  <div className="mb-4">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Padrão: {exercise.pattern}
                    </span>
                  </div>
                  <Button onClick={() => startExercise(exercise)} className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">{selectedExercise.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual Breathing Circle */}
              <div className="flex items-center justify-center py-12">
                <div
                  className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 ${
                    selectedExercise.phases[currentPhase].name === "Inspire"
                      ? "bg-blue-200 scale-125"
                      : selectedExercise.phases[currentPhase].name === "Expire"
                      ? "bg-green-200 scale-75"
                      : "bg-purple-200 scale-100"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {selectedExercise.phases[currentPhase].name}
                    </div>
                    <div className="text-6xl font-bold">
                      {selectedExercise.phases[currentPhase].duration - phaseTime}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">Tempo Total</div>
                <div className="text-2xl font-bold">{formatTime(totalTime)}</div>
              </div>

              {/* Controls */}
              <div className="flex gap-4 justify-center">
                {isActive ? (
                  <Button onClick={pauseExercise} variant="outline" size="lg">
                    <Pause className="w-5 h-5 mr-2" />
                    Pausar
                  </Button>
                ) : (
                  <Button onClick={resumeExercise} size="lg">
                    <Play className="w-5 h-5 mr-2" />
                    Continuar
                  </Button>
                )}
                <Button onClick={stopExercise} variant="destructive" size="lg">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Finalizar
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 text-center">
                  {selectedExercise.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
