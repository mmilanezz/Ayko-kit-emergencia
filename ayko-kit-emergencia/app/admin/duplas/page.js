"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

export default function DuplasPage() {
  const supabase = createClient();
  const [duplas, setDuplas] = useState([]);
  const [kits, setKits] = useState([]);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: duplasData } = await supabase.from("duplas").select("*").order("nome");
    setDuplas(duplasData || []);

    const { data: kitsData } = await supabase.from("kits").select("*").order("nome");
    setKits(kitsData || []);
  }

  async function criarDupla(e) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setCriando(true);
    const { error } = await supabase.from("duplas").insert({ nome: novoNome.trim() });
    setCriando(false);
    if (error) {
      alert("Erro ao criar dupla: " + error.message);
      return;
    }
    setNovoNome("");
    carregar();
  }

  async function renomearDupla(id, nome) {
    const { error } = await supabase.from("duplas").update({ nome }).eq("id", id);
    if (error) alert("Erro ao renomear: " + error.message);
  }

  async function vincularKit(duplaId, kitId) {
    const { data, error } = await supabase
      .from("duplas")
      .update({ kit_id: kitId || null })
      .eq("id", duplaId)
      .select();

    if (error) {
      alert("Erro ao vincular kit: " + error.message);
      return;
    }
    if (!data || data.length === 0) {
      alert("A atualização não foi aplicada. Confirme se seu usuário está com papel 'admin'.");
      return;
    }
    carregar();
  }

  async function excluirDupla(id, nome) {
    const { count } = await supabase
      .from("conferencias")
      .select("id", { count: "exact", head: true })
      .eq("dupla_id", id);

    if (count && count > 0) {
      alert(
        `"${nome}" tem ${count} conferência(s) registrada(s) no histórico e não pode ser excluída (isso preserva o histórico). Se quiser, desvincule o kit e renomeie como "inativa" em vez de excluir.`
      );
      return;
    }

    if (!confirm(`Excluir a dupla "${nome}"? Essa ação não pode ser desfeita.`)) return;

    const { error } = await supabase.from("duplas").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    carregar();
  }

  return (
    <main className="pb-16">
      <TopBar titulo="Duplas" subtitulo="Criação e vínculo de duplas com os kits" />

      <section className="p-6">
        <p className="text-xs text-slate-500 mb-4">
          O nome de cada dupla agora é definido automaticamente pela junção
          dos nomes dos técnicos vinculados a ela (em Usuários). Renomear
          aqui manualmente só faz sentido pra duplas ainda sem os 2
          técnicos definidos.
        </p>
        <form onSubmit={criarDupla} className="flex gap-2 mb-6">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da nova dupla (ex: Dupla 9 - Fulano / Ciclano)"
            className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple"
          />
          <button
            type="submit"
            disabled={criando}
            className="rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition"
          >
            {criando ? "Criando..." : "+ Nova dupla"}
          </button>
        </form>

        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3">Nome da dupla</th>
                <th className="text-left px-4 py-3">Kit vinculado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {duplas.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={d.nome}
                      onBlur={(e) => renomearDupla(d.id, e.target.value)}
                      className="rounded bg-bg border border-border px-2 py-1 text-sm outline-none focus:border-purple w-72"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={d.kit_id || ""}
                      onChange={(e) => vincularKit(d.id, e.target.value)}
                      className="rounded bg-bg border border-border px-2 py-1.5 text-sm outline-none focus:border-purple"
                    >
                      <option value="">— sem kit —</option>
                      {kits.map((k) => (
                        <option key={k.id} value={k.id}>{k.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => excluirDupla(d.id, d.nome)}
                      className="text-xs text-red hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {duplas.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma dupla cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
