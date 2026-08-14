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

  const { id, status } = await request.json();

  if (!id || !["ativo", "inativo", "ferias"].includes(status)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // "inativo" também bloqueia o login de fato; os outros status liberam
  const { error: erroBan } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: status === "inativo" ? "876000h" : "none",
  });
  if (erroBan) {
    return NextResponse.json({ error: erroBan.message }, { status: 400 });
  }

  const { error: erroPerfil } = await supabaseAdmin
    .from("profiles")
    .update({ status })
    .eq("id", id);
  if (erroPerfil) {
    return NextResponse.json({ error: erroPerfil.message }, { status: 400 });
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
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
