import PlannerLayout from "@/components/planner/PlannerLayout";
import { useEntity, useHoje } from "@/components/planner/usePlanner";
import { BarraProgresso, Board, Bloco, Gallery, RecordList, useEditor, ViewTabs } from "@/components/planner/views";
import { Counter, SpotifyEmbed } from "@/components/planner/widgets";
import { grupoLeitura, progressoCurso, progressoLivro } from "@shared/planner";
import { useState } from "react";

type Galeria = "Lendo" | "A ler" | "Lido";
const STATUS_DA_GALERIA: Record<Galeria, string> = { Lendo: "Lendo", "A ler": "Não iniciado", Lido: "Concluído" };

/** Área "Estudos/Leitura" — Leitura, Cursos, Estudos Gerais + contador e Spotify. */
export default function PlannerEstudos() {
  const hoje = useHoje();
  const livros = useEntity("livros");
  const cursos = useEntity("cursos");
  const estudos = useEntity("estudos");
  const edLivro = useEditor("livros");
  const edCurso = useEditor("cursos");
  const edEstudo = useEditor("estudos");
  const [galeria, setGaleria] = useState<Galeria>("Lendo");

  const contagem = (g: Galeria) => livros.rows.filter((l) => grupoLeitura(l.status) === g).length;
  const vistos = [...estudos.rows].sort((a, b) => String(b.visto ?? "").localeCompare(String(a.visto ?? "")));

  return (
    <PlannerLayout titulo="📕 Estudos/Leitura">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Bloco titulo="Leitura">
            <ViewTabs
              views={(["Lendo", "A ler", "Lido"] as Galeria[]).map((g) => ({ id: g, label: g, count: contagem(g) }))}
              value={galeria}
              onChange={setGaleria}
            />
            <Gallery
              entity="livros"
              rows={livros.rows.filter((l) => grupoLeitura(l.status) === galeria)}
              props={["autor", "categoria", "classificacao", "terminado"]}
              onOpen={edLivro.abrir}
              onNew={() => edLivro.novo({ status: STATUS_DA_GALERIA[galeria] })}
              extra={(r) => (
                <span>
                  {r.totalPaginas ? (
                    <span className="text-gray-500">
                      {(r.paginasLidas as number) ?? 0}/{r.totalPaginas as number} págs.
                    </span>
                  ) : null}
                  <BarraProgresso valor={progressoLivro(r)} />
                </span>
              )}
              vazio={galeria === "Lendo" ? "Nenhum livro em andamento." : "Nenhum livro aqui."}
            />
          </Bloco>

          <Bloco titulo="Cursos">
            <Board
              entity="cursos"
              rows={cursos.rows}
              groupBy="status"
              props={["area", "classificacao", "concluidoEm"]}
              onOpen={edCurso.abrir}
              onNew={edCurso.novo}
              extra={(r) => (
                <span>
                  {r.aulasTotais ? (
                    <span className="text-gray-500">
                      {(r.aulasAssistidas as number) ?? 0}/{r.aulasTotais as number} aulas
                    </span>
                  ) : null}
                  <BarraProgresso valor={progressoCurso(r)} />
                </span>
              )}
            />
          </Bloco>

          <Bloco titulo="Estudos Gerais">
            <RecordList
              entity="estudos"
              rows={vistos}
              props={["tipo", "area", "visto", "url", "anexo"]}
              onOpen={edEstudo.abrir}
              onNew={() => edEstudo.novo({ visto: hoje })}
              vazio="Mentorias, podcasts e vídeos que você viu entram aqui."
            />
          </Bloco>
        </div>

        <aside className="space-y-4">
          <Counter hoje={hoje} />
          <SpotifyEmbed />
        </aside>
      </div>

      {edLivro.dialog}
      {edCurso.dialog}
      {edEstudo.dialog}
    </PlannerLayout>
  );
}
