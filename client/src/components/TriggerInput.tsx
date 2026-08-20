import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

/**
 * Campo de gatilhos com sugestão dos que o usuário já cadastrou.
 *
 * O campo continua sendo texto livre — dá para digitar um gatilho novo a
 * qualquer momento. As sugestões existem porque a mesma pessoa digitava
 * "barulho alto" aqui, "Barulho alto" ali, e as análises agrupam por
 * string exata: cada variação virava um gatilho diferente e diluía as
 * correlações.
 *
 * As sugestões são botões de alternar (não um select fechado), com
 * aria-pressed, para funcionar por teclado e deixar explícito o que já
 * está escolhido.
 */
export default function TriggerInput({
  id,
  value,
  onChange,
  label = "Gatilhos (separados por vírgula)",
  placeholder = "Ex: barulho alto, luz forte",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const saved = trpc.triggers.list.useQuery();

  const selecionados = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const jaEscolhido = (nome: string) =>
    selecionados.some((t) => t.toLowerCase() === nome.toLowerCase());

  const alternar = (nome: string) => {
    const restantes = selecionados.filter((t) => t.toLowerCase() !== nome.toLowerCase());
    const proximos = jaEscolhido(nome) ? restantes : [...restantes, nome];
    onChange(proximos.join(", "));
  };

  const sugestoes = saved.data ?? [];

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      {sugestoes.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">
            Seus gatilhos cadastrados — toque para adicionar ou remover:
          </p>
          <div className="flex flex-wrap gap-1">
            {sugestoes.map((trigger) => {
              const ativo = jaEscolhido(trigger.name);
              return (
                <button
                  key={trigger.id}
                  type="button"
                  onClick={() => alternar(trigger.name)}
                  aria-pressed={ativo}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    ativo
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                  }`}
                >
                  {trigger.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
