import type BetterSqlite3 from "better-sqlite3";

function isoNow(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

/**
 * Popula dados globais (badges, técnicas de crise, recompensas) quando vazios
 * e garante que exista pelo menos um conjunto de desafios semanais ativos.
 */
export function runSeeds(client: BetterSqlite3.Database) {
  const badgeCount = (client.prepare("SELECT COUNT(*) as c FROM badges").get() as { c: number }).c;
  if (badgeCount === 0) {
    const insert = client.prepare(
      "INSERT INTO badges (name, description, icon, category, rarity) VALUES (?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, string, string][] = [
      ["Primeiro Passo", "Registrou seu primeiro humor", "🌱", "mood", "common"],
      ["Semana Consciente", "Registrou humor por 7 dias seguidos", "📅", "streak", "uncommon"],
      ["Mestre da Rotina", "Completou 10 rotinas", "✅", "routine", "uncommon"],
      ["Sequência de Fogo", "Manteve uma sequência de 7 dias em uma rotina", "🔥", "streak", "rare"],
      ["Respirador Zen", "Completou 5 exercícios de respiração", "🧘", "breathing", "common"],
      ["Constância Total", "30 dias consecutivos de atividade", "💎", "consistency", "epic"],
      ["Superação", "Resolveu uma crise usando técnicas de autorregulação", "🛡️", "milestone", "rare"],
      ["Lenda do Bem-estar", "Alcançou o nível 10", "👑", "milestone", "legendary"],
    ];
    for (const row of rows) insert.run(...row);
  }

  const techniqueCount = (client.prepare("SELECT COUNT(*) as c FROM crisis_techniques").get() as { c: number }).c;
  if (techniqueCount === 0) {
    const insert = client.prepare(
      "INSERT INTO crisis_techniques (name, description, category, duration, instructions, difficulty, effectivenessRating) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, number, string, string, number][] = [
      [
        "Respiração Quadrada (4-4-4-4)",
        "Inspire, segure, expire e segure por 4 segundos cada",
        "breathing",
        3,
        JSON.stringify(["Inspire pelo nariz contando até 4", "Segure o ar contando até 4", "Expire pela boca contando até 4", "Segure vazio contando até 4", "Repita o ciclo"]),
        "beginner",
        8,
      ],
      [
        "Respiração 4-7-8",
        "Técnica calmante com expiração prolongada",
        "breathing",
        4,
        JSON.stringify(["Inspire pelo nariz contando até 4", "Segure o ar contando até 7", "Expire lentamente pela boca contando até 8", "Repita 4 vezes"]),
        "beginner",
        9,
      ],
      [
        "Grounding 5-4-3-2-1",
        "Ancoragem sensorial no momento presente",
        "grounding",
        5,
        JSON.stringify(["Nomeie 5 coisas que você vê", "4 coisas que você pode tocar", "3 sons que você ouve", "2 cheiros que você sente", "1 sabor que você percebe"]),
        "beginner",
        9,
      ],
      [
        "Pressão Profunda",
        "Aplique pressão firme nos braços e ombros para regular o sistema sensorial",
        "sensory",
        3,
        JSON.stringify(["Cruze os braços sobre o peito", "Aperte firmemente os ombros com as mãos", "Mantenha a pressão por 10 segundos", "Solte devagar e repita"]),
        "beginner",
        7,
      ],
      [
        "Caminhada Consciente",
        "Movimento ritmado para descarregar tensão",
        "movement",
        10,
        JSON.stringify(["Encontre um espaço tranquilo", "Caminhe em ritmo constante", "Concentre-se no contato dos pés com o chão", "Sincronize a respiração com os passos"]),
        "beginner",
        7,
      ],
      [
        "Reestruturação de Pensamento",
        "Questione pensamentos catastróficos com evidências",
        "cognitive",
        8,
        JSON.stringify(["Identifique o pensamento que causa angústia", "Pergunte: isso é um fato ou uma interpretação?", "Liste evidências contra o pensamento", "Formule uma versão mais equilibrada"]),
        "intermediate",
        6,
      ],
    ];
    for (const row of rows) insert.run(...row);
  }

  const rewardCount = (client.prepare("SELECT COUNT(*) as c FROM unlocked_rewards").get() as { c: number }).c;
  if (rewardCount === 0) {
    const insert = client.prepare(
      "INSERT INTO unlocked_rewards (title, description, type, cost, icon, config) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, number, string, string | null][] = [
      ["Tema Oceano", "Desbloqueie um tema azul calmante", "theme", 100, "🌊", JSON.stringify({ theme: "ocean" })],
      ["Tema Floresta", "Desbloqueie um tema verde natural", "theme", 100, "🌲", JSON.stringify({ theme: "forest" })],
      ["Sons da Natureza", "Sons calmantes para o modo de crise", "sound", 200, "🎵", JSON.stringify({ sound: "nature" })],
      ["Animação Especial", "Animação de respiração com estrelas", "animation", 300, "✨", JSON.stringify({ animation: "stars" })],
    ];
    for (const row of rows) insert.run(...row);
  }

  const techniqueLibraryCount = (client.prepare("SELECT COUNT(*) as c FROM techniques").get() as { c: number }).c;
  if (techniqueLibraryCount === 0) {
    const insert = client.prepare(
      "INSERT INTO techniques (title, description, category, instructions, duration, difficulty, tags) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, string, number, string, string][] = [
      [
        "Respiração Diafragmática",
        "Respiração profunda usando o diafragma para ativar a resposta de relaxamento do corpo",
        "breathing",
        JSON.stringify(["Sente-se ou deite-se confortavelmente", "Coloque uma mão no peito e outra na barriga", "Inspire pelo nariz sentindo a barriga expandir", "Expire lentamente pela boca sentindo a barriga contrair", "Repita por alguns minutos"]),
        5,
        "beginner",
        JSON.stringify(["ansiedade", "relaxamento"]),
      ],
      [
        "Respiração 4-7-8",
        "Padrão de respiração com expiração prolongada, útil antes de dormir ou em momentos de tensão",
        "breathing",
        JSON.stringify(["Inspire pelo nariz contando até 4", "Segure o ar contando até 7", "Expire pela boca contando até 8", "Repita o ciclo de 4 a 8 vezes"]),
        4,
        "beginner",
        JSON.stringify(["ansiedade", "sono"]),
      ],
      [
        "Grounding 5-4-3-2-1",
        "Técnica de ancoragem sensorial que traz a atenção de volta ao momento presente",
        "grounding",
        JSON.stringify(["Nomeie 5 coisas que você vê", "4 coisas que você pode tocar", "3 sons que você ouve", "2 cheiros que você sente", "1 sabor que você percebe"]),
        5,
        "beginner",
        JSON.stringify(["sobrecarga sensorial", "ansiedade"]),
      ],
      [
        "Ancoragem por Objeto",
        "Usar um objeto de textura conhecida para se reconectar ao presente",
        "grounding",
        JSON.stringify(["Escolha um objeto pequeno e familiar", "Segure-o com as duas mãos", "Descreva mentalmente sua textura, peso e temperatura", "Repita até se sentir mais presente"]),
        3,
        "beginner",
        JSON.stringify(["sensorial", "portátil"]),
      ],
      [
        "Pressão Profunda com Cobertor",
        "Estímulo de pressão profunda para regular o sistema sensorial e reduzir ansiedade",
        "physical",
        JSON.stringify(["Enrole-se em um cobertor pesado ou cobertor ponderado", "Aplique pressão firme e constante", "Permaneça assim por 5 a 10 minutos", "Respire normalmente durante o processo"]),
        10,
        "beginner",
        JSON.stringify(["sensorial", "sobrecarga"]),
      ],
      [
        "Alongamento de Liberação de Tensão",
        "Sequência curta de alongamentos para liberar tensão muscular acumulada",
        "physical",
        JSON.stringify(["Alongue o pescoço lentamente para os dois lados", "Gire os ombros para trás 10 vezes", "Alongue os braços acima da cabeça", "Incline o tronco para frente soltando a coluna"]),
        8,
        "intermediate",
        JSON.stringify(["tensão", "movimento"]),
      ],
      [
        "Reestruturação Cognitiva",
        "Questionar pensamentos catastróficos substituindo-os por interpretações mais equilibradas",
        "cognitive",
        JSON.stringify(["Identifique o pensamento que causa angústia", "Pergunte-se: isso é um fato ou uma suposição?", "Liste evidências a favor e contra o pensamento", "Escreva uma versão mais realista do pensamento"]),
        10,
        "intermediate",
        JSON.stringify(["ansiedade", "pensamentos"]),
      ],
      [
        "Diário de Pensamentos",
        "Registro estruturado de situação, pensamento, emoção e reação para identificar padrões",
        "cognitive",
        JSON.stringify(["Anote a situação que gerou desconforto", "Anote o pensamento automático que surgiu", "Anote a emoção e sua intensidade (0-10)", "Anote uma resposta alternativa mais equilibrada"]),
        15,
        "advanced",
        JSON.stringify(["autoconhecimento", "padrões"]),
      ],
      [
        "Roteiro de Saída Social",
        "Frase preparada com antecedência para se retirar de uma situação social sobrecarregante",
        "social",
        JSON.stringify(["Escolha uma frase curta e neutra com antecedência (ex: 'preciso de um momento')", "Pratique dizê-la em voz alta algumas vezes", "Use-a sem se justificar demais quando precisar se afastar", "Retorne quando estiver pronto, sem pressa"]),
        5,
        "intermediate",
        JSON.stringify(["comunicação", "limites"]),
      ],
      [
        "Sinal Não-verbal de Pausa",
        "Combinar um gesto ou palavra-código com pessoas de confiança para pedir uma pausa sem precisar explicar",
        "social",
        JSON.stringify(["Escolha um gesto ou palavra simples com uma pessoa de confiança", "Explique o que o sinal significa antes de precisar usá-lo", "Use o sinal sempre que precisar de espaço", "Combine também um sinal de 'estou bem, só preciso de um tempo'"]),
        2,
        "beginner",
        JSON.stringify(["comunicação", "portátil"]),
      ],
    ];
    for (const row of rows) insert.run(...row);
  }

  const activeChallenges = (
    client
      .prepare("SELECT COUNT(*) as c FROM challenges WHERE isActive = 1 AND startDate <= ? AND endDate >= ?")
      .get(isoNow(), isoNow()) as { c: number }
  ).c;
  if (activeChallenges === 0) {
    const insert = client.prepare(
      "INSERT INTO challenges (title, description, icon, category, difficulty, goal, goalType, reward, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const start = isoNow();
    const end = isoNow(7);
    const rows: [string, string, string, string, string, number, string, number, string, string][] = [
      ["Semana do Humor", "Registre seu humor 5 vezes nesta semana", "💜", "mood", "easy", 5, "count", 50, start, end],
      ["Rotina em Dia", "Complete 7 rotinas nesta semana", "📋", "routine", "medium", 7, "count", 100, start, end],
      ["Respire Fundo", "Faça 3 exercícios de respiração nesta semana", "🌬️", "breathing", "easy", 3, "count", 50, start, end],
    ];
    for (const row of rows) insert.run(...row);
  }
}
