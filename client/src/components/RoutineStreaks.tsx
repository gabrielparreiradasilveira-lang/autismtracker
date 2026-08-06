import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Trophy, Target, TrendingUp } from "lucide-react";

interface RoutineStreak {
  id: number;
  title: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  points: number;
}

interface RoutineStreaksProps {
  streaks: RoutineStreak[];
}

export function RoutineStreaks({ streaks }: RoutineStreaksProps) {
  const totalPoints = streaks.reduce((sum, s) => sum + (s.totalCompletions * s.points), 0);
  const bestStreak = Math.max(...streaks.map(s => s.longestStreak), 0);
  const activeStreaks = streaks.filter(s => s.currentStreak > 0).length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Sequências e Conquistas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <div className="flex justify-center mb-2">
              <Flame className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-900">{bestStreak}</div>
            <div className="text-xs text-orange-700">Melhor Sequência</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex justify-center mb-2">
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900">{totalPoints}</div>
            <div className="text-xs text-purple-700">Pontos Totais</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <div className="flex justify-center mb-2">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{activeStreaks}</div>
            <div className="text-xs text-blue-700">Sequências Ativas</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex justify-center mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">
              {Math.floor(totalPoints / 100) + 1}
            </div>
            <div className="text-xs text-green-700">Nível</div>
          </div>
        </div>

        {/* Individual Streaks */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Suas Rotinas</h4>
          {streaks.length > 0 ? (
            streaks.map(streak => (
              <div
                key={streak.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{streak.title}</div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Flame className={`w-3 h-3 ${streak.currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                      {streak.currentStreak} dias
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-purple-500" />
                      Recorde: {streak.longestStreak}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-blue-500" />
                      {streak.totalCompletions}x completado
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">
                    {streak.totalCompletions * streak.points}
                  </div>
                  <div className="text-xs text-gray-500">pontos</div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600 text-center py-4">
              Complete rotinas para começar suas sequências!
            </p>
          )}
        </div>

        {/* Progress to Next Level */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-900">
              Nível {Math.floor(totalPoints / 100) + 1}
            </span>
            <span className="text-sm text-purple-700">
              {totalPoints % 100} / 100 pontos
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(totalPoints % 100)}%` }}
            />
          </div>
          <p className="text-xs text-purple-700 mt-2">
            Faltam {100 - (totalPoints % 100)} pontos para o próximo nível!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
