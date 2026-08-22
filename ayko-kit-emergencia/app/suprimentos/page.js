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
  const [chamadoInput, setChamadoInput] = useState({});

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: ativasData } = await supabase
      .from("reposicoes")
      .select("id, status, quantidade, created_at, chamado_halo_id, codigo_retirada, kits(nome), item_tipos(nome), duplas(nome), profiles!solicitado_por(nome)")
      .in("status", ["pendente", "separando", "separado", "pronto_retirada"])
      .order("created_at", { ascending: false });
    setAtivas(ativasData || []);

    const { data: entreguesData } = await supabase
      .from("reposicoes")
      .select("id, status, quantidade, atendida_at, chamado_halo_id, codigo_retirada, kits(nome), item_tipos(nome), duplas(nome), profiles!solicitado_por(nome)")
      .eq("status", "entregue")
      .order("atendida_at", { ascending: false })
      .limit(15);
    setEntregues(entreguesData || []);
  }

  async function avancarStatus(reposicao) {
    const proximo = PROXIMO_STATUS[reposicao.status];
    if (!proximo) return;

    const { data: { user } } = await supabase.auth.getUser();

    const payload = { status: proximo, atendida_por: user.id };
    if (chamadoInput[reposicao.id]) payload.chamado_halo_id = chamadoInput[reposicao.id];

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
        <h2 className="text-sm font-medium text-slate-400 mb-3">Ativas ({ativas.length})</h2>
        {ativas.length === 0 && <p className="text-sm text-slate-500">Nenhuma pendência no momento.</p>}
        <div className="space-y-2">
          {ativas.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-purple font-semibold text-sm">{r.profiles?.nome || "Técnico não identificado"}</p>
                  <p className="text-xs text-slate-400">{r.duplas?.nome || r.kits?.nome}</p>
                </div>
                <span className={`badge ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
              </div>

              <p className="font-medium text-sm mb-1">{r.item_tipos?.nome} × {r.quantidade}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <span>{r.kits?.nome} · {new Date(r.created_at).toLocaleString("pt-BR")}</span>
                {r.codigo_retirada && <span className="font-mono text-purple">Código: {r.codigo_retirada}</span>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nº do chamado no Halo (se ainda não informado)"
                  defaultValue={r.chamado_halo_id || ""}
                  onChange={(e) => setChamadoInput({ ...chamadoInput, [r.id]: e.target.value })}
                  className="flex-1 rounded-lg bg-bg border border-border px-3 py-2 text-xs outline-none focus:border-purple"
                />
                <button
                  onClick={() => avancarStatus(r)}
                  className="rounded-lg bg-purple text-white text-xs font-medium px-4 py-2 whitespace-nowrap"
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
      </section>

      <section className="px-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Entregues recentemente</h2>
        <div className="space-y-2">
          {entregues.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm">
              <div>
                <span className="font-medium">{r.item_tipos?.nome} × {r.quantidade}</span>
                <span className="text-slate-500"> · {r.profiles?.nome} ({r.duplas?.nome})</span>
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
