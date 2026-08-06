import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="text-6xl font-bold text-blue-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-600 mb-6">A página que você procura não existe ou foi movida.</p>
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-700">Voltar ao início</Button>
        </Link>
      </div>
    </div>
  );
}
