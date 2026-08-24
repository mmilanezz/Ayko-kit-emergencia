"use client";

import { useEffect, useRef, useState } from "react";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function paraISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function paraExibicao(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Seletor de data com mini calendário — usar em todo filtro de data do
 * projeto, no lugar do <input type="date"> nativo do navegador.
 *
 * <DatePicker value={dataISO} onChange={(novaDataISO) => ...} />
 */
export default function DatePicker({ value, onChange, placeholder = "Selecionar data" }) {
  const [aberto, setAberto] = useState(false);
  const [mesVisivel, setMesVisivel] = useState(() => (value ? new Date(value + "T00:00:00") : new Date()));
  const ref = useRef(null);

  useEffect(() => {
    function fecharAoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  const ano = mesVisivel.getFullYear();
  const mes = mesVisivel.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();

  const celulas = [];
  for (let i = 0; i < diaSemanaInicio; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  function selecionarDia(dia) {
    onChange(paraISO(new Date(ano, mes, dia)));
    setAberto(false);
  }

  function mudarMes(delta) {
    setMesVisivel(new Date(ano, mes + delta, 1));
  }

  const hojeISO = paraISO(new Date());

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-purple text-left min-w-[130px] hover:border-purple/50 transition"
      >
        {value ? paraExibicao(value) : <span className="text-slate-500">{placeholder}</span>}
      </button>

      {aberto && (
        <div className="absolute left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 p-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => mudarMes(-1)} className="text-slate-400 hover:text-slate-100 px-2 text-lg leading-none">
              ‹
            </button>
            <p className="text-sm font-medium">{MESES[mes]} {ano}</p>
            <button type="button" onClick={() => mudarMes(1)} className="text-slate-400 hover:text-slate-100 px-2 text-lg leading-none">
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] text-slate-500 font-medium">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, idx) => {
              if (dia === null) return <div key={idx} />;
              const iso = paraISO(new Date(ano, mes, dia));
              const selecionado = iso === value;
              const hoje = iso === hojeISO;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => selecionarDia(dia)}
                  className={`text-xs rounded-lg py-1.5 transition ${
                    selecionado
                      ? "bg-purple text-white font-medium"
                      : hoje
                      ? "border border-purple text-purple"
                      : "text-slate-300 hover:bg-cardhover"
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setAberto(false); }}
              className="w-full text-center text-xs text-slate-500 hover:text-red mt-3 pt-2 border-t border-border transition"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
