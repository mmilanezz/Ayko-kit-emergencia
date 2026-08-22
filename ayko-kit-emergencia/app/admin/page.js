"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";

export default function AdminDashboard() {
  const supabase = createClient();
  const [carregando, setCarregando] = useState(true);
  const [kits, setKits] = useState([]);
  const [reposicoesPendentes, setReposicoesPendentes] = useState([]);
  const [conferenciasRecentes, setConferenciasRecentes] = useState([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data: kitsData } = await supabase
      .from("kits")
      .select("id, nome, kit_item_instancias(status)")
      .order("nome");
    setKits(kitsData || []);

    const { data: reposicoes } = await supabase
      .from("reposicoes")
      .select("id, status, created_at, kits(nome), item_tipos(nome), duplas(nome), profiles!solicitado_por(nome)")
      .in("status", ["pendente", "separando", "separado", "pronto_retirada"])
      .order("created_at", { ascending: false });
    setReposicoesPendentes(reposicoes || []);

    const { data: conferencias } = await supabase
      .from("conferencias")
      .select("id, tipo, created_at, duplas(nome), profiles(nome)")
      .order("created_at", { ascending: false })
      .limit(8);
    setConferenciasRecentes(conferencias || []);

    setCarregando(false);
  }

  function statusKit(kit) {
    const instancias = kit.kit_item_instancias || [];
    const problema = instancias.some((i) => i.status !== "ok");
    return problema ? "atenção" : "completo";
  }

  if (carregando) {
    return (
      <main>
        <TopBar titulo="Dashboard" />
        <p className="p-6 text-slate-400">Carregando...</p>
      </main>
    );
  }

  const kitsComProblema = kits.filter((k) => statusKit(k) === "atenção").length;

  return (
    <main>
      <TopBar titulo="Dashboard" subtitulo="Status dos kits em tempo real" />

      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-slate-400 mb-1">Kits totais</p>
          <p className="text-2xl font-semibold">{kits.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-slate-400 mb-1">Kits com pendência</p>
          <p className="text-2xl font-semibold text-orange">{kitsComProblema}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-slate-400 mb-1">Reposições pendentes</p>
          <p className="text-2xl font-semibold text-red">{reposicoesPendentes.length}</p>
        </div>
      </div>

      <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Status por kit</h2>
          <div className="space-y-2">
            {kits.map((kit) => (
              <div
                key={kit.id}
                className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm"
              >
                <span>{kit.nome}</span>
                <span
                  className={`badge ${
                    statusKit(kit) === "completo"
                      ? "bg-green/15 text-green"
                      : "bg-orange/15 text-orange"
                  }`}
                >
                  {statusKit(kit)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Reposições pendentes</h2>
          {reposicoesPendentes.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma pendência agora.</p>
          )}
          <div className="space-y-2">
            {reposicoesPendentes.map((r) => (
              <div
                key={r.id}
                className="bg-card border border-border rounded-lg px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{r.item_tipos?.nome}</span>
                  <span className="text-slate-500 text-xs">{r.kits?.nome}</span>
                </div>
                <p className="text-xs text-purple mb-2">
                  {r.profiles?.nome || "—"} · {r.duplas?.nome || ""}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                  <span
                    className={`badge ${
                      r.status === "pendente"
                        ? "bg-orange/15 text-orange"
                        : "bg-blue/15 text-blue"
                    }`}
                  >
                    {
                      { pendente: "Pendente", separando: "Separando", separado: "Separado", pronto_retirada: "Pronto p/ retirada" }[
                        r.status
                      ]
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-10">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Conferências recentes</h2>
        <div className="space-y-2">
          {conferenciasRecentes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm"
            >
              <span>
                {c.duplas?.nome} · {c.tipo === "recebimento" ? "Recebimento" : "Devolução"}
              </span>
              <span className="text-slate-500 text-xs">
                {c.profiles?.nome} · {new Date(c.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
