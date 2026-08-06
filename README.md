# Apoio Autismo — Autism Support Tracker

Webapp de suporte ao bem-estar para pessoas no espectro autista: diário de humor, gatilhos sensoriais, rotinas gamificadas, exercícios de respiração, análises/previsões, modo de crise com botão SOS, lembretes inteligentes e notificações.

## Stack

- **Frontend**: React 18 + Vite + TypeScript, wouter, Tailwind CSS + shadcn/ui, Chart.js
- **Backend**: Express + tRPC v11, Drizzle ORM + SQLite (better-sqlite3)
- **Auth**: e-mail/senha (bcrypt) com sessão via cookie JWT
- **Testes**: Vitest

## Rodando localmente

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173 (proxy da API para :3000)
- API: http://localhost:3000/api/trpc

O banco SQLite é criado automaticamente em `data/app.db` na primeira execução, com seeds de badges, desafios semanais, técnicas de crise e recompensas.

## Produção

```bash
npm run build   # gera client/dist
npm start       # serve API + frontend em :3000
```

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor + Vite em modo dev |
| `npm run build` | Build de produção do frontend |
| `npm start` | Servidor de produção (API + estáticos) |
| `npm test` | Testes (Vitest) |
| `npm run check` | Typecheck (tsc) |

## Variáveis de ambiente (opcionais)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta do servidor |
| `DATABASE_PATH` | `data/app.db` | Caminho do arquivo SQLite |
| `JWT_SECRET` | (dev) | Segredo de assinatura da sessão — defina em produção |
| `VITE_VAPID_PUBLIC_KEY` | — | Chave pública VAPID para push notifications reais |

## Funcionalidades

- **Diário de Humor** — humor, ansiedade, estresse e energia (1–10), gatilhos e notas; calendário mensal com código de cores
- **Gatilhos Sensoriais** — catálogo com categoria, severidade e estratégias de enfrentamento
- **Rotinas Diárias** — checklists com conclusão de tarefas, pontos, streaks e análise de adesão
- **Exercícios de Respiração** — padrões 4-4-4-4 e 4-7-8 com animação guiada
- **Análises** — padrões, correlações humor × gatilhos, previsões e tendências
- **Gamificação** — badges, desafios semanais, recompensas desbloqueáveis, níveis e ranking
- **Modo de Crise** — botão SOS sempre visível, técnicas rápidas de autorregulação, contatos de emergência e mensagens pré-escritas
- **Lembretes Inteligentes** — aprendem os melhores horários com base no seu uso
- **Exportação** — compartilhe dados com terapeutas e profissionais
