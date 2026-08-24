
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

export default function VeiculosPage() {
  const supabase = createClient();
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState({ placa: "", modelo: "" });
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase.from("veiculos").select("*").order("placa");
    setVeiculos(data || []);
    setCarregando(false);
  }

  async function criarVeiculo(e) {
    e.preventDefault();
    if (!novo.placa.trim()) return;
    setCriando(true);
    const { error } = await supabase.from("veiculos").insert({
      placa: novo.placa.trim().toUpperCase(),
      modelo: novo.modelo.trim() || null,
    });
    setCriando(false);
    if (error) {
      alert("Erro ao cadastrar veículo: " + error.message);
      return;
    }
    setNovo({ placa: "", modelo: "" });
    carregar();
  }

  async function atualizarCampo(id, campo, valor) {
    const { error } = await supabase.from("veiculos").update({ [campo]: valor }).eq("id", id);
    if (error) {
      alert("Erro ao atualizar: " + error.message);
      return;
    }
    carregar();
  }

  async function excluirVeiculo(id, placa) {
    // veículos em uso (referenciados no histórico de custódia) não podem
    // ser excluídos — preserva o histórico. Nesse caso, sugerimos inativar.
    const { count } = await supabase
      .from("kit_custodia_historico")
      .select("id", { count: "exact", head: true })
      .eq("veiculo_id", id);

    if (count && count > 0) {
      alert(
        `"${placa}" já foi usado em ${count} vínculo(s) de custódia e não pode ser excluído (preserva o histórico). Marque como inativo em vez de excluir.`
      );
      return;
    }

    if (!confirm(`Excluir o veículo "${placa}"?`)) return;
    const { error } = await supabase.from("veiculos").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    carregar();
  }

  return (
    <main className="pb-16">
      <TopBar titulo="Veículos" subtitulo="Cadastro dos veículos usados pelas duplas" />

      <section className="p-6">
        <form onSubmit={criarVeiculo} className="flex flex-wrap gap-2 mb-6">
          <input
            type="text"
            value={novo.placa}
            onChange={(e) => setNovo({ ...novo, placa: e.target.value })}
            placeholder="Placa (ex: ABC-1234)"
            className="rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple w-48"
          />
          <input
            type="text"
            value={novo.modelo}
            onChange={(e) => setNovo({ ...novo, modelo: e.target.value })}
            placeholder="Modelo (opcional)"
            className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple min-w-[200px]"
          />
          <button
            type="submit"
            disabled={criando}
            className="rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition"
          >
            {criando ? "Cadastrando..." : "+ Novo veículo"}
          </button>
        </form>

        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3">Placa</th>
                <th className="text-left px-4 py-3">Modelo</th>
                <th className="text-left px-4 py-3">Ativo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={v.placa}
                      onBlur={(e) => atualizarCampo(v.id, "placa", e.target.value.toUpperCase())}
                      className="rounded bg-bg border border-border px-2 py-1 text-sm font-mono outline-none focus:border-purple w-32"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={v.modelo || ""}
                      onBlur={(e) => atualizarCampo(v.id, "modelo", e.target.value || null)}
                      className="rounded bg-bg border border-border px-2 py-1 text-sm outline-none focus:border-purple w-48"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => atualizarCampo(v.id, "ativo", !v.ativo)}
                      className={`badge ${v.ativo ? "bg-green/15 text-green" : "bg-slate-500/15 text-slate-400"}`}
                    >
                      {v.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => excluirVeiculo(v.id, v.placa)} className="text-xs text-red hover:underline">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {!carregando && veiculos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Nenhum veículo cadastrado ainda.
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
