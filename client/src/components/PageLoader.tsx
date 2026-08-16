/**
 * Estado de carregamento das páginas autenticadas, enquanto a sessão é
 * verificada. `role="status"` + `aria-live` fazem leitores de tela
 * anunciarem o carregamento; `motion-reduce` desliga o giro para quem
 * pediu menos animação no sistema.
 */
export default function PageLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center" role="status" aria-live="polite">
        <div
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin motion-reduce:animate-none mx-auto mb-4"
          aria-hidden="true"
        />
        <p className="text-gray-600">{label}</p>
      </div>
    </div>
  );
}
