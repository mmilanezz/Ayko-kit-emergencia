"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

export default function DuplasPage() {
  const supabase = createClient();
  const [duplas, setDuplas] = useState([]);
  const [kits, setKits] = useState([]);
  const [perfis, setPerfis] = useState([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: duplasData } = await supabase.from("duplas").select("*").order("nome");
    setDuplas(duplasData || []);

    const { data: kitsData } = await supabase.from("kits").select("*").order("nome");
    setKits(kitsData || []);

    const { data: perfisData } = await supabase.from("profiles").select("*").order("nome");
    setPerfis(perfisData || []);
  }

  async function renomearDupla(id, nome) {
    await supabase.from("duplas").update({ nome }).eq("id", id);
  }

  async function vincularKit(duplaId, kitId) {
    await supabase.from("duplas").update({ kit_id: kitId || null }).eq("id", duplaId);
    carregar();
  }

  async function atualizarPerfil(id, campo, valor) {
    await supabase.from("profiles").update({ [campo]: valor }).eq("id", id);
    carregar();
  }

  return (
    <main className="pb-16">
      <TopBar titulo="Duplas & Usuários" subtitulo="Vínculo entre técnicos, duplas e kits" />

      <section className="p-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Duplas</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3">Nome da dupla</th>
                <th className="text-left px-4 py-3">Kit vinculado</th>
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
                      className="rounded bg-bg border border-border px-2 py-1 text-sm outline-none focus:border-purple w-64"
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="px-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Usuários</h2>
        <p className="text-xs text-slate-500 mb-3">
          Para criar um novo login, adicione o usuário em Supabase → Authentication → Add user.
          Ele aparece aqui automaticamente com papel "técnico" — ajuste o papel e a dupla abaixo.
        </p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Papel</th>
                <th className="text-left px-4 py-3">Dupla</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={p.nome}
                      onBlur={(e) => atualizarPerfil(p.id, "nome", e.target.value)}
                      className="rounded bg-bg border border-border px-2 py-1 text-sm outline-none focus:border-purple w-48"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={(e) => atualizarPerfil(p.id, "role", e.target.value)}
                      className="rounded bg-bg border border-border px-2 py-1.5 text-sm outline-none focus:border-purple"
                    >
                      <option value="tecnico">Técnico</option>
                      <option value="suprimentos">Suprimentos</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.dupla_id || ""}
                      onChange={(e) => atualizarPerfil(p.id, "dupla_id", e.target.value || null)}
                      className="rounded bg-bg border border-border px-2 py-1.5 text-sm outline-none focus:border-purple"
                      disabled={p.role !== "tecnico"}
                    >
                      <option value="">— nenhuma —</option>
                      {duplas.map((d) => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

fix: select de vínculo kit-dupla' 
