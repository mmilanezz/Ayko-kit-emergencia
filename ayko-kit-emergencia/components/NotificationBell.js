"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabaseClient";

const TIPO_ICONE = {
  nova_reposicao: "📦",
  pronto_retirada: "✅",
  entregue: "🎉",
};

function tempoRelativo(dataISO) {
  const diffMs = Date.now() - new Date(dataISO).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function NotificationBell() {
  const supabase = createClient();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    carregar();

    // atualiza a cada 30s, sem precisar recarregar a página
    const intervalo = setInterval(carregar, 30000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    function fecharAoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotificacoes(data || []);
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function marcarComoLida(id) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }

  async function marcarTodasComoLidas() {
    const idsNaoLidas = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (idsNaoLidas.length === 0) return;
    await supabase.from("notificacoes").update({ lida: true }).in("id", idsNaoLidas);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  async function abrirNotificacao(n) {
    if (!n.lida) await marcarComoLida(n.id);
    setAberto(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(!aberto)}
        className="relative text-slate-400 hover:text-slate-100 border border-border rounded-lg px-3 py-1.5 transition no-print"
        aria-label="Notificações"
      >
        🔔
        {naoLidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
            <p className="text-sm font-medium">Notificações</p>
            {naoLidas > 0 && (
              <button onClick={marcarTodasComoLidas} className="text-xs text-purple hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notificacoes.length === 0 && (
            <p className="text-sm text-slate-500 px-4 py-6 text-center">Nenhuma notificação ainda.</p>
          )}

          {notificacoes.map((n) => (
            <button
              key={n.id}
              onClick={() => abrirNotificacao(n)}
              className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition hover:bg-cardhover ${
                !n.lida ? "bg-purple/5" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">{TIPO_ICONE[n.tipo] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{n.titulo}</p>
                    {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-purple shrink-0" />}
                  </div>
                  {n.mensagem && <p className="text-xs text-slate-400 mt-0.5">{n.mensagem}</p>}
                  <p className="text-xs text-slate-600 mt-1">{tempoRelativo(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
