# Sortenaweb - Guia de Deploy

## 1. Configurar Supabase

### Criar Projeto
1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em "New Project"
3. Nome: `sortenaweb`
4. Escolha uma região próxima (ex: South America - São Paulo)
5. Defina uma senha forte para o banco de dados
6. Clique em "Create new project"

### Executar o Schema SQL
1. No painel do Supabase, vá em **SQL Editor**
2. Clique em "New Query"
3. Cole todo o conteúdo do arquivo `supabase-schema.sql`
4. Clique em "Run" para criar todas as tabelas, índices, RLS e funções

### Configurar Autenticação
1. Vá em **Authentication > Providers**
2. Certifique-se que **Email** está habilitado
3. Em **Authentication > URL Configuration**, configure:
   - Site URL: `https://sortenaweb.online`
   - Redirect URLs: `https://sortenaweb.online/auth/callback`

### Copiar as Chaves
1. Vá em **Settings > API**
2. Copie:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public key** (a chave pública)

---

## 2. Configurar o Projeto Local

### Editar `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
NEXT_PUBLIC_APP_URL=https://sortenaweb.online
```

### Testar Localmente
```bash
npm install
npm run dev
```
Acesse `http://localhost:3000`

---

## 3. Deploy na Vercel

### Via GitHub (Recomendado)
1. Crie um repositório no GitHub
2. Faça push do código:
```bash
git init
git add .
git commit -m "Initial commit - Sortenaweb"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sortenaweb.git
git push -u origin main
```

3. Acesse [vercel.com](https://vercel.com) e faça login
4. Clique em "New Project"
5. Importe o repositório `sortenaweb`
6. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = sua URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua chave anon
   - `NEXT_PUBLIC_APP_URL` = `https://sortenaweb.online`
7. Clique em "Deploy"

### Configurar Domínio Personalizado
1. No painel da Vercel, vá no projeto > **Settings > Domains**
2. Adicione: `sortenaweb.online`
3. A Vercel mostrará os registros DNS necessários
4. No seu provedor de domínio, configure:
   - **Tipo A**: `76.76.21.21` (apontando para `@`)
   - **Tipo CNAME**: `cname.vercel-dns.com` (apontando para `www`)
5. Aguarde a propagação DNS (até 48h, normalmente menos de 1h)

---

## 4. Primeiro Acesso

1. Acesse `https://sortenaweb.online`
2. Clique em "Começar Agora" ou "Registrar"
3. Crie sua conta com email e senha
4. Acesse o Dashboard e comece a criar sorteios!

---

## Estrutura de Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/auth/login` | Login |
| `/auth/register` | Registro |
| `/dashboard` | Painel principal |
| `/dashboard/sorteios` | Lista de sorteios |
| `/dashboard/sorteios/new` | Criar novo sorteio |
| `/dashboard/sorteios/[id]` | Detalhes do sorteio |
| `/dashboard/sorteios/[id]/premios` | Gerenciar prêmios |
| `/dashboard/sorteios/[id]/participantes` | Gerenciar participantes |
| `/dashboard/sorteios/[id]/sortear` | Realizar sorteio |
| `/sorteio/[slug]` | Página pública do sorteio |
| `/sorteio/[slug]/resultado` | Resultados (revelação de prêmios) |

---

## Tecnologias Utilizadas

- **Next.js 16** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Supabase** - Auth + PostgreSQL + RLS
- **Vercel** - Hosting + CDN
- **Lucide React** - Ícones
