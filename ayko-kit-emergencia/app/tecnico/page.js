"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";

const STATUS_LABEL = { ok: "OK", faltando: "Faltando", danificado: "Danificado" };
const STATUS_COLOR = {
  ok: "bg-green/15 text-green",
  faltando: "bg-red/15 text-red",
  danificado: "bg-orange/15 text-orange",
};

const STATUS_REPOSICAO_LABEL = {
  pendente: "Pendente",
  separando: "Separando",
  separado: "Separado",
  pronto_retirada: "Pronto p/ retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
  bloqueado: "Bloqueado",
};
const STATUS_REPOSICAO_COLOR = {
  pendente: "bg-orange/15 text-orange",
  separando: "bg-blue/15 text-blue",
  separado: "bg-blue/15 text-blue",
  pronto_retirada: "bg-purple/15 text-purple",
  entregue: "bg-green/15 text-green",
  cancelado: "bg-red/15 text-red",
  bloqueado: "bg-red/15 text-red",
};

const MOTIVOS = ["Incidente", "Ativação", "Troca", "Reparo", "Emergencial", "Outro"];

export default function TecnicoPage() {
  const supabase = createClient();
  const [aba, setAba] = useState("meukit");
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [dupla, setDupla] = useState(null);
  const [itens, setItens] = useState([]); // kit_item_instancias (modo unidade)
  const [parConfig, setParConfig] = useState([]); // kit_material_config
  const [saldoQuantidade, setSaldoQuantidade] = useState([]); // kit_saldo_material

  // -- conferência --
  const [respostas, setRespostas] = useState({});
  const [tipoConferencia, setTipoConferencia] = useState("recebimento");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [historico, setHistorico] = useState([]);

  // -- usar material --
  const [selecaoUso, setSelecaoUso] = useState("");
  const [quantidadeUso, setQuantidadeUso] = useState(1);
  const [chamadoHalo, setChamadoHalo] = useState("");
  const [motivoUso, setMotivoUso] = useState("");
  const [obsUso, setObsUso] = useState("");
  const [enviandoUso, setEnviandoUso] = useState(false);
  const [sucessoUso, setSucessoUso] = useState(false);
  const [usosRecentes, setUsosRecentes] = useState([]);

  // -- minhas reposições --
  const [reposicoes, setReposicoes] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfilData } = await supabase
      .from("profiles")
      .select("*, duplas(*, kits(nome), veiculos(placa, modelo))")
      .eq("id", user.id)
      .single();

    setPerfil(perfilData);
    setDupla(perfilData?.duplas);

    if (perfilData?.duplas?.kit_id) {
      const kitId = perfilData.duplas.kit_id;

      const { data: instancias } = await supabase
        .from("kit_item_instancias")
        .select("*, item_tipos(nome, tipo_controle, requer_identificacao)")
        .eq("kit_id", kitId)
        .order("created_at");
      setItens(instancias || []);

      const respostasIniciais = {};
      (instancias || []).forEach((i) => {
        respostasIniciais[i.id] = { status: "ok", identificacao: i.identificacao || "" };
      });
      setRespostas(respostasIniciais);

      const { data: par } = await supabase
        .from("kit_material_config")
        .select("*, item_tipos(nome, tipo_controle)")
        .eq("kit_id", kitId);
      setParConfig(par || []);

      const { data: saldos } = await supabase
        .from("kit_saldo_material")
        .select("*, item_tipos(nome)")
        .eq("kit_id", kitId);
      setSaldoQuantidade(saldos || []);

      const { data: conferenciasAnteriores } = await supabase
        .from("conferencias")
        .select("id, tipo, created_at, observacoes")
        .eq("dupla_id", perfilData.dupla_id)
        .order("created_at", { ascending: false })
        .limit(5);
      setHistorico(conferenciasAnteriores || []);

      const { data: usos } = await supabase
        .from("usos_campo")
        .select("id, chamado_halo_id, motivo, quantidade, created_at, kit_item_instancias(item_tipos(nome)), item_tipos(nome)")
        .eq("dupla_id", perfilData.dupla_id)
        .order("created_at", { ascending: false })
        .limit(5);
      setUsosRecentes(usos || []);

      const { data: repos } = await supabase
        .from("reposicoes")
        .select("*, item_tipos(nome)")
        .eq("dupla_id", perfilData.dupla_id)
        .order("created_at", { ascending: false })
        .limit(20);
      setReposicoes(repos || []);
    }

    setCarregando(false);
  }

  function atualizarResposta(instanciaId, campo, valor) {
    setRespostas((prev) => ({ ...prev, [instanciaId]: { ...prev[instanciaId], [campo]: valor } }));
  }

  async function enviarConferencia(e) {
    e.preventDefault();
    setEnviando(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: conferencia, error: erroConferencia } = await supabase
      .from("conferencias")
      .insert({
        kit_id: dupla.kit_id,
        dupla_id: perfil.dupla_id,
        conferido_por: user.id,
        tipo: tipoConferencia,
        observacoes,
      })
      .select()
      .single();

    if (erroConferencia) {
      setEnviando(false);
      alert("Erro ao registrar conferência: " + erroConferencia.message);
      return;
    }

    const linhasItens = itens.map((item) => ({
      conferencia_id: conferencia.id,
      instancia_id: item.id,
      status: respostas[item.id]?.status || "ok",
      identificacao_confirmada: respostas[item.id]?.identificacao || null,
      observacao: null,
    }));

    const { error: erroItens } = await supabase.from("conferencia_itens").insert(linhasItens);

    await Promise.all(
      itens.map((item) =>
        supabase
          .from("kit_item_instancias")
          .update({
            status: respostas[item.id]?.status || "ok",
            identificacao: respostas[item.id]?.identificacao || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
      )
    );

    setEnviando(false);

    if (erroItens) {
      alert("Erro ao registrar itens: " + erroItens.message);
      return;
    }

    const itensPendentes = itens
      .filter((item) => (respostas[item.id]?.status || "ok") !== "ok")
      .map((item) => ({ nome: item.item_tipos?.nome, status: STATUS_LABEL[respostas[item.id]?.status] }));

    if (itensPendentes.length > 0) {
      fetch("/api/notificar-reposicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplaNome: dupla.nome, kitNome: dupla.kits?.nome || "", itens: itensPendentes }),
      }).catch(() => {});
    }

    setSucesso(true);
    carregarDados();
    setTimeout(() => setSucesso(false), 4000);
  }

  async function enviarUsoMaterial(e) {
    e.preventDefault();
    if (!selecaoUso || !chamadoHalo.trim() || !motivoUso) return;

    setEnviandoUso(true);
    const { data: { user } } = await supabase.auth.getUser();

    const [modo, id] = selecaoUso.split(":");
    const payload = {
      tecnico_id: user.id,
      dupla_id: perfil.dupla_id,
      chamado_halo_id: chamadoHalo.trim(),
      motivo: motivoUso,
      observacao: obsUso || null,
      quantidade: modo === "quantidade" ? Number(quantidadeUso) || 1 : 1,
    };
    if (modo === "instancia") {
      payload.instancia_id = id;
    } else {
      payload.kit_id = dupla.kit_id;
      payload.item_tipo_id = id;
    }

    const { error } = await supabase.from("usos_campo").insert(payload);
    setEnviandoUso(false);

    if (error) {
      alert("Erro ao registrar uso: " + error.message);
      return;
    }

    const nomeItem =
      modo === "instancia"
        ? itens.find((i) => i.id === id)?.item_tipos?.nome
        : parConfig.find((p) => p.item_tipo_id === id)?.item_tipos?.nome;

    fetch("/api/notificar-reposicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duplaNome: dupla.nome,
        kitNome: dupla.kits?.nome || "",
        itens: [{ nome: nomeItem, status: `${motivoUso} — chamado Halo ${chamadoHalo.trim()}` }],
      }),
    }).catch(() => {});

    setSucessoUso(true);
    setSelecaoUso("");
    setQuantidadeUso(1);
    setChamadoHalo("");
    setMotivoUso("");
    setObsUso("");
    carregarDados();
    setTimeout(() => setSucessoUso(false), 4000);
  }

  if (carregando) {
    return (
      <main>
        <TopBar titulo="Kit Emergência" />
        <p className="p-6 text-slate-400">Carregando...</p>
      </main>
    );
  }

  if (!dupla?.kit_id) {
    return (
      <main>
        <TopBar titulo="Kit Emergência" />
        <p className="p-6 text-slate-400">Sua dupla ainda não tem um kit vinculado. Fale com o administrador.</p>
      </main>
    );
  }

  const faltandoOuDanificado = Object.values(respostas).filter((r) => r.status !== "ok").length;

  const itensUnidadeOk = itens.filter((i) => i.status === "ok");
  const opcoesUso = [
    ...itensUnidadeOk.map((i) => ({
      value: `instancia:${i.id}`,
      label: `${i.item_tipos?.nome}${i.identificacao ? ` (${i.identificacao})` : ""}`,
      modo: "instancia",
    })),
    ...parConfig
      .filter((p) => p.item_tipos?.tipo_controle === "quantidade")
      .map((p) => ({
        value: `quantidade:${p.item_tipo_id}`,
        label: `${p.item_tipos?.nome} (por quantidade)`,
        modo: "quantidade",
      })),
  ];

  // resumo "Meu Kit": PAR configurado vs quantidade atual, por material
  const resumoMateriais = parConfig.map((p) => {
    const tipoControle = p.item_tipos?.tipo_controle || "unidade";
    let atual;
    if (tipoControle === "quantidade") {
      atual = saldoQuantidade.find((s) => s.item_tipo_id === p.item_tipo_id)?.quantidade_atual ?? 0;
    } else {
      atual = itens.filter((i) => i.item_tipo_id === p.item_tipo_id && i.status === "ok").length;
    }
    return { nome: p.item_tipos?.nome, par: p.quantidade_par, atual };
  });

  return (
    <main className="max-w-2xl mx-auto pb-20">
      <TopBar titulo={dupla.nome} subtitulo={`Olá, ${perfil.nome} · ${dupla.kits?.nome || ""}`} />

      <div className="px-6 mt-6 grid grid-cols-4 gap-1.5">
        {[
          ["meukit", "Meu Kit"],
          ["conferencia", "Conferência"],
          ["usar", "Usar Material"],
          ["reposicoes", "Reposições"],
        ].map(([valor, label]) => (
          <button
            key={valor}
            onClick={() => setAba(valor)}
            className={`rounded-lg py-2 text-xs font-medium border transition ${
              aba === valor ? "bg-purple/15 border-purple text-purple" : "border-border text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "meukit" && (
        <div className="px-6 mt-5 space-y-3">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-1">Kit</p>
                <p className="font-medium">{dupla.kits?.nome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Veículo atual</p>
                <p className="font-medium">
                  {dupla.veiculos ? `${dupla.veiculos.placa} · ${dupla.veiculos.modelo || ""}` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3">Materiais do kit</h2>
            <div className="space-y-2">
              {resumoMateriais.map((m, idx) => {
                const completo = m.atual >= m.par;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm"
                  >
                    <span>{m.nome}</span>
                    <span className={`badge ${completo ? "bg-green/15 text-green" : "bg-orange/15 text-orange"}`}>
                      {m.atual} / {m.par}
                    </span>
                  </div>
                );
              })}
              {resumoMateriais.length === 0 && (
                <p className="text-sm text-slate-500">Nenhum material configurado neste kit ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {aba === "conferencia" && (
        <form onSubmit={enviarConferencia} className="px-6 mt-5">
          <div className="bg-card border border-border rounded-2xl p-5 mb-5">
            <label className="block text-sm text-slate-400 mb-2">Tipo de conferência</label>
            <div className="flex gap-2">
              {["recebimento", "devolucao"].map((tipo) => (
                <button
                  type="button"
                  key={tipo}
                  onClick={() => setTipoConferencia(tipo)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium border transition ${
                    tipoConferencia === tipo ? "bg-purple/15 border-purple text-purple" : "border-border text-slate-400"
                  }`}
                >
                  {tipo === "recebimento" ? "Recebimento do carro" : "Devolução do carro"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {itens.map((item) => {
              const resposta = respostas[item.id] || { status: "ok", identificacao: "" };
              return (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-sm">{item.item_tipos?.nome}</p>
                    <span className={`badge ${STATUS_COLOR[resposta.status]}`}>{STATUS_LABEL[resposta.status]}</span>
                  </div>

                  <div className="flex gap-2 mb-3">
                    {["ok", "faltando", "danificado"].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => atualizarResposta(item.id, "status", s)}
                        className={`flex-1 rounded-lg py-2 text-xs font-medium border transition ${
                          resposta.status === s ? STATUS_COLOR[s] + " border-transparent" : "border-border text-slate-500"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>

                  {item.item_tipos?.requer_identificacao && (
                    <input
                      type="text"
                      placeholder="Nº de patrimônio / identificação"
                      value={resposta.identificacao}
                      onChange={(e) => atualizarResposta(item.id, "identificacao", e.target.value)}
                      className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple transition"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 mt-5">
            <label className="block text-sm text-slate-400 mb-2">Observações (opcional)</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple transition resize-none"
              placeholder="Algo que o admin ou suprimentos precise saber..."
            />
          </div>

          {faltandoOuDanificado > 0 && (
            <p className="text-sm text-orange mt-4">
              {faltandoOuDanificado} item(ns) serão enviados como pendência de reposição.
            </p>
          )}
          {sucesso && <p className="text-sm text-green mt-4">Conferência registrada com sucesso.</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full mt-5 rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white font-medium py-3 text-sm transition"
          >
            {enviando ? "Enviando..." : "Confirmar conferência e assinar"}
          </button>

          {historico.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-medium text-slate-400 mb-3">Últimas conferências</h2>
              <div className="space-y-2">
                {historico.map((h) => (
                  <div key={h.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm">
                    <span>{h.tipo === "recebimento" ? "Recebimento" : "Devolução"}</span>
                    <span className="text-slate-500">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {aba === "usar" && (
        <div className="px-6 mt-5">
          <p className="text-xs text-slate-500 mb-4">
            Usou um material do kit direto num atendimento? Registre aqui — a
            reposição já é gerada na hora, sem esperar a próxima conferência.
          </p>

          <form onSubmit={enviarUsoMaterial} className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">O que você usou?</label>
              <select
                required
                value={selecaoUso}
                onChange={(e) => setSelecaoUso(e.target.value)}
                className="w-full rounded-lg bg-bg border border-border px-3 py-2.5 text-sm outline-none focus:border-purple"
              >
                <option value="">Selecione o material</option>
                {opcoesUso.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {selecaoUso.startsWith("quantidade:") && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantidadeUso}
                  onChange={(e) => setQuantidadeUso(e.target.value)}
                  className="w-full rounded-lg bg-bg border border-border px-3 py-2.5 text-sm outline-none focus:border-purple"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-2">Motivo</label>
              <select
                required
                value={motivoUso}
                onChange={(e) => setMotivoUso(e.target.value)}
                className="w-full rounded-lg bg-bg border border-border px-3 py-2.5 text-sm outline-none focus:border-purple"
              >
                <option value="">Selecione o motivo</option>
                {MOTIVOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Número do chamado no Halo</label>
              <input
                type="text"
                required
                value={chamadoHalo}
                onChange={(e) => setChamadoHalo(e.target.value)}
                placeholder="ex: 12345"
                className="w-full rounded-lg bg-bg border border-border px-3 py-2.5 text-sm outline-none focus:border-purple"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Observação (opcional)</label>
              <textarea
                value={obsUso}
                onChange={(e) => setObsUso(e.target.value)}
                rows={2}
                className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple resize-none"
              />
            </div>

            {sucessoUso && <p className="text-sm text-green">Uso registrado — reposição já foi gerada.</p>}

            <button
              type="submit"
              disabled={enviandoUso}
              className="w-full rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white font-medium py-3 text-sm transition"
            >
              {enviandoUso ? "Registrando..." : "Registrar uso"}
            </button>
          </form>

          {usosRecentes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium text-slate-400 mb-3">Usos recentes</h2>
              <div className="space-y-2">
                {usosRecentes.map((u) => (
                  <div key={u.id} className="bg-card border border-border rounded-lg px-4 py-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {u.kit_item_instancias?.item_tipos?.nome || u.item_tipos?.nome} × {u.quantidade}
                      </span>
                      <span className="text-slate-500 text-xs">Halo #{u.chamado_halo_id}</span>
                    </div>
                    <span className="text-slate-500 text-xs">
                      {u.motivo} · {new Date(u.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {aba === "reposicoes" && (
        <div className="px-6 mt-5 space-y-2">
          {reposicoes.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma reposição registrada ainda.</p>
          )}
          {reposicoes.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{r.item_tipos?.nome} × {r.quantidade}</span>
                <span className={`badge ${STATUS_REPOSICAO_COLOR[r.status]}`}>
                  {STATUS_REPOSICAO_LABEL[r.status]}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                {r.codigo_retirada && (
                  <span className="font-mono text-purple">Código: {r.codigo_retirada}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
