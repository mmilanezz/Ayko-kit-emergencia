"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("Usuário ou senha inválidos.");
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-2xl"
      >
        <div className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-purple mb-1">
            AYKO
          </p>
          <h1 className="text-xl font-semibold">Kit Emergência</h1>
          <p className="text-sm text-slate-400 mt-1">
            Entre com seu usuário para conferir o kit.
          </p>
        </div>

        <label className="block text-sm text-slate-400 mb-1.5">Usuário (e-mail)</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg bg-bg border border-border px-3 py-2.5 text-sm outline-none focus:border-purple transition"
          placeholder="tecnico@ayko.tech"
        />

        <label className="block text-sm text-slate-400 mb-1.5">Senha</label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-6 rounded-lg bg-bg border border-border px-3 py-2.5 text-sm outline-none focus:border-purple transition"
          placeholder="••••••••"
        />

        {erro && (
          <p className="text-sm text-red mb-4">{erro}</p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white font-medium py-2.5 text-sm transition"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
