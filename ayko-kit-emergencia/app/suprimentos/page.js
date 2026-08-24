"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";

const STATUS_LABEL = {
  pendente: "Pendente",
  separando: "Separando",
  separado: "Separado",
  pronto_retirada: "Pronto p/ retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
  bloqueado: "Bloqueado",
};
const STATUS_COLOR = {
  pendente: "bg-orange/15 text-orange",
  separando: "bg-blue/15 text-blue",
  separado: "bg-blue/15 text-blue",
  pronto_retirada: "bg-purple/15 text-purple",
  entregue: "bg-green/15 text-green",
  cancelado: "bg-red/15 text-red",
  bloqueado: "bg-red/15 text-red",
};
const PROXIMO_STATUS = {
  pendente: "separando",
  separando: "separado",
  separado: "pronto_retirada",
  pronto_retirada: "entregue",
};
const BOTAO_LABEL = {
  pendente: "Iniciar separação",
  separando: "Marcar como separado",
  separado: "Marcar como pronto p/ retirada",
  pronto_retirada: "Confirmar entrega",
};

export default function SuprimentosPage() {
  const supabase = createClient();
  const [ativas, setAtivas] = useState([]);
  const [entregues, setEntregues] = useState([]);
  const [identificacaoInput, setIdentificacaoInput] = useState({});
  const [agruparPor, setAgruparPor] = useState("tecnico"); // "tecnico" | "dupla"
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: ativasData } = await supabase
      .from("reposicoes")
      .select(
        "id, status, quantidade, created_at, chamado_halo_id, codigo_retirada, identificacao_novo_item, tipo, material_nome_livre, kits(nome), item_tipos(nome, requer_identificacao), duplas(nome), profiles!solicitado_por(nome)"
      )
      .in("status", ["pendente", "separando", "separado", "pronto_retirada"])
      .order("created_at", { ascending: false });
    setAtivas(ativasData || []);

    const { data: entreguesData } = await supabase
      .from("reposicoes")
      .select(
        "id, status, quantidade, atendida_at, chamado_halo_id, codigo_retirada, identificacao_novo_item, material_nome_livre, kits(nome), item_tipos(nome), duplas(nome), profiles!solicitado_por(nome)"
      )
      .eq("status", "entregue")
      .order("atendida_at", { ascending: false })
      .limit(15);
    setEntregues(entreguesData || []);
  }

  async function avancarStatus(reposicao) {
    const proximo = PROXIMO_STATUS[reposicao.status];
    if (!proximo) return;

    // ao confirmar a entrega de um item que exige identificação
    // (patrimônio/série), exige que o Suprimentos já tenha informado
    const identificacao = identificacaoInput[reposicao.id];
    if (proximo === "entregue" && reposicao.item_tipos?.requer_identificacao && !identificacao) {
      alert("Informe o número de patrimônio/identificação do item antes de confirmar a entrega.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const payload = { status: proximo, atendida_por: user.id };
    if (identificacao) payload.identificacao_novo_item = identificacao;

    const { error } = await supabase.from("reposicoes").update(payload).eq("id", reposicao.id);
    if (error) {
      alert("Erro ao avançar status: " + error.message);
      return;
    }
    carregar();
  }

  async function cancelar(id) {
    if (!confirm("Cancelar esta reposição?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("reposicoes")
      .update({ status: "cancelado", atendida_por: user.id })
      .eq("id", id);
    if (error) {
      alert("Erro ao cancelar: " + error.message);
      return;
    }
    carregar();
  }

  return (
    <main className="pb-16 max-w-3xl mx-auto">
      <TopBar titulo="Reposições" subtitulo="Fila de reposição dos kits emergência" />

      <section className="p-6">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Agrupar por</label>
            <select
              value={agruparPor}
              onChange={(e) => { setAgruparPor(e.target.value); setFiltro(""); }}
              className="rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple"
            >
              <option value="tecnico">Técnico</option>
              <option value="dupla">Dupla</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {agruparPor === "tecnico" ? "Ver só um técnico" : "Ver só uma dupla"}
            </label>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple min-w-[200px]"
            >
              <option value="">Todos</option>
              {[...new Set(
                ativas.map((r) => (agruparPor === "tecnico" ? r.profiles?.nome : r.duplas?.nome)).filter(Boolean)
              )].map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="text-sm font-medium text-slate-400 mb-3">Ativas ({ativas.length})</h2>
        {ativas.length === 0 && <p className="text-sm text-slate-500">Nenhuma pendência no momento.</p>}

        {Object.entries(
          ativas
            .filter((r) => {
              const chave = agruparPor === "tecnico" ? r.profiles?.nome : r.duplas?.nome;
              return !filtro || chave === filtro;
            })
            .reduce((grupos, r) => {
              const chave = (agruparPor === "tecnico" ? r.profiles?.nome : r.duplas?.nome) || "Não identificado";
              grupos[chave] = grupos[chave] || [];
              grupos[chave].push(r);
              return grupos;
            }, {})
        ).map(([chave, itensGrupo]) => (
          <div key={chave} className="mb-6">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">
              {chave} · {itensGrupo.length}
            </p>
            <div className="space-y-2">
          {itensGrupo.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-purple font-semibold text-sm">{r.profiles?.nome || "Técnico não identificado"}</p>
                  <p className="text-xs text-slate-400">{r.duplas?.nome || r.kits?.nome}</p>
                </div>
                <span className={`badge ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
              </div>

              {r.tipo === "extraordinaria" && (
                <span className="badge bg-cyan/15 text-cyan mb-2">Extraordinária</span>
              )}

              <p className="font-medium text-sm mb-1">{r.item_tipos?.nome || r.material_nome_livre} × {r.quantidade}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <span>{r.kits?.nome} · {new Date(r.created_at).toLocaleString("pt-BR")}</span>
                {r.codigo_retirada && <span className="font-mono text-purple">Código: {r.codigo_retirada}</span>}
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Chamado no Halo: <span className="font-mono text-slate-300">{r.chamado_halo_id || "—"}</span>
              </p>

              {r.item_tipos?.requer_identificacao && (
                <input
                  type="text"
                  placeholder="Nº de patrimônio / identificação do item que está repondo"
                  defaultValue={r.identificacao_novo_item || ""}
                  onChange={(e) => setIdentificacaoInput({ ...identificacaoInput, [r.id]: e.target.value })}
                  className="w-full mb-2 rounded-lg bg-bg border border-border px-3 py-2 text-xs outline-none focus:border-purple"
                />
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => avancarStatus(r)}
                  className="flex-1 rounded-lg bg-purple text-white text-xs font-medium px-4 py-2 whitespace-nowrap"
                >
                  {BOTAO_LABEL[r.status]}
                </button>
                <button onClick={() => cancelar(r.id)} className="text-xs text-red hover:underline px-2">
                  Cancelar
                </button>
              </div>
            </div>
          ))}
            </div>
          </div>
        ))}
      </section>

      <section className="px-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Entregues recentemente</h2>
        <div className="space-y-2">
          {entregues.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm">
              <div>
                <span className="font-medium">{r.item_tipos?.nome || r.material_nome_livre} × {r.quantidade}</span>
                <span className="text-slate-500"> · {r.profiles?.nome} ({r.duplas?.nome})</span>
                {r.identificacao_novo_item && (
                  <span className="text-slate-500"> · {r.identificacao_novo_item}</span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {r.chamado_halo_id ? `Halo #${r.chamado_halo_id} · ` : ""}
                {r.atendida_at ? new Date(r.atendida_at).toLocaleDateString("pt-BR") : ""}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
