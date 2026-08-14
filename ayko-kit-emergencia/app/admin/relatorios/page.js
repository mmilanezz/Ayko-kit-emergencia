"use client";

import { useEffect, useState, Fragment } from "react";
import { createClient } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

const STATUS_LABEL = { ok: "OK", faltando: "Faltando", danificado: "Danificado" };

export default function RelatoriosPage() {
  const supabase = createClient();
  const [aba, setAba] = useState("conferencias");

  const [conferencias, setConferencias] = useState([]);
  const [reposicoes, setReposicoes] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [filtroDupla, setFiltroDupla] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [itensPorConferencia, setItensPorConferencia] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, [filtroDupla, filtroTipo]);

  async function carregar() {
    setCarregando(true);

    const { data: duplasData } = await supabase.from("duplas").select("*").order("nome");
    setDuplas(duplasData || []);

    let query = supabase
      .from("conferencias")
      .select("*, duplas(nome), profiles(nome), kits(nome)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filtroDupla) query = query.eq("dupla_id", filtroDupla);
    if (filtroTipo) query = query.eq("tipo", filtroTipo);

    const { data: conferenciasData } = await query;
    setConferencias(conferenciasData || []);

    const { data: reposicoesData } = await supabase
      .from("reposicoes")
      .select("*, kits(nome), item_tipos(nome), duplas(nome), profiles(nome)")
      .order("created_at", { ascending: false })
      .limit(200);
    setReposicoes(reposicoesData || []);

    setCarregando(false);
  }

  async function alternarExpandir(conferenciaId) {
    if (expandido === conferenciaId) {
      setExpandido(null);
      return;
    }
    setExpandido(conferenciaId);

    if (!itensPorConferencia[conferenciaId]) {
      const { data } = await supabase
        .from("conferencia_itens")
        .select("*, kit_item_instancias(item_tipos(nome))")
        .eq("conferencia_id", conferenciaId);
      setItensPorConferencia((prev) => ({ ...prev, [conferenciaId]: data || [] }));
    }
  }

  async function exportarExcel() {
    const XLSX = await import("xlsx");

    const resumo = conferencias.map((c) => ({
      Data: new Date(c.created_at).toLocaleString("pt-BR"),
      Dupla: c.duplas?.nome || "",
      Kit: c.kits?.nome || "",
      Tipo: c.tipo === "recebimento" ? "Recebimento" : "Devolução",
      "Conferido por": c.profiles?.nome || "",
      Observações: c.observacoes || "",
    }));

    const reposicoesLinhas = reposicoes.map((r) => ({
      Item: r.item_tipos?.nome || "",
      "Solicitado por": r.profiles?.nome || "",
      Dupla: r.duplas?.nome || "",
      Kit: r.kits?.nome || "",
      Status: r.status === "pendente" ? "Pendente" : "Atendida",
      "Gerada em": new Date(r.created_at).toLocaleString("pt-BR"),
      "Atendida em": r.atendida_at ? new Date(r.atendida_at).toLocaleString("pt-BR") : "",
      "Chamado Halo": r.chamado_halo_id || "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Conferências");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reposicoesLinhas), "Reposições");
    XLSX.writeFile(wb, `ayko-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function imprimir() {
    window.print();
  }

  return (
    <main className="pb-16">
      <TopBar titulo="Relatórios" subtitulo="Histórico de conferências e reposições" />

      <section className="p-6 no-print">
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Dupla</label>
            <select
              value={filtroDupla}
              onChange={(e) => setFiltroDupla(e.target.value)}
              className="rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple"
            >
              <option value="">Todas</option>
              {duplas.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple"
            >
              <option value="">Todos</option>
              <option value="recebimento">Recebimento</option>
              <option value="devolucao">Devolução</option>
            </select>
          </div>

          <div className="flex-1" />

          <button
            onClick={exportarExcel}
            className="rounded-lg border border-border px-4 py-2 text-sm text-slate-300 hover:border-purple hover:text-purple transition"
          >
            Exportar Excel
          </button>
          <button
            onClick={imprimir}
            className="rounded-lg border border-border px-4 py-2 text-sm text-slate-300 hover:border-purple hover:text-purple transition"
          >
            Imprimir / Salvar PDF
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAba("conferencias")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition ${
              aba === "conferencias" ? "border-purple text-purple bg-purple/10" : "border-border text-slate-400"
            }`}
          >
            Conferências
          </button>
          <button
            onClick={() => setAba("reposicoes")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition ${
              aba === "reposicoes" ? "border-purple text-purple bg-purple/10" : "border-border text-slate-400"
            }`}
          >
            Reposições
          </button>
        </div>
      </section>

      {aba === "conferencias" && (
        <section className="px-6">
          <div className="bg-card border border-border rounded-xl overflow-x-auto print-area">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Dupla</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Conferido por</th>
                  <th className="px-4 py-3 no-print"></th>
                </tr>
              </thead>
              <tbody>
                {conferencias.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-cardhover"
                      onClick={() => alternarExpandir(c.id)}
                    >
                      <td className="px-4 py-3">{new Date(c.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">{c.duplas?.nome}</td>
                      <td className="px-4 py-3">
                        {c.tipo === "recebimento" ? "Recebimento" : "Devolução"}
                      </td>
                      <td className="px-4 py-3">{c.profiles?.nome}</td>
                      <td className="px-4 py-3 text-right text-slate-500 no-print">
                        {expandido === c.id ? "▲" : "▼"}
                      </td>
                    </tr>
                    {expandido === c.id && (
                      <tr className="border-b border-border bg-bg/50">
                        <td colSpan={5} className="px-4 py-3">
                          {!itensPorConferencia[c.id] && (
                            <p className="text-xs text-slate-500">Carregando itens...</p>
                          )}
                          {itensPorConferencia[c.id] && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {itensPorConferencia[c.id].map((it) => (
                                <div key={it.id} className="text-xs bg-card border border-border rounded-lg px-3 py-2">
                                  <p className="font-medium">
                                    {it.kit_item_instancias?.item_tipos?.nome}
                                  </p>
                                  <p className={`status-${it.status}`}>{STATUS_LABEL[it.status]}</p>
                                  {it.identificacao_confirmada && (
                                    <p className="text-slate-500">{it.identificacao_confirmada}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!carregando && conferencias.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Nenhuma conferência encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {aba === "reposicoes" && (
        <section className="px-6">
          <div className="bg-card border border-border rounded-xl overflow-x-auto print-area">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-4 py-3">Solicitado por</th>
                  <th className="text-left px-4 py-3">Kit</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Gerada em</th>
                  <th className="text-left px-4 py-3">Chamado Halo</th>
                </tr>
              </thead>
              <tbody>
                {reposicoes.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{r.item_tipos?.nome}</td>
                    <td className="px-4 py-3">
                      {r.profiles?.nome || "—"}
                      {r.duplas?.nome && <span className="text-slate-500"> ({r.duplas.nome})</span>}
                    </td>
                    <td className="px-4 py-3">{r.kits?.nome}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          r.status === "pendente" ? "bg-red/15 text-red" : "bg-green/15 text-green"
                        }`}
                      >
                        {r.status === "pendente" ? "Pendente" : "Atendida"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{r.chamado_halo_id || "—"}</td>
                  </tr>
                ))}
                {!carregando && reposicoes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      Nenhuma reposição encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
