/**
 * Liga o gatilho digitado ao gatilho cadastrado.
 *
 * Em humor e sintomas o gatilho é texto livre; no cadastro
 * (`sensory_triggers`) ele tem categoria, severidade e estratégia de
 * enfrentamento. As duas coisas nunca se falaram, então tudo que a pessoa
 * escreveu sobre um gatilho ficava invisível para as análises daquele
 * mesmo gatilho.
 *
 * O casamento é por nome, ignorando maiúsculas, acentos e espaço sobrando
 * — é assim que a mesma pessoa digita "Barulho alto", "barulho alto" e
 * "  Barulho Alto " ao longo de semanas.
 */
export function normalizarGatilho(nome: string) {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Índice nome normalizado → registro do cadastro. */
export function indexarGatilhos<T extends { name: string }>(cadastrados: T[]) {
  const indice = new Map<string, T>();
  for (const gatilho of cadastrados) {
    indice.set(normalizarGatilho(gatilho.name), gatilho);
  }
  return indice;
}
