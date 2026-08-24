"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabaseClient";
import NotificationBell from "./NotificationBell";

export default function TopBar({ titulo, subtitulo }) {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between px-6 py-5 border-b border-border">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-purple mb-0.5">
          AYKO · Kit Emergência
        </p>
        <h1 className="text-lg font-semibold">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-400">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-2 no-print">
        <NotificationBell />
        <button
          onClick={() => router.push("/perfil")}
          className="text-slate-400 hover:text-slate-100 border border-border rounded-lg px-3 py-1.5 transition"
          aria-label="Meu perfil"
        >
          👤
        </button>
        <button
          onClick={sair}
          className="text-sm text-slate-400 hover:text-slate-100 border border-border rounded-lg px-3 py-1.5 transition"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
