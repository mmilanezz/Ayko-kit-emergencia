"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";

const STATUS_LABEL = {
  ok: "OK",
  faltando: "Faltando",
  danificado: "Danificado",
};

const STATUS_COLOR = {
  ok: "bg-green/15 text-green",
  faltando: "bg-red/15 text-red",
  danificado: "bg-orange/15 text-orange",
};

export default function TecnicoPage() {
  const supabase = createClient();
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [dupla, setDupla] = useState(null);
  const [itens, setItens] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [tipoConferencia, setTipoConferencia] = useState("recebimento");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfilData } = await supabase
      .from("profiles")
      .select("*, duplas(*, kits(nome))")
      .eq("id", user.id)
      .single();

    setPerfil(perfilData);
    setDupla(perfilData?.duplas);

    if (perfilData?.duplas?.kit_id) {
      const { data: instancias } = await supabase
        .from("kit_item_instancias")
        .select("*, item_tipos(nome, requer_identificacao)")
        .eq("kit_id", perfilData.duplas.kit_id)
        .order("created_at");

      setItens(instancias || []);

      const respostasIniciais = {};
      (instancias || []).forEach((i) => {
        respostasIniciais[i.id] = {
          status: "ok",
          identificacao: i.identificacao || "",
        };
      });
      setRespostas(respostasIniciais);

      const { data: conferenciasAnteriores } = await supabase
        .from("conferencias")
        .select("id, tipo, created_at, observacoes")
        .eq("dupla_id", perfilData.dupla_id)
        .order("created_at", { ascending: false })
        .limit(5);

      setHistorico(conferenciasAnteriores || []);
    }

    setCarregando(false);
  }

  function atualizarResposta(instanciaId, campo, valor) {
    setRespostas((prev) => ({
      ...prev,
      [instanciaId]: { ...prev[instanciaId], [campo]: valor },
    }));
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

    const { error: erroItens } = await supabase
      .from("conferencia_itens")
      .insert(linhasItens);

    // atualiza o status "atual" de cada instância do kit
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

    // notifica o Suprimentos por e-mail se algum item ficou pendente
    // (best-effort: não bloqueia o fluxo se o e-mail falhar)
    const itensPendentes = itens
      .filter((item) => (respostas[item.id]?.status || "ok") !== "ok")
      .map((item) => ({
        nome: item.item_tipos?.nome,
        status: STATUS_LABEL[respostas[item.id]?.status],
      }));

    if (itensPendentes.length > 0) {
      fetch("/api/notificar-reposicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duplaNome: dupla.nome,
          kitNome: dupla.kits?.nome || "",
          itens: itensPendentes,
        }),
      }).catch(() => {});
    }

    setSucesso(true);
    carregarDados();
    setTimeout(() => setSucesso(false), 4000);
  }

  if (carregando) {
    return (
      <main>
        <TopBar titulo="Checklist do kit" />
        <p className="p-6 text-slate-400">Carregando...</p>
      </main>
    );
  }

  if (!dupla?.kit_id) {
    return (
      <main>
        <TopBar titulo="Checklist do kit" />
        <p className="p-6 text-slate-400">
          Sua dupla ainda não tem um kit vinculado. Fale com o administrador.
        </p>
      </main>
    );
  }

  const faltandoOuDanificado = Object.values(respostas).filter(
    (r) => r.status !== "ok"
  ).length;

  return (
    <main className="max-w-2xl mx-auto pb-20">
      <TopBar
        titulo={dupla.nome}
        subtitulo={`Olá, ${perfil.nome} · confira o kit item a item`}
      />

      <form onSubmit={enviarConferencia} className="px-6 mt-6">
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <label className="block text-sm text-slate-400 mb-2">Tipo de conferência</label>
          <div className="flex gap-2">
            {["recebimento", "devolucao"].map((tipo) => (
              <button
                type="button"
                key={tipo}
                onClick={() => setTipoConferencia(tipo)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium border transition ${
                  tipoConferencia === tipo
                    ? "bg-purple/15 border-purple text-purple"
                    : "border-border text-slate-400"
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
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-sm">{item.item_tipos?.nome}</p>
                  <span className={`badge ${STATUS_COLOR[resposta.status]}`}>
                    {STATUS_LABEL[resposta.status]}
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  {["ok", "faltando", "danificado"].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => atualizarResposta(item.id, "status", s)}
                      className={`flex-1 rounded-lg py-2 text-xs font-medium border transition ${
                        resposta.status === s
                          ? STATUS_COLOR[s] + " border-transparent"
                          : "border-border text-slate-500"
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
                    onChange={(e) =>
                      atualizarResposta(item.id, "identificacao", e.target.value)
                    }
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

        {sucesso && (
          <p className="text-sm text-green mt-4">Conferência registrada com sucesso.</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full mt-5 rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white font-medium py-3 text-sm transition"
        >
          {enviando ? "Enviando..." : "Confirmar conferência e assinar"}
        </button>
      </form>

      {historico.length > 0 && (
        <div className="px-6 mt-10">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Últimas conferências</h2>
          <div className="space-y-2">
            {historico.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm"
              >
                <span>{h.tipo === "recebimento" ? "Recebimento" : "Devolução"}</span>
                <span className="text-slate-500">
                  {new Date(h.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
