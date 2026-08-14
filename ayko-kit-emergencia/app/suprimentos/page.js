"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";

export default function SuprimentosPage() {
  const supabase = createClient();
  const [pendentes, setPendentes] = useState([]);
  const [atendidas, setAtendidas] = useState([]);
  const [chamadoInput, setChamadoInput] = useState({});

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: pend } = await supabase
      .from("reposicoes")
      .select("id, status, created_at, chamado_halo_id, kits(nome), item_tipos(nome), duplas(nome), profiles(nome)")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });
    setPendentes(pend || []);

    const { data: at } = await supabase
      .from("reposicoes")
      .select("id, status, atendida_at, chamado_halo_id, kits(nome), item_tipos(nome), duplas(nome), profiles(nome)")
      .eq("status", "atendida")
      .order("atendida_at", { ascending: false })
      .limit(15);
    setAtendidas(at || []);
  }

  async function marcarAtendida(id) {
    await supabase
      .from("reposicoes")
      .update({
        status: "atendida",
        atendida_at: new Date().toISOString(),
        chamado_halo_id: chamadoInput[id] || null,
      })
      .eq("id", id);
    carregar();
  }

  return (
    <main className="pb-16 max-w-3xl mx-auto">
      <TopBar titulo="Reposições" subtitulo="Fila de reposição dos kits emergência" />

      <section className="p-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">
          Pendentes ({pendentes.length})
        </h2>
        {pendentes.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma pendência no momento.</p>
        )}
        <div className="space-y-2">
          {pendentes.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-purple font-semibold text-sm">
                    {r.profiles?.nome || "Técnico não identificado"}
                  </p>
                  <p className="text-xs text-slate-400">{r.duplas?.nome || r.kits?.nome}</p>
                </div>
                {r.chamado_halo_id && (
                  <span className="badge bg-blue/15 text-blue">Halo #{r.chamado_halo_id}</span>
                )}
              </div>

              <p className="font-medium text-sm mb-1">{r.item_tipos?.nome}</p>
              <p className="text-xs text-slate-500 mb-3">
                {r.kits?.nome} · gerado em {new Date(r.created_at).toLocaleString("pt-BR")}
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nº do chamado no Halo (se ainda não informado)"
                  defaultValue={r.chamado_halo_id || ""}
                  onChange={(e) => setChamadoInput({ ...chamadoInput, [r.id]: e.target.value })}
                  className="flex-1 rounded-lg bg-bg border border-border px-3 py-2 text-xs outline-none focus:border-purple"
                />
                <button
                  onClick={() => marcarAtendida(r.id)}
                  className="rounded-lg bg-purple text-white text-xs font-medium px-4 py-2"
                >
                  Marcar como atendida
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Atendidas recentemente</h2>
        <div className="space-y-2">
          {atendidas.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium">{r.item_tipos?.nome}</span>
                <span className="text-slate-500"> · {r.profiles?.nome} ({r.duplas?.nome})</span>
              </div>
              <span className="text-xs text-slate-500">
                {r.chamado_halo_id ? `Halo #${r.chamado_halo_id} · ` : ""}
                {new Date(r.atendida_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
