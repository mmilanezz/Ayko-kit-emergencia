"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";

export default function PerfilPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const obrigatorio = searchParams.get("obrigatorio") === "1";

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  const [enviandoNome, setEnviandoNome] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const [sucessoSenha, setSucessoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setPerfil({ ...data, email: user.email });
    setNome(data?.nome || "");
    setCarregando(false);
  }

  async function salvarNome(e) {
    e.preventDefault();
    setEnviandoNome(true);
    const { error } = await supabase.from("profiles").update({ nome }).eq("id", perfil.id);
    setEnviandoNome(false);
    if (error) {
      alert("Erro ao salvar nome: " + error.message);
      return;
    }
    carregar();
  }

  async function enviarFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviandoFoto(true);
    const extensao = arquivo.name.split(".").pop();
    const caminho = `${perfil.id}/avatar.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("avatars")
      .upload(caminho, arquivo, { upsert: true });

    if (erroUpload) {
      setEnviandoFoto(false);
      alert("Erro ao enviar foto: " + erroUpload.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(caminho);
    // adiciona timestamp pra forçar o navegador a buscar a imagem nova, não a antiga em cache
    const urlComVersao = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: erroPerfil } = await supabase
      .from("profiles")
      .update({ avatar_url: urlComVersao })
      .eq("id", perfil.id);

    setEnviandoFoto(false);

    if (erroPerfil) {
      alert("Erro ao salvar foto: " + erroPerfil.message);
      return;
    }
    carregar();
  }

  async function trocarSenha(e) {
    e.preventDefault();
    setErroSenha("");

    if (novaSenha.length < 6) {
      setErroSenha("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas não coincidem.");
      return;
    }

    setEnviandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      setEnviandoSenha(false);
      setErroSenha(error.message);
      return;
    }

    // marca que o primeiro acesso já foi feito, se for o caso
    await supabase.from("profiles").update({ precisa_trocar_senha: false }).eq("id", perfil.id);

    setEnviandoSenha(false);
    setSucessoSenha(true);
    setNovaSenha("");
    setConfirmarSenha("");

    if (obrigatorio) {
      setTimeout(() => router.push("/"), 1500);
    }
  }

  if (carregando) {
    return (
      <main>
        <TopBar titulo="Meu Perfil" />
        <p className="p-6 text-slate-400">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto pb-20">
      <TopBar titulo="Meu Perfil" subtitulo={perfil.email} />

      {obrigatorio && (
        <div className="mx-6 mt-6 bg-orange/10 border border-orange/30 rounded-xl p-4">
          <p className="text-sm text-orange font-medium">Primeiro acesso — troque sua senha</p>
          <p className="text-xs text-slate-400 mt-1">
            Por segurança, você precisa definir uma senha nova antes de continuar usando o sistema.
          </p>
        </div>
      )}

      <div className="px-6 mt-6 space-y-6">
        {/* FOTO */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <label className="block text-sm text-slate-400 mb-3">Foto de perfil</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-bg border border-border overflow-hidden flex items-center justify-center shrink-0">
              {perfil.avatar_url ? (
                <img src={perfil.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-slate-500">{perfil.nome?.[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
            <label className="text-sm text-purple hover:underline cursor-pointer">
              {enviandoFoto ? "Enviando..." : "Alterar foto"}
              <input type="file" accept="image/*" onChange={enviarFoto} disabled={enviandoFoto} className="hidden" />
            </label>
          </div>
        </div>

        {/* NOME */}
        {!obrigatorio && (
          <form onSubmit={salvarNome} className="bg-card border border-border rounded-2xl p-5">
            <label className="block text-sm text-slate-400 mb-2">Nome</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="flex-1 rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
              />
              <button
                type="submit"
                disabled={enviandoNome}
                className="rounded-lg bg-purple text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </form>
        )}

        {/* SENHA */}
        <form onSubmit={trocarSenha} className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <label className="block text-sm text-slate-400">Trocar senha</label>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Nova senha</label>
            <input
              type="password"
              required
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              required
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
              placeholder="••••••••"
            />
          </div>

          {erroSenha && <p className="text-sm text-red">{erroSenha}</p>}
          {sucessoSenha && (
            <p className="text-sm text-green">
              Senha alterada com sucesso{obrigatorio ? " — redirecionando..." : "."}
            </p>
          )}

          <button
            type="submit"
            disabled={enviandoSenha}
            className="w-full rounded-lg bg-purple hover:bg-purple/90 disabled:opacity-50 text-white font-medium py-2.5 text-sm transition"
          >
            {enviandoSenha ? "Salvando..." : "Trocar senha"}
          </button>
        </form>
      </div>
    </main>
  );
}
