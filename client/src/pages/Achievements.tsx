import { useState, useEffect } from "react";
import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Zap, Target, Gift, TrendingUp } from "lucide-react";

export default function Achievements() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  // Fetch game stats
  const statsQuery = trpc.gamification.getStats.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch badges
  const badgesQuery = trpc.gamification.getBadges.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch active challenges
  const challengesQuery = trpc.gamification.getActiveChallenges.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch available rewards
  const rewardsQuery = trpc.gamification.getAvailableRewards.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch user rewards
  const userRewardsQuery = trpc.gamification.getUserRewards.useQuery(undefined, {
    enabled: !!user,
  });

  // Apenas a própria posição: o ranking antigo listava nome de todos os
  // usuários, e constar nessa lista já revela que a pessoa usa o app.
  const rankingQuery = trpc.gamification.getMyRanking.useQuery(undefined, {
    enabled: !!user,
  });

  const stats = statsQuery.data as any;
  const badges = badgesQuery.data || [];
  const challenges = challengesQuery.data || [];
  const rewards = rewardsQuery.data || [];
  const userRewards = userRewardsQuery.data || [];
  const ranking = rankingQuery.data;

  // Calculate progress to next level
  const progressToNextLevel = stats
    ? Math.round(((stats.totalPoints || 0) / (stats.nextLevelPoints || 100)) * 100)
    : 0;

  // Badge rarity colors
  const rarityColors: Record<string, string> = {
    common: "bg-gray-100 text-gray-800",
    uncommon: "bg-green-100 text-green-800",
    rare: "bg-blue-100 text-blue-800",
    epic: "bg-purple-100 text-purple-800",
    legendary: "bg-yellow-100 text-yellow-800",
  };

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="w-10 h-10 text-yellow-500" />
            Suas Conquistas
          </h1>
          <p className="text-gray-600">Acompanhe seu progresso e desbloqueie recompensas</p>
        </div>

        {/* Level and Points Card */}
        {stats && (
          <Card className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl text-white">Nível {stats?.level || 1}</CardTitle>
                    <CardDescription className="text-indigo-100">
                      {stats?.totalPoints || 0} pontos acumulados
                    </CardDescription>
                  </div>
                  <Star className="w-16 h-16 text-yellow-300" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso para Nível {(stats?.level || 1) + 1}</span>
                    <span>{progressToNextLevel}%</span>
                  </div>
                  <Progress value={progressToNextLevel} className="h-3" />
                  <p className="text-sm text-indigo-100 mt-2">
                    {stats?.nextLevelPoints && stats?.totalPoints
                      ? `${stats.nextLevelPoints - stats.totalPoints} pontos até o próximo nível`
                      : "Carregando..."}
                  </p>
                </div>
              </CardContent>
          </Card>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Badges Desbloqueadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{(stats as any)?.totalBadgesUnlocked || 0}</div>
              <p className="text-xs text-gray-500 mt-1">de {badges.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Desafios Completos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{(stats as any)?.totalChallengesCompleted || 0}</div>
              <p className="text-xs text-gray-500 mt-1">desafios conquistados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Sequência Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{(stats as any)?.currentStreak || 0}</div>
              <p className="text-xs text-gray-500 mt-1">dias consecutivos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Melhor Sequência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{(stats as any)?.longestStreak || 0}</div>
              <p className="text-xs text-gray-500 mt-1">dias</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="badges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="challenges">Desafios</TabsTrigger>
            <TabsTrigger value="rewards">Recompensas</TabsTrigger>
            <TabsTrigger value="leaderboard">Sua posição</TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle>Galeria de Badges</CardTitle>
                <CardDescription>Desbloqueie badges completando objetivos</CardDescription>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma badge desbloqueada ainda. Continue registrando seu progresso!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {badges.map((badge: any) => (
                      <div
                        key={badge.id}
                        className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-500 cursor-pointer transition"
                        onClick={() => setSelectedBadge(badge)}
                      >
                        <div className="text-4xl mb-2">{badge.icon}</div>
                        <p className="text-xs font-semibold text-center text-gray-700">{badge.name}</p>
                        <Badge className={`mt-2 text-xs ${rarityColors[badge.rarity] || rarityColors.common}`}>
                          {badge.rarity}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(badge.unlockedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Badge Detail Modal */}
            {selectedBadge && (
              <Card className="mt-6 bg-indigo-50 border-indigo-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-4xl">{selectedBadge.icon}</span>
                        {selectedBadge.name}
                      </CardTitle>
                      <CardDescription>{selectedBadge.description}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBadge(null)}
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>
                      <strong>Categoria:</strong> {selectedBadge.category}
                    </p>
                    <p>
                      <strong>Raridade:</strong>{" "}
                      <Badge className={rarityColors[selectedBadge.rarity]}>
                        {selectedBadge.rarity}
                      </Badge>
                    </p>
                    <p>
                      <strong>Desbloqueada em:</strong>{" "}
                      {new Date(selectedBadge.unlockedAt).toLocaleDateString("pt-BR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {selectedBadge.notes && (
                      <p>
                        <strong>Nota:</strong> {selectedBadge.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            <Card>
              <CardHeader>
                <CardTitle>Desafios Semanais</CardTitle>
                <CardDescription>Complete desafios para ganhar pontos e badges</CardDescription>
              </CardHeader>
              <CardContent>
                {challenges.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum desafio ativo no momento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {challenges.map((challenge: any) => (
                      <Card key={challenge.id} className="border-l-4 border-l-indigo-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <span className="text-2xl">{challenge.icon}</span>
                                {challenge.title}
                              </CardTitle>
                              <CardDescription>{challenge.description}</CardDescription>
                            </div>
                            <Badge
                              variant={challenge.difficulty === "easy" ? "secondary" : "default"}
                            >
                              {challenge.difficulty}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Progresso</span>
                                <span>
                                  {challenge.userProgress || 0} / {challenge.goal}
                                </span>
                              </div>
                              <Progress
                                value={
                                  challenge.goal > 0
                                    ? Math.round(((challenge.userProgress || 0) / challenge.goal) * 100)
                                    : 0
                                }
                              />
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Recompensa: {challenge.reward} pontos</span>
                              {challenge.userCompleted && (
                                <Badge className="bg-green-500">Completo!</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <CardTitle>Loja de Recompensas</CardTitle>
                <CardDescription>Gaste seus pontos para desbloquear recompensas</CardDescription>
              </CardHeader>
              <CardContent>
                {rewards.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma recompensa disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewards.map((reward: any) => {
                      const isUnlocked = userRewards.some((ur: any) => ur.rewardId === reward.id);
                      return (
                        <Card
                          key={reward.id}
                          className={isUnlocked ? "border-green-500 bg-green-50" : ""}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <span className="text-3xl">{reward.icon}</span>
                                </CardTitle>
                                <p className="font-semibold text-gray-700">{reward.title}</p>
                              </div>
                              {isUnlocked && (
                                <Badge className="bg-green-500">Desbloqueada</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-indigo-600">
                                {reward.cost} pontos
                              </span>
                              {!isUnlocked && (
                                <Button size="sm" variant="outline">
                                  Desbloquear
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Sua posição
                </CardTitle>
                <CardDescription>
                  Onde você está em relação a quem também usa o app
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rankingQuery.isLoading ? (
                  <p className="text-sm text-gray-600">Calculando...</p>
                ) : ranking?.position ? (
                  <div className="text-center py-8">
                    <div className="text-6xl font-bold text-indigo-600 mb-2">
                      {ranking.position}º
                    </div>
                    <p className="text-gray-600">
                      entre {ranking.totalUsers}{" "}
                      {ranking.totalUsers === 1 ? "pessoa" : "pessoas"}
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                      Com {ranking.totalPoints}{" "}
                      {ranking.totalPoints === 1 ? "ponto" : "pontos"} acumulados.
                    </p>
                    <p className="text-xs text-gray-400 mt-6 max-w-md mx-auto">
                      Mostramos apenas a sua posição. Nomes de outras pessoas não são
                      exibidos aqui.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Registre humor, rotinas ou técnicas para começar a somar pontos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
