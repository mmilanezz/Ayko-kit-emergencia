# AYKO · Kit Emergência

Sistema online (multiusuário, login com usuário/senha) para controle do kit
emergência por dupla: checklist de conferência no handoff do carro, geração
automática de pendência de reposição, e backoffice admin.

Stack: **Next.js 14** (App Router) + **Supabase** (Postgres + Auth + RLS) + **Vercel** (hospedagem).

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project** (plano free cobre tranquilamente 16 técnicos + admin + suprimentos).
2. Anote a **Project URL** e a **anon public key** em *Project Settings → API*.
3. Vá em **SQL Editor** → cole todo o conteúdo de `supabase/schema.sql` → **Run**.
   - Isso cria as tabelas, as políticas de RLS por papel, e já popula:
     - o catálogo dos 8 itens do kit (com a listagem que você passou)
     - **8 kits** ("Kit Emergência 01" a "08") e **8 duplas** ("Dupla 1" a "8"), cada uma já com seu kit e os itens padrão instanciados.
   - Depois, na tela **Duplas & Usuários** do app, renomeie as duplas pelos nomes reais dos seus técnicos.

## 2. Criar os primeiros usuários (login)

No painel Supabase → **Authentication → Users → Add user**:
- Crie um usuário pra você com seu e-mail, marcando **Auto Confirm User**.
- Crie um para o Suprimentos.
- Crie um para cada técnico (pode usar `nome.sobrenome@ayko.tech` como login).

Assim que o usuário é criado, um `profile` é gerado automaticamente com papel
**técnico** (via trigger). Depois, logado como admin no app, vá em
**Duplas & Usuários** e ajuste o papel de cada um (admin / suprimentos /
técnico) e vincule cada técnico à dupla certa.

> Importante: o **primeiro usuário admin** precisa ter o papel alterado
> direto no banco, já que a tela de admin só é visível pra quem já é admin.
> No SQL Editor do Supabase:
> ```sql
> update profiles set role = 'admin' where id = 'UUID-DO-SEU-USUARIO';
> ```
> (o UUID aparece na lista de Authentication → Users)

## 3. Segurança extra: rodar o patch de RLS

Se você já rodou o `schema.sql` original antes desta atualização, rode
também `supabase/patch-seguranca-rls.sql` no SQL Editor do Supabase — ele
fecha uma brecha onde um técnico logado conseguia, por fora da tela,
consultar diretamente o banco e ver a lista de todas as duplas e kits
(não só o próprio). Depois desse patch, cada técnico só enxerga a própria
dupla e o próprio kit em qualquer consulta, não só na tela.

Se você está criando o projeto do zero agora, pode pular esse passo — o
`schema.sql` já vem com essa proteção desde o início.

## 4. App para os técnicos (PWA)

O sistema agora é instalável como um app no celular, sem precisar de loja
de aplicativos:

- **Android (Chrome):** abrir o site → menu (⋮) → "Adicionar à tela
  inicial" ou "Instalar app".
- **iPhone (Safari):** abrir o site → ícone de compartilhar → "Adicionar à
  Tela de Início".

Depois de instalado, abre em tela cheia, com ícone próprio, sem barra de
navegador — visualmente idêntico a um app nativo. Isso já está pronto
nesta versão (manifest + ícones + service worker), não exige nenhuma
configuração extra da sua parte.

## 5. Notificação por e-mail (opcional, mas recomendado)

Quando uma conferência gera pendência de reposição, o sistema pode avisar o
Suprimentos por e-mail automaticamente. Isso usa o [Resend](https://resend.com),
que tem plano gratuito.

1. Crie uma conta em resend.com (pode usar login com Google).
2. No painel, vá em **API Keys → Create API Key** e copie o valor gerado.
3. Na Vercel, adicione duas variáveis de ambiente (Production and Preview):
   - `RESEND_API_KEY` → a chave que você copiou
   - `SUPRIMENTOS_EMAIL` → o e-mail que deve receber os avisos
4. Redeploy.

Se você pular essa parte, o sistema funciona normalmente — só não manda
e-mail (a pendência continua aparecendo no Dashboard e na tela do
Suprimentos de qualquer forma).

## 6. Rodar localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase
npm run dev
```

Acesse `http://localhost:3000` — você será redirecionado pro login.

## 7. Publicar (Vercel)

1. Suba este projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New Project** → importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Você recebe uma URL pública (ex: `ayko-kit.vercel.app`) — pode
   depois apontar um domínio próprio se quiser.

## Como o fluxo funciona no app

- **Técnico** loga → vê só o kit da própria dupla → escolhe "Recebimento" ou
  "Devolução" → marca item a item (OK / Faltando / Danificado) e confirma o
  número de patrimônio de cada item → assina enviando o formulário.
- Sempre que um item entra como **Faltando** ou **Danificado**, uma
  **reposição pendente** é criada automaticamente (trigger no banco) — sem
  o técnico precisar lembrar de nada.
- **Suprimentos** loga → vê a fila de reposições pendentes de todos os kits →
  pode anotar o número do chamado no Halo e marcar como atendida.
- **Admin (você)** loga → vê o dashboard com status de todos os 8 kits em
  tempo real, reposições pendentes e histórico de conferências → gerencia o
  catálogo de itens, as instâncias físicas de cada kit e o vínculo
  técnico → dupla → kit.

## Próximos passos possíveis

- Integração automática com a API do Halo (hoje o número do chamado é
  anotado manualmente pelo Suprimentos).
- Notificação (e-mail/WhatsApp) quando uma reposição pendente é criada.
- Exportar relatório de conferências em Excel/PDF.
