import { useState } from 'react';
import { useLocation } from 'wouter';
import { AlertCircle } from 'lucide-react';

interface SOSButtonProps {
  className?: string;
}

export default function SOSButton({ className = '' }: SOSButtonProps) {
  const [, setLocation] = useLocation();
  const [isPulsing, setIsPulsing] = useState(false);

  const handleSOSClick = () => {
    setIsPulsing(true);
    setTimeout(() => {
      setLocation('/crisis');
    }, 300);
  };

  return (
    <button
      onClick={handleSOSClick}
      className={`fixed bottom-6 right-6 z-50 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
        isPulsing ? 'animate-ping' : 'hover:scale-110'
      } ${className}`}
      aria-label="Modo de Crise SOS"
      title="Clique aqui se você está em crise"
    >
      <AlertCircle className="w-8 h-8" />
    </button>
  );
}
