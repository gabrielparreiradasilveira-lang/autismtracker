import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Brain, Calendar, Target, Shield, Users } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (isAuthenticated && user) navigate("/dashboard");
  }, [isAuthenticated, user, navigate]);
  if (isAuthenticated && user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Apoio Autismo</span>
          </div>
          <div className="flex items-center space-x-4">
            <a href={getLoginUrl()}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Entrar
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="w-20 h-20 mx-auto mb-8 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Brain className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Seu companheiro de <span className="text-blue-600">bem-estar</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Um espaço seguro para registrar, acompanhar e gerenciar sua jornada no espectro autista, 
            complementando sua terapia com ferramentas práticas e insights valiosos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={getLoginUrl()}>
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-8 py-3">
                Começar agora
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ferramentas para sua jornada
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Funcionalidades cuidadosamente projetadas para apoiar pessoas no espectro autista 
              em sua rotina diária e desenvolvimento pessoal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Diário de Humor</h3>
                <p className="text-gray-600 text-sm">
                  Registre suas emoções e sensações diárias com escalas visuais intuitivas
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gatilhos Sensoriais</h3>
                <p className="text-gray-600 text-sm">
                  Identifique e catalogue gatilhos sensoriais para melhor autoconhecimento
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Rotinas Diárias</h3>
                <p className="text-gray-600 text-sm">
                  Organize e acompanhe suas rotinas com checklists personalizáveis
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Monitoramento</h3>
                <p className="text-gray-600 text-sm">
                  Acompanhe sintomas específicos e observe padrões ao longo do tempo
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Autorregulação</h3>
                <p className="text-gray-600 text-sm">
                  Biblioteca de técnicas e exercícios de respiração para momentos difíceis
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Compartilhamento</h3>
                <p className="text-gray-600 text-sm">
                  Exporte dados para compartilhar com terapeutas e profissionais
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Junte-se a pessoas que estão transformando sua jornada no espectro autista 
            com ferramentas de autoconhecimento e bem-estar.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
              Criar conta gratuita
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-50 border-t">
        <div className="container mx-auto text-center max-w-6xl">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Apoio Autismo</span>
          </div>
          <p className="text-gray-600 text-sm">
            Desenvolvido com carinho para apoiar sua jornada de bem-estar
          </p>
        </div>
      </footer>
    </div>
  );
}
