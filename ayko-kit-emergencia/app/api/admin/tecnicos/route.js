import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";

async function exigirAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  const admin = await exigirAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: authData, error: erroAuth } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (erroAuth) {
    return NextResponse.json({ error: erroAuth.message }, { status: 400 });
  }

  const { data: perfis, error: erroPerfis } = await supabaseAdmin
    .from("profiles")
    .select("*, duplas(nome)")
    .in("role", ["tecnico", "suprimentos", "gestor"])
    .order("role")
    .order("nome");
  if (erroPerfis) {
    return NextResponse.json({ error: erroPerfis.message }, { status: 400 });
  }

  const agora = new Date();
  const usuarios = (perfis || []).map((perfil) => {
    const authUser = authData.users.find((u) => u.id === perfil.id);
    const banido = !!authUser?.banned_until && new Date(authUser.banned_until) > agora;
    return { ...perfil, email: authUser?.email || null, banido };
  });

  return NextResponse.json({ usuarios });
}

export async function POST(request) {
  const admin = await exigirAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { nome, email, senha, dupla_id, role } = await request.json();

  if (!nome || !email || !senha) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e senha." },
      { status: 400 }
    );
  }
  if (senha.length < 6) {
    return NextResponse.json(
      { error: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }
  const papel = ["tecnico", "suprimentos"].includes(role) ? role : "tecnico";

  const supabaseAdmin = createAdminClient();

  const { data: criado, error: erroCriacao } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });

  if (erroCriacao) {
    return NextResponse.json({ error: erroCriacao.message }, { status: 400 });
  }

  // o trigger on_auth_user_created já criou o profile com role 'tecnico';
  // aqui garantimos que nome, papel e dupla ficam certos desde o início
  const { error: erroPerfil } = await supabaseAdmin
    .from("profiles")
    .update({
      nome,
      role: papel,
      dupla_id: papel === "tecnico" ? dupla_id || null : null,
    })
    .eq("id", criado.user.id);

  if (erroPerfil) {
    return NextResponse.json({ error: erroPerfil.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: criado.user.id });
}

export async function PATCH(request) {
  const admin = await exigirAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id, status, email, senha, nome } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }
  if (status && !["ativo", "inativo", "ferias"].includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }
  if (senha && senha.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // tudo que envolve o login em si (e-mail, senha, bloqueio) vive no
  // Auth do Supabase — atualiza tudo numa chamada só
  const atualizacoesAuth = {};
  if (email) atualizacoesAuth.email = email;
  if (senha) atualizacoesAuth.password = senha;
  if (status) atualizacoesAuth.ban_duration = status === "inativo" ? "876000h" : "none";

  if (Object.keys(atualizacoesAuth).length > 0) {
    const { error: erroAuth } = await supabaseAdmin.auth.admin.updateUserById(id, atualizacoesAuth);
    if (erroAuth) {
      return NextResponse.json({ error: erroAuth.message }, { status: 400 });
    }
  }

  // nome/status também ficam espelhados em profiles, pra não precisar
  // consultar o Auth toda hora só pra exibir a lista
  const atualizacoesPerfil = {};
  if (status) atualizacoesPerfil.status = status;
  if (nome) atualizacoesPerfil.nome = nome;

  if (Object.keys(atualizacoesPerfil).length > 0) {
    const { error: erroPerfil } = await supabaseAdmin
      .from("profiles")
      .update(atualizacoesPerfil)
      .eq("id", id);
    if (erroPerfil) {
      return NextResponse.json({ error: erroPerfil.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const admin = await exigirAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // a API auth.admin.deleteUser() apresentou um bug intermitente
  // ("Database error deleting user") mesmo quando a exclusão direta
  // no banco funciona sem problema — por isso usamos uma função SQL
  // (via RPC) que faz a exclusão diretamente, contornando esse bug.
  const { error } = await supabaseAdmin.rpc("excluir_usuario_auth", { p_id: id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
