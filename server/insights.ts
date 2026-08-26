/**
 * Motor de insights.
 *
 * Traduz os números que o app já calcula em frases que dizem (a) qual
 * padrão foi observado, (b) o que ele provavelmente significa e (c) uma
 * ação concreta numa tela existente.
 *
 * Regras que valem para todo gerador:
 * - Amostra mínima. Abaixo dela, devolve o que falta em números, nunca um
 *   conselho genérico do tipo "continue registrando".
 * - Correlação não é causa: a redação usa "nos dias em que" / "associado
 *   a", nunca "porque" ou "causa".
 * - Linguagem literal, sem metáfora, ironia ou suposição sobre o que a
 *   pessoa sente. Números concretos no lugar de adjetivos.
 * - Nada de diagnóstico nem de substituir acompanhamento profissional.
 */
import {
  getExerciseAnalytics,
  getMoodByTimeOfDay,
  getRoutineMoodCorrelations,
  getSymptomAnalytics,
  getTechniqueAnalytics,
} from "./db";

export type Insight = {
  id: string;
  pattern: string;
  meaning: string;
  action: { label: string; route: string };
  sampleSize: number;
};

/**
 * Nome legível de cada análise, para o painel de cobertura de dados
 * poder dizer o que está e o que não está disponível. As chaves são os
 * mesmos ids que os geradores devolvem.
 */
export const INSIGHT_LABELS: Record<string, string> = {
  "routine-mood": "Rotina × humor",
  "symptom-weekday": "Sintomas por dia da semana",
  "intervention-symptom": "O que funciona para cada sintoma",
  "trigger-symptom": "Gatilho × severidade do sintoma",
  "technique-effectiveness": "Técnica mais bem avaliada",
  "symptom-duration": "Duração típica dos episódios",
  "breathing-effectiveness": "Padrão de respiração mais eficaz",
  "mood-time-of-day": "Humor por período do dia",
};

export type MissingData = {
  id: string;
  missing: string;
};

type GeneratorResult = Insight | MissingData;

function isInsight(result: GeneratorResult): result is Insight {
  return "pattern" in result;
}

/** Ocorrências mínimas para uma média por categoria valer como padrão. */
const MIN_OCCURRENCES = 3;

const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const SYMPTOM_LABELS: Record<string, string> = {
  social_interaction: "Interação Social",
  communication: "Comunicação",
  repetitive_behavior: "Comportamento Repetitivo",
  sensory_sensitivity: "Sensibilidade Sensorial",
  focus: "Foco e Atenção",
  executive_function: "Função Executiva",
};

const symptomLabel = (type: string) => SYMPTOM_LABELS[type] ?? type;

/** "1 dia" / "3 dias" — o público lê literalmente, "1 dia(s)" atrapalha. */
const plural = (n: number, singular: string, pluralForm: string) =>
  `${n} ${n === 1 ? singular : pluralForm}`;

/** 1. Rotina concluída × humor e ansiedade no mesmo dia. */
async function routineVsMood(userId: number, fuso: number): Promise<GeneratorResult> {
  const id = "routine-mood";
  const data = await getRoutineMoodCorrelations(userId, fuso);

  if (!data.hasSufficientData) {
    const faltam = data.minDays - data.daysAnalyzed;
    return {
      id,
      missing: `Faltam ${plural(faltam, "dia", "dias")} com rotina e humor registrados no mesmo dia para comparar.`,
    };
  }

  // Sem os dois grupos não há comparação — só uma média solta.
  if (data.avgMoodWithRoutines == null || data.avgMoodWithoutRoutines == null) {
    return {
      id,
      missing:
        data.daysWithoutRoutines === 0
          ? "Você completou rotinas em todos os dias registrados. Para comparar, é preciso ter também dias sem rotina concluída."
          : "Faltam dias com rotina concluída para comparar com os dias sem.",
    };
  }

  const diff = data.avgMoodWithRoutines - data.avgMoodWithoutRoutines;

  return {
    id,
    sampleSize: data.daysAnalyzed,
    pattern:
      `Nos ${plural(data.daysWithRoutines, "dia", "dias")} em que você concluiu alguma rotina, seu humor médio foi ` +
      `${data.avgMoodWithRoutines.toFixed(1)}. Nos ${plural(data.daysWithoutRoutines, "dia", "dias")} sem rotina concluída, foi ` +
      `${data.avgMoodWithoutRoutines.toFixed(1)}.`,
    meaning:
      Math.abs(diff) < 0.5
        ? "Até agora, concluir rotinas não aparece associado a um humor diferente nos seus registros."
        : diff > 0
          ? `Dias com rotina concluída aparecem associados a um humor ${diff.toFixed(1)} ponto mais alto, em média.`
          : `Dias com rotina concluída aparecem associados a um humor ${Math.abs(diff).toFixed(1)} ponto mais baixo, em média. Vale observar se as rotinas atuais estão pesadas demais.`,
    action: { label: "Ver minhas rotinas", route: "/routines" },
  };
}

/** 2. Severidade de sintoma × dia da semana. */
async function symptomByWeekday(userId: number, fuso: number): Promise<GeneratorResult> {
  const id = "symptom-weekday";
  const analytics = await getSymptomAnalytics(userId, fuso, 90);

  const eligible = analytics.severityByWeekday.filter((d) => d.count >= MIN_OCCURRENCES);
  if (eligible.length < 2) {
    return {
      id,
      missing: `Registre sintomas em pelo menos ${MIN_OCCURRENCES} ocasiões em dois dias da semana diferentes para comparar os dias.`,
    };
  }

  const sorted = [...eligible].sort((a, b) => b.averageSeverity - a.averageSeverity);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  if (worst.averageSeverity - best.averageSeverity < 1) {
    return {
      id,
      missing:
        "Seus sintomas têm severidade parecida em todos os dias da semana registrados — ainda não há um dia que se destaque.",
    };
  }

  return {
    id,
    sampleSize: eligible.reduce((sum, d) => sum + d.count, 0),
    pattern:
      `Na ${WEEKDAY_NAMES[worst.weekday]} seus sintomas têm severidade média ${worst.averageSeverity.toFixed(1)} ` +
      `(${plural(worst.count, "registro", "registros")}). Na ${WEEKDAY_NAMES[best.weekday]}, ${best.averageSeverity.toFixed(1)} ` +
      `(${plural(best.count, "registro", "registros")}).`,
    meaning: `A ${WEEKDAY_NAMES[worst.weekday]} é o dia com sintomas mais intensos nos seus registros. Planejar esse dia com mais folga e apoios pode ajudar.`,
    action: { label: "Ver rotinas do dia", route: "/routines" },
  };
}

/** 3. Efetividade das intervenções × tipo de sintoma. */
async function interventionBySymptomType(userId: number, fuso: number): Promise<GeneratorResult> {
  const id = "intervention-symptom";
  const analytics = await getSymptomAnalytics(userId, fuso, 90);

  const eligible = analytics.effectivenessBySymptomType.filter((t) => t.count >= MIN_OCCURRENCES);
  if (eligible.length === 0) {
    const registrados = analytics.interventionsLoggedCount;
    return {
      id,
      missing: `Você registrou intervenção com nota de efetividade ${plural(registrados, "vez", "vezes")}. São necessárias ${MIN_OCCURRENCES} no mesmo tipo de sintoma para avaliar o que funciona.`,
    };
  }

  const sorted = [...eligible].sort((a, b) => b.averageEffectiveness - a.averageEffectiveness);
  const bestType = sorted[0];
  const worstType = sorted[sorted.length - 1];

  const pattern =
    `Em ${symptomLabel(bestType.symptomType)}, suas intervenções tiveram efetividade média ` +
    `${bestType.averageEffectiveness.toFixed(1)}/10 (${plural(bestType.count, "registro", "registros")}).` +
    (sorted.length > 1
      ? ` Em ${symptomLabel(worstType.symptomType)}, ${worstType.averageEffectiveness.toFixed(1)}/10 (${plural(worstType.count, "registro", "registros")}).`
      : "");

  return {
    id,
    sampleSize: eligible.reduce((sum, t) => sum + t.count, 0),
    pattern,
    meaning:
      sorted.length > 1 && bestType.averageEffectiveness - worstType.averageEffectiveness >= 1
        ? `O que você tem feito funciona melhor para ${symptomLabel(bestType.symptomType)} do que para ${symptomLabel(worstType.symptomType)}. Pode valer testar outras técnicas para o segundo caso.`
        : `As intervenções que você registrou para ${symptomLabel(bestType.symptomType)} são as mais bem avaliadas até agora.`,
    action: { label: "Ver biblioteca de técnicas", route: "/techniques" },
  };
}

/** 4. Gatilho × severidade do sintoma no mesmo registro. */
async function triggerVsSymptom(userId: number, fuso: number): Promise<GeneratorResult> {
  const id = "trigger-symptom";
  const analytics = await getSymptomAnalytics(userId, fuso, 90);

  const eligible = analytics.topTriggers.filter((t) => t.count >= MIN_OCCURRENCES);
  if (eligible.length === 0) {
    return {
      id,
      missing: `Nenhum gatilho foi registrado junto com um sintoma ${MIN_OCCURRENCES} vezes ainda. Anote os gatilhos ao registrar sintomas para ver essa relação.`,
    };
  }

  const worst = [...eligible].sort((a, b) => b.averageSeverity - a.averageSeverity)[0];

  return {
    id,
    sampleSize: worst.count,
    pattern: `Quando "${worst.trigger}" aparece nos seus registros de sintoma (${plural(worst.count, "vez", "vezes")}), a severidade média é ${worst.averageSeverity.toFixed(1)}/10.`,
    meaning: `"${worst.trigger}" é o gatilho associado aos seus sintomas mais intensos. Ter uma estratégia preparada para ele pode reduzir o impacto.`,
    action: { label: "Registrar estratégia para este gatilho", route: "/triggers" },
  };
}

/**
 * 6. Duração típica dos episódios, por tipo de sintoma.
 *
 * Agrupa só por tipo — a duração média não depende de fronteira de dia.
 */
async function symptomDuration(userId: number, fuso: number): Promise<GeneratorResult> {
  const id = "symptom-duration";
  const analytics = await getSymptomAnalytics(userId, fuso, 90);

  const eligible = analytics.durationBySymptomType.filter((d) => d.count >= MIN_OCCURRENCES);
  if (eligible.length === 0) {
    return {
      id,
      missing: `Você anotou a duração em ${plural(analytics.durationLoggedCount, "registro", "registros")}. São necessários ${MIN_OCCURRENCES} no mesmo tipo de sintoma para calcular a duração típica.`,
    };
  }

  const maisLongo = [...eligible].sort((a, b) => b.averageDuration - a.averageDuration)[0];

  return {
    id,
    sampleSize: maisLongo.count,
    pattern: `Seus episódios de ${symptomLabel(maisLongo.symptomType)} duram em média ${plural(maisLongo.averageDuration, "minuto", "minutos")} (${plural(maisLongo.count, "registro", "registros")}).`,
    meaning: `É o tipo de sintoma que ocupa mais tempo entre os que você registrou. Saber a duração típica ajuda a planejar pausas e a avaliar se uma intervenção encurtou o episódio.`,
    action: { label: "Ver meus registros", route: "/symptoms" },
  };
}

/** 5. Técnica com melhor efetividade autorrelatada. */
async function mostEffectiveTechnique(userId: number): Promise<GeneratorResult> {
  const id = "technique-effectiveness";
  const analytics = await getTechniqueAnalytics(userId);

  const best = analytics.mostEffective[0];
  if (!best || best.effectiveness == null) {
    return {
      id,
      missing:
        "Nenhuma técnica foi avaliada ainda. Ao usar uma técnica, registre a efetividade para descobrir quais funcionam melhor para você.",
    };
  }

  const rated = analytics.mostEffective.length;

  return {
    id,
    sampleSize: best.usageCount,
    pattern: `Você avaliou "${best.title}" com efetividade ${best.effectiveness}/10, após usá-la ${plural(best.usageCount, "vez", "vezes")}.`,
    // Chamar de "a mais bem avaliada" quando só existe uma avaliação seria
    // uma comparação sem termo de comparação.
    meaning:
      rated === 1
        ? "É a única técnica que você avaliou até agora. Avaliar outras permite comparar o que funciona melhor para você."
        : `É a mais bem avaliada entre as ${rated} técnicas que você avaliou. Vale mantê-la à mão nos momentos difíceis.`,
    action: { label: "Abrir esta técnica", route: "/techniques" },
  };
}

/**
 * 7. Padrão de respiração com melhor avaliação.
 *
 * Só compara padrões com pelo menos MIN_OCCURRENCES avaliações — abaixo
 * disso "o melhor padrão" seria uma opinião de um dia só.
 */
async function breathingEffectiveness(userId: number): Promise<GeneratorResult> {
  const id = "breathing-effectiveness";
  const analytics = await getExerciseAnalytics(userId);

  const elegiveis = analytics.byPattern.filter(
    (p) => p.averageRating != null && p.ratedSessions >= MIN_OCCURRENCES
  );

  if (elegiveis.length === 0) {
    return {
      id,
      missing:
        analytics.totalSessions === 0
          ? `Você ainda não fez nenhum exercício de respiração. Ao terminar um, responda se ajudou: com ${MIN_OCCURRENCES} respostas no mesmo padrão dá para dizer qual funciona melhor para você.`
          : `Você fez ${plural(analytics.totalSessions, "exercício", "exercícios")} de respiração e avaliou ${analytics.ratedSessions}. São necessárias ${MIN_OCCURRENCES} avaliações do mesmo padrão para comparar.`,
    };
  }

  const melhor = elegiveis[0];
  const minutos = Math.round(melhor.averageDurationSeconds / 60);

  return {
    id,
    sampleSize: melhor.ratedSessions,
    pattern: `Você avaliou o padrão ${melhor.pattern} em ${melhor.averageRating}/10, depois de ${plural(melhor.ratedSessions, "sessão avaliada", "sessões avaliadas")}.`,
    meaning:
      elegiveis.length === 1
        ? `É o único padrão que você avaliou o suficiente para comparar. As sessões duram em média ${plural(minutos, "minuto", "minutos")}.`
        : `É o padrão mais bem avaliado entre os ${elegiveis.length} que você praticou, com sessões de ${plural(minutos, "minuto", "minutos")} em média.`,
    action: { label: "Praticar este padrão", route: "/breathing" },
  };
}

/**
 * 8. Humor por período do dia.
 *
 * Exige MIN_OCCURRENCES registros em cada uma de duas faixas — comparar
 * "manhã" com um registro só contra "noite" com vinte não é comparação.
 */
async function moodByTimeOfDay(userId: number, fuso: number): Promise<GeneratorResult> {
  const id = "mood-time-of-day";
  const analytics = await getMoodByTimeOfDay(userId, fuso, 90);

  const eligible = analytics.byTimeOfDay.filter((f) => f.count >= MIN_OCCURRENCES);
  if (eligible.length < 2) {
    return {
      id,
      missing: `Registre humor pelo menos ${MIN_OCCURRENCES} vezes em dois períodos diferentes do dia (manhã, tarde, noite ou madrugada) para comparar os períodos. Você tem ${plural(analytics.totalEntries, "registro", "registros")} nos últimos 90 dias.`,
    };
  }

  const ordenado = [...eligible].sort((a, b) => b.averageMood - a.averageMood);
  const melhor = ordenado[0];
  const pior = ordenado[ordenado.length - 1];

  if (melhor.averageMood - pior.averageMood < 1) {
    return {
      id,
      missing:
        "Seu humor médio é parecido em todos os períodos do dia registrados — nenhum se destaca até agora.",
    };
  }

  return {
    id,
    sampleSize: eligible.reduce((soma, f) => soma + f.count, 0),
    pattern: `De ${melhor.label.toLowerCase()}, seu humor médio é ${melhor.averageMood.toFixed(1)} (${plural(melhor.count, "registro", "registros")}). De ${pior.label.toLowerCase()}, ${pior.averageMood.toFixed(1)} (${plural(pior.count, "registro", "registros")}).`,
    meaning: `${pior.label} é o período em que seu humor aparece mais baixo nos seus registros. Vale deixar as tarefas mais pesadas para ${melhor.label.toLowerCase()} e reservar apoios para ${pior.label.toLowerCase()}.`,
    action: { label: "Ver minhas rotinas", route: "/routines" },
  };
}

export async function generateInsights(userId: number, timezoneOffsetMinutes: number) {
  const fuso = timezoneOffsetMinutes;
  const results = await Promise.all([
    routineVsMood(userId, fuso),
    symptomByWeekday(userId, fuso),
    interventionBySymptomType(userId, fuso),
    triggerVsSymptom(userId, fuso),
    mostEffectiveTechnique(userId),
    symptomDuration(userId, fuso),
    breathingEffectiveness(userId),
    moodByTimeOfDay(userId, fuso),
  ]);

  return {
    insights: results.filter(isInsight),
    missing: results.filter((r): r is MissingData => !isInsight(r)),
  };
}
