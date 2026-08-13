"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

export default function KitsPage() {
  const supabase = createClient();
  const [tipos, setTipos] = useState([]);
  const [kits, setKits] = useState([]);
  const [kitSelecionado, setKitSelecionado] = useState("");
  const [instancias, setInstancias] = useState([]);
  const [novoTipo, setNovoTipo] = useState({ nome: "", quantidade_padrao: 1, requer_identificacao: true });

  useEffect(() => {
    carregarTipos();
    carregarKits();
  }, []);

  useEffect(() => {
    if (kitSelecionado) carregarInstancias(kitSelecionado);
  }, [kitSelecionado]);

  async function carregarTipos() {
    const { data } = await supabase.from("item_tipos").select("*").order("nome");
    setTipos(data || []);
  }

  async function carregarKits() {
    const { data } = await supabase.from("kits").select("*").order("nome");
    setKits(data || []);
    if (data?.length && !kitSelecionado) setKitSelecionado(data[0].id);
  }

  async function carregarInstancias(kitId) {
    const { data } = await supabase
      .from("kit_item_instancias")
      .select("*, item_tipos(nome, requer_identificacao)")
      .eq("kit_id", kitId)
      .order("created_at");
    setInstancias(data || []);
  }

  async function adicionarTipo(e) {
    e.preventDefault();
    if (!novoTipo.nome) return;
    await supabase.from("item_tipos").insert(novoTipo);
    setNovoTipo({ nome: "", quantidade_padrao: 1, requer_identificacao: true });
    carregarTipos();
  }

  async function excluirTipo(id) {
    if (!confirm("Excluir este tipo de item do catálogo? Isso não remove instâncias já criadas.")) return;
    await supabase.from("item_tipos").delete().eq("id", id);
    carregarTipos();
  }

  async function adicionarInstancia(tipoId) {
    await supabase.from("kit_item_instancias").insert({
      kit_id: kitSelecionado,
      item_tipo_id: tipoId,
      status: "ok",
    });
    carregarInstancias(kitSelecionado);
  }

  async function removerInstancia(id) {
    if (!confirm("Remover esta unidade do kit?")) return;
    await supabase.from("kit_item_instancias").delete().eq("id", id);
    carregarInstancias(kitSelecionado);
  }

  async function atualizarIdentificacao(id, valor) {
    await supabase.from("kit_item_instancias").update({ identificacao: valor }).eq("id", id);
  }

  return (
    <main className="pb-16">
      <TopBar titulo="Kits & Itens" subtitulo="Catálogo padrão e instâncias físicas por kit" />

      <section className="p-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Catálogo de tipos de item</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Qtd. padrão</th>
                <th className="text-left px-4 py-3">Identificação?</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{t.nome}</td>
                  <td className="px-4 py-3">{t.quantidade_padrao}</td>
                  <td className="px-4 py-3">{t.requer_identificacao ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => excluirTipo(t.id)} className="text-xs text-red hover:underline">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={adicionarTipo} className="flex gap-2 items-end bg-card border border-border rounded-xl p-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Novo tipo de item</label>
            <input
              type="text"
              value={novoTipo.nome}
              onChange={(e) => setNovoTipo({ ...novoTipo, nome: e.target.value })}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
              placeholder="ex: Roteador Mikrotik 951"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-slate-400 mb-1">Qtd. padrão</label>
            <input
              type="number"
              min={1}
              value={novoTipo.quantidade_padrao}
              onChange={(e) => setNovoTipo({ ...novoTipo, quantidade_padrao: Number(e.target.value) })}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 pb-2.5">
            <input
              type="checkbox"
              checked={novoTipo.requer_identificacao}
              onChange={(e) => setNovoTipo({ ...novoTipo, requer_identificacao: e.target.checked })}
            />
            Requer identificação
          </label>
          <button type="submit" className="rounded-lg bg-purple text-white text-sm font-medium px-4 py-2.5">
            Adicionar
          </button>
        </form>
      </section>

      <section className="px-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Instâncias por kit</h2>

        <select
          value={kitSelecionado}
          onChange={(e) => setKitSelecionado(e.target.value)}
          className="mb-4 rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple"
        >
          {kits.map((k) => (
            <option key={k.id} value={k.id}>{k.nome}</option>
          ))}
        </select>

        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Identificação</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {instancias.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{i.item_tipos?.nome}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={i.identificacao || ""}
                      onBlur={(e) => atualizarIdentificacao(i.id, e.target.value)}
                      placeholder="—"
                      className="rounded bg-bg border border-border px-2 py-1 text-xs outline-none focus:border-purple w-40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        i.status === "ok"
                          ? "bg-green/15 text-green"
                          : i.status === "faltando"
                          ? "bg-red/15 text-red"
                          : "bg-orange/15 text-orange"
                      }`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removerInstancia(i.id)} className="text-xs text-red hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <button
              key={t.id}
              onClick={() => adicionarInstancia(t.id)}
              className="text-xs border border-border rounded-lg px-3 py-1.5 text-slate-400 hover:text-purple hover:border-purple transition"
            >
              + {t.nome}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
