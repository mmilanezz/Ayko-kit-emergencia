"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

function gerarSenha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const PAPEL_LABEL = { tecnico: "Técnico", suprimentos: "Suprimentos" };
const STATUS_LABEL = { ativo: "Ativo", inativo: "Inativo", ferias: "Férias" };
const STATUS_COLOR = {
  ativo: "bg-green/15 text-green",
  inativo: "bg-red/15 text-red",
  ferias: "bg-orange/15 text-orange",
};

export default function UsuariosPage() {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimaSenha, setUltimaSenha] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [edicao, setEdicao] = useState({});
  const [salvandoId, setSalvandoId] = useState(null);

  const [form, setForm] = useState({ nome: "", email: "", senha: gerarSenha(), role: "tecnico", dupla_id: "" });

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const resposta = await fetch("/api/admin/tecnicos");
    const resultado = await resposta.json();
    if (resposta.ok) {
      setUsuarios(resultado.usuarios || []);
    }

    const { data: duplasData } = await supabase.from("duplas").select("*").order("nome");
    setDuplas(duplasData || []);
    setCarregando(false);
  }

  async function cadastrarUsuario(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    setUltimaSenha(null);

    const resposta = await fetch("/api/admin/tecnicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const resultado = await resposta.json();
    setEnviando(false);

    if (!resposta.ok) {
      setErro(resultado.error || "Erro ao cadastrar usuário.");
      return;
    }

    setUltimaSenha({ email: form.email, senha: form.senha });
    setForm({ nome: "", email: "", senha: gerarSenha(), role: "tecnico", dupla_id: "" });
    carregar();
  }

  async function excluirUsuario(id, nome) {
    if (!confirm(`Excluir o login de "${nome}"? Essa ação não pode ser desfeita.`)) return;
    const resposta = await fetch(`/api/admin/tecnicos?id=${id}`, { method: "DELETE" });
    const resultado = await resposta.json();
    if (!resposta.ok) {
      alert(resultado.error || "Erro ao excluir usuário.");
      return;
    }
    carregar();
  }

  // campos "simples" (papel, dupla) continuam indo direto pro Supabase,
  // já que a RLS de admin já permite escrever em profiles sem passar pela API
  async function atualizarCampoSimples(id, campo, valor) {
    const { error } = await supabase.from("profiles").update({ [campo]: valor }).eq("id", id);
    if (error) {
      alert("Erro ao atualizar: " + error.message);
      return;
    }
    carregar();
  }

  function iniciarEdicaoCredenciais(usuario) {
    setEdicao({
      ...edicao,
      [usuario.id]: { nome: usuario.nome, email: usuario.email || "", novaSenha: "" },
    });
  }

  async function salvarCredenciais(id) {
    const dados = edicao[id];
    if (!dados) return;

    setSalvandoId(id);
    const payload = { id };
    if (dados.nome) payload.nome = dados.nome;
    if (dados.email) payload.email = dados.email;
    if (dados.novaSenha) payload.senha = dados.novaSenha;

    const resposta = await fetch("/api/admin/tecnicos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const resultado = await resposta.json();
    setSalvandoId(null);

    if (!resposta.ok) {
      alert(resultado.error || "Erro ao salvar.");
      return;
    }

    const novaEdicao = { ...edicao };
    delete novaEdicao[id];
    setEdicao(novaEdicao);
    carregar();
  }

  async function atualizarStatus(id, status) {
    const resposta = await fetch("/api/admin/tecnicos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const resultado = await resposta.json();
    if (!resposta.ok) {
      alert(resultado.error || "Erro ao atualizar status.");
      return;
    }
    carregar();
  }

  return (
    <main className="pb-16">
      <TopBar titulo="Usuários" subtitulo="Cadastro, credenciais e permissões" />

      <section className="p-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Cadastrar novo usuário</h2>
        <form onSubmit={cadastrarUsuario} className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome</label>
            <input
              type="text" required value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
              placeholder="ex: Alessandro Souza"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">E-mail (login)</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
              placeholder="alessandro@ayko.tech"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Papel</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, dupla_id: "" })}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
            >
              <option value="tecnico">Técnico</option>
              <option value="suprimentos">Suprimentos</option>
            </select>
          </div>
          {form.role === "tecnico" && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dupla</label>
              <select
                value={form.dupla_id}
                onChange={(e) => setForm({ ...form, dupla_id: e.target.value })}
                className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
              >
                <option value="">— definir depois —</option>
                {duplas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
          )}
          <div className={form.role === "tecnico" ? "sm:col-span-2" : ""}>
            <label className="block text-xs text-slate-400 mb-1">Senha provisória</label>
            <div className="flex gap-2">
              <input
                type="text" required value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="flex-1 rounded-lg bg-bg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-purple"
              />
              <button type="button" onClick={() => setForm({ ...form, senha: gerarSenha() })}
                className="text-xs border border-border rounded-lg px-3 text-slate-400 hover:text-purple hover:border-purple transition">
                Gerar
              </button>
            </div>
          </div>
          {erro && <p className="sm:col-span-2 text-sm text-red">{erro}</p>}
          {ultimaSenha && (
            <div className="sm:col-span-2 bg-green/10 border border-green/30 rounded-lg p-3 text-sm">
              <p className="text-green font-medium mb-1">Usuário cadastrado!</p>
              <p className="text-slate-300">
                <span className="font-mono">{ultimaSenha.email}</span> · <span className="font-mono">{ultimaSenha.senha}</span>
              </p>
            </div>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={enviando}
              className="rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 transition">
              {enviando ? "Cadastrando..." : "Cadastrar usuário"}
            </button>
          </div>
        </form>
      </section>

      <section className="px-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">
          Usuários cadastrados {!carregando && `(${usuarios.length})`}
        </h2>

        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpandido(expandido === u.id ? null : u.id)}
              >
                <span className="font-medium text-sm min-w-[10rem]">{u.nome}</span>
                <span className={`badge ${u.role === "suprimentos" ? "bg-blue/15 text-blue" : "bg-purple/15 text-purple"}`}>
                  {PAPEL_LABEL[u.role]}
                </span>
                <span className={`badge ${STATUS_COLOR[u.status || "ativo"]}`}>{STATUS_LABEL[u.status || "ativo"]}</span>
                {u.banido && <span className="badge bg-red/15 text-red">Login bloqueado</span>}
                {u.role === "tecnico" && <span className="text-xs text-slate-500">{u.duplas?.nome || "sem dupla"}</span>}
                <span className="ml-auto text-slate-500 text-xs">{expandido === u.id ? "▲ fechar" : "▼ detalhes"}</span>
              </div>

              {expandido === u.id && (
                <div className="border-t border-border px-4 py-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Papel</label>
                      <select
                        value={u.role}
                        onChange={(e) => atualizarCampoSimples(u.id, "role", e.target.value)}
                        className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
                      >
                        <option value="tecnico">Técnico</option>
                        <option value="suprimentos">Suprimentos</option>
                      </select>
                    </div>
                    {u.role === "tecnico" && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Dupla</label>
                        <select
                          value={u.dupla_id || ""}
                          onChange={(e) => atualizarCampoSimples(u.id, "dupla_id", e.target.value || null)}
                          className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
                        >
                          <option value="">— nenhuma —</option>
                          {duplas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Status</label>
                      <select
                        value={u.status || "ativo"}
                        onChange={(e) => atualizarStatus(u.id, e.target.value)}
                        className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="ferias">Férias</option>
                        <option value="inativo">Inativo (bloqueia login)</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-slate-400 mb-3">
                      Credenciais de acesso — por segurança, a senha atual nunca fica visível
                      (nem pra você); só é possível <strong>definir uma nova</strong>.
                    </p>

                    {!edicao[u.id] ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300 font-mono">{u.email || "—"}</span>
                        <button
                          onClick={() => iniciarEdicaoCredenciais(u)}
                          className="text-xs text-purple hover:underline"
                        >
                          Editar nome / e-mail / senha
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Nome</label>
                          <input
                            type="text"
                            value={edicao[u.id].nome}
                            onChange={(e) => setEdicao({ ...edicao, [u.id]: { ...edicao[u.id], nome: e.target.value } })}
                            className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">E-mail (login)</label>
                          <input
                            type="email"
                            value={edicao[u.id].email}
                            onChange={(e) => setEdicao({ ...edicao, [u.id]: { ...edicao[u.id], email: e.target.value } })}
                            className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-slate-400 mb-1">Nova senha (deixe em branco pra não alterar)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={edicao[u.id].novaSenha}
                              onChange={(e) => setEdicao({ ...edicao, [u.id]: { ...edicao[u.id], novaSenha: e.target.value } })}
                              className="flex-1 rounded-lg bg-bg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-purple"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setEdicao({ ...edicao, [u.id]: { ...edicao[u.id], novaSenha: gerarSenha() } })}
                              className="text-xs border border-border rounded-lg px-3 text-slate-400 hover:text-purple hover:border-purple transition"
                            >
                              Gerar
                            </button>
                          </div>
                        </div>
                        <div className="sm:col-span-2 flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              const nova = { ...edicao };
                              delete nova[u.id];
                              setEdicao(nova);
                            }}
                            className="text-xs text-slate-400 px-3 py-2"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => salvarCredenciais(u.id)}
                            disabled={salvandoId === u.id}
                            className="rounded-lg bg-purple text-white text-xs font-medium px-4 py-2 disabled:opacity-50"
                          >
                            {salvandoId === u.id ? "Salvando..." : "Salvar credenciais"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-3 flex justify-end">
                    <button onClick={() => excluirUsuario(u.id, u.nome)} className="text-xs text-red hover:underline">
                      Excluir login permanentemente
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!carregando && usuarios.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-6">Nenhum usuário cadastrado ainda.</p>
          )}
        </div>
      </section>
    </main>
  );
}
