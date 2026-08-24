"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

const STATUS_REPOSICAO_LABEL = {
  pendente: "Novas",
  separando: "Em separação",
  separado: "Em separação",
  pronto_retirada: "Prontas / aguardando retirada",
  entregue: "Entregues",
  cancelado: "Canceladas",
  bloqueado: "Bloqueadas",
};

const LIMITE_ATRASO_HORAS = 24;

function horasEntre(a, b) {
  return (new Date(b) - new Date(a)) / 1000 / 60 / 60;
}

export default function GestaoPage() {
  const supabase = createClient();
  const [carregando, setCarregando] = useState(true);

  const [kitsResumo, setKitsResumo] = useState({ total: 0, regulares: 0, pendencia: 0, danificado: 0 });
  const [reposicoesResumo, setReposicoesResumo] = useState({});
  const [materiaisMaisUsados, setMateriaisMaisUsados] = useState([]);
  const [consumoPorDupla, setConsumoPorDupla] = useState([]);
  const [pendenciasPorKit, setPendenciasPorKit] = useState([]);
  const [atrasadas, setAtrasadas] = useState([]);
  const [historicoPatrimonio, setHistoricoPatrimonio] = useState([]);
  const [tempoAtendimento, setTempoAtendimento] = useState({ media: null, maior: null, atrasadas: 0, concluidas: 0 });

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    // ---- KITS ----
    const { data: kitsData } = await supabase
      .from("kits")
      .select("id, nome, kit_item_instancias(status)");

    let regulares = 0, pendencia = 0, danificado = 0;
    const pendenciasKit = [];
    (kitsData || []).forEach((k) => {
      const instancias = k.kit_item_instancias || [];
      const temDanificado = instancias.some((i) => i.status === "danificado");
      const temFaltando = instancias.some((i) => i.status === "faltando");
      if (temDanificado) {
        danificado++;
        pendenciasKit.push({ nome: k.nome, motivo: "item danificado" });
      } else if (temFaltando) {
        pendencia++;
        pendenciasKit.push({ nome: k.nome, motivo: "item faltando" });
      } else {
        regulares++;
      }
    });
    setKitsResumo({ total: (kitsData || []).length, regulares, pendencia, danificado });
    setPendenciasPorKit(pendenciasKit);

    // ---- REPOSIÇÕES por status ----
    const { data: reposicoesData } = await supabase
      .from("reposicoes")
      .select("id, status, created_at, atendida_at, item_tipos(nome), duplas(nome)");

    const resumoStatus = {};
    (reposicoesData || []).forEach((r) => {
      const chave = STATUS_REPOSICAO_LABEL[r.status] || r.status;
      resumoStatus[chave] = (resumoStatus[chave] || 0) + 1;
    });
    setReposicoesResumo(resumoStatus);

    // materiais mais utilizados (todas as reposições = consumo real)
    const contagemMaterial = {};
    (reposicoesData || []).forEach((r) => {
      const nome = r.item_tipos?.nome || "—";
      contagemMaterial[nome] = (contagemMaterial[nome] || 0) + 1;
    });
    setMateriaisMaisUsados(
      Object.entries(contagemMaterial).sort((a, b) => b[1] - a[1]).slice(0, 8)
    );

    // consumo por dupla
    const contagemDupla = {};
    (reposicoesData || []).forEach((r) => {
      const nome = r.duplas?.nome || "—";
      contagemDupla[nome] = (contagemDupla[nome] || 0) + 1;
    });
    setConsumoPorDupla(
      Object.entries(contagemDupla).sort((a, b) => b[1] - a[1]).slice(0, 8)
    );

    // solicitações atrasadas: ainda não entregues/canceladas e abertas há mais de X horas
    const agora = new Date();
    const abertasAtrasadas = (reposicoesData || []).filter(
      (r) =>
        !["entregue", "cancelado"].includes(r.status) &&
        horasEntre(r.created_at, agora) > LIMITE_ATRASO_HORAS
    );
    setAtrasadas(abertasAtrasadas);

    // ---- TEMPO DE ATENDIMENTO (via histórico de status) ----
    const { data: historico } = await supabase
      .from("reposicoes_status_historico")
      .select("reposicao_id, status_novo, created_at")
      .order("created_at");

    const porReposicao = {};
    (historico || []).forEach((h) => {
      porReposicao[h.reposicao_id] = porReposicao[h.reposicao_id] || {};
      if (!porReposicao[h.reposicao_id][h.status_novo]) {
        porReposicao[h.reposicao_id][h.status_novo] = h.created_at;
      }
    });

    const duracoes = [];
    Object.values(porReposicao).forEach((etapas) => {
      if (etapas.pendente && etapas.entregue) {
        duracoes.push(horasEntre(etapas.pendente, etapas.entregue));
      }
    });

    setTempoAtendimento({
      media: duracoes.length ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : null,
      maior: duracoes.length ? Math.max(...duracoes) : null,
      concluidas: duracoes.length,
      atrasadas: abertasAtrasadas.length,
    });

    // ---- HISTÓRICO DE ALTERAÇÃO DE PATRIMÔNIO ----
    const { data: auditoriaPatrimonio } = await supabase
      .from("auditoria")
      .select("id, dados, created_at, profiles(nome)")
      .eq("acao", "alterar_patrimonio")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistoricoPatrimonio(auditoriaPatrimonio || []);

    setCarregando(false);
  }

  function formatarHoras(h) {
    if (h === null || h === undefined) return "—";
    if (h < 1) return `${Math.round(h * 60)} min`;
    return `${h.toFixed(1)} h`;
  }

  if (carregando) {
    return (
      <main>
        <TopBar titulo="Gestão" subtitulo="Visão operacional" />
        <p className="p-6 text-slate-400">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="pb-16">
      <TopBar titulo="Gestão" subtitulo="Visão operacional dos kits, reposições e atendimento" />

      {/* KITS */}
      <section className="p-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Kits</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Total</p>
            <p className="text-2xl font-semibold">{kitsResumo.total}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Regulares</p>
            <p className="text-2xl font-semibold text-green">{kitsResumo.regulares}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Com pendência</p>
            <p className="text-2xl font-semibold text-orange">{kitsResumo.pendencia}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Com item danificado</p>
            <p className="text-2xl font-semibold text-red">{kitsResumo.danificado}</p>
          </div>
        </div>
      </section>

      {/* REPOSIÇÕES */}
      <section className="px-6 mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Reposições</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["Novas", "Em separação", "Prontas / aguardando retirada", "Entregues"].map((label) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-2xl font-semibold">{reposicoesResumo[label] || 0}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEMPO DE ATENDIMENTO */}
      <section className="px-6 mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Tempo de atendimento</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Tempo médio (pendente → entregue)</p>
            <p className="text-xl font-semibold">{formatarHoras(tempoAtendimento.media)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Maior tempo registrado</p>
            <p className="text-xl font-semibold">{formatarHoras(tempoAtendimento.maior)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Concluídas (com tempo medido)</p>
            <p className="text-xl font-semibold">{tempoAtendimento.concluidas}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Em aberto há mais de {LIMITE_ATRASO_HORAS}h</p>
            <p className="text-xl font-semibold text-red">{tempoAtendimento.atrasadas}</p>
          </div>
        </div>
      </section>

      {/* CONSUMO */}
      <section className="px-6 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Materiais mais utilizados</h2>
          <div className="space-y-2">
            {materiaisMaisUsados.map(([nome, qtd]) => (
              <div key={nome} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5 text-sm">
                <span>{nome}</span>
                <span className="text-purple font-medium">{qtd}</span>
              </div>
            ))}
            {materiaisMaisUsados.length === 0 && <p className="text-sm text-slate-500">Sem dados ainda.</p>}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Consumo por dupla</h2>
          <div className="space-y-2">
            {consumoPorDupla.map(([nome, qtd]) => (
              <div key={nome} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5 text-sm">
                <span>{nome}</span>
                <span className="text-purple font-medium">{qtd}</span>
              </div>
            ))}
            {consumoPorDupla.length === 0 && <p className="text-sm text-slate-500">Sem dados ainda.</p>}
          </div>
        </div>
      </section>

      {/* PENDÊNCIAS */}
      <section className="px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Kits com pendência</h2>
          <div className="space-y-2">
            {pendenciasPorKit.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5 text-sm">
                <span>{p.nome}</span>
                <span className={`badge ${p.motivo === "item danificado" ? "bg-red/15 text-red" : "bg-orange/15 text-orange"}`}>
                  {p.motivo}
                </span>
              </div>
            ))}
            {pendenciasPorKit.length === 0 && <p className="text-sm text-slate-500">Nenhum kit com pendência agora.</p>}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Solicitações atrasadas (+{LIMITE_ATRASO_HORAS}h em aberto)</h2>
          <div className="space-y-2">
            {atrasadas.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5 text-sm">
                <span>{r.item_tipos?.nome} · {r.duplas?.nome}</span>
                <span className="text-red text-xs">{formatarHoras(horasEntre(r.created_at, new Date()))}</span>
              </div>
            ))}
            {atrasadas.length === 0 && <p className="text-sm text-slate-500">Nenhuma solicitação atrasada.</p>}
          </div>
        </div>
      </section>

      {/* HISTÓRICO DE PATRIMÔNIO */}
      <section className="px-6 mt-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Últimas alterações de patrimônio</h2>
        <div className="space-y-2">
          {historicoPatrimonio.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-lg px-4 py-2.5 text-sm">
              <p>
                Alterado de <span className="font-mono text-slate-300">{a.dados?.valor_anterior || "—"}</span> para{" "}
                <span className="font-mono text-purple">{a.dados?.valor_novo || "—"}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {a.profiles?.nome || "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
          {historicoPatrimonio.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma alteração de patrimônio registrada ainda.</p>
          )}
        </div>
      </section>
    </main>
  );
}
