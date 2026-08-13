import { NextResponse } from "next/server";

export async function POST(request) {
  // se as variáveis não estiverem configuradas, a notificação é pulada
  // silenciosamente — o fluxo principal (conferência + reposição no banco)
  // nunca deve travar por causa do e-mail.
  if (!process.env.RESEND_API_KEY || !process.env.SUPRIMENTOS_EMAIL) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const { duplaNome, kitNome, itens } = await request.json();

    const listaItens = (itens || [])
      .map((i) => `<li><strong>${i.nome}</strong> — ${i.status}</li>`)
      .join("");

    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AYKO Kit Emergência <onboarding@resend.dev>",
        to: [process.env.SUPRIMENTOS_EMAIL],
        subject: `Reposição pendente — ${kitNome} (${duplaNome})`,
        html: `
          <p>Uma conferência gerou pendência de reposição:</p>
          <p><strong>Dupla:</strong> ${duplaNome}<br/>
          <strong>Kit:</strong> ${kitNome}</p>
          <ul>${listaItens}</ul>
          <p>Acesse o sistema para dar andamento.</p>
        `,
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      console.error("Erro ao enviar e-mail:", erro);
      return NextResponse.json({ ok: false, error: erro }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao notificar reposição:", err);
    // não propaga o erro — notificação é best-effort
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
