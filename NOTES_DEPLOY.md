# Guia de Deploy no Cloudflare Pages

Este projeto está pronto para ser implantado no Cloudflare Pages.

## 1. Rodar Localmente

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis:**
   Crie um arquivo `.env` na raiz (copie do `.env.example`) e preencha com suas chaves:
   ```env
   VITE_SUPABASE_URL=sua_url_aqui
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
   ```

3. **Rodar o servidor:**
   ```bash
   npm run dev
   ```
   O app abrirá em `http://localhost:3000`.

## 2. GitHub (Repositório)

1. Crie um novo repositório vazio no GitHub.
2. No seu terminal, na pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Cloudflare deploy"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/NOMEDO-REPO.git
   git push -u origin main
   ```

## 3. Criar Projeto no Cloudflare Pages

1. Acesse o painel do [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
2. Clique em **Create Application** > Aba **Pages** > **Connect to Git**.
3. Selecione o repositório que você acabou de criar.
4. Na tela de configuração de build ("Set up builds and deployments"):
   *   **Production branch:** `main`
   *   **Framework preset:** Selecione `Vite` (ou `React`, mas Vite é mais preciso).
   *   **Build command:** `npm run build`
   *   **Build output directory:** `dist`

## 4. Configurar Variáveis de Ambiente (Environment Variables)

**ANTES** de clicar em "Save and Deploy" (ou logo após, na aba Settings):

1. Vá em **Environment variables** (no setup inicial ou em Settings do projeto).
2. Adicione as mesmas variáveis do seu `.env`:
   *   `VITE_SUPABASE_URL` : (Sua URL do Supabase)
   *   `VITE_SUPABASE_ANON_KEY` : (Sua chave Anon do Supabase)

## 5. Deploy Automático

*   Após salvar, o Cloudflare fará o primeiro build.
*   **Todo `git push` na branch `main` disparará um novo deploy automático.**
*   Você pode acompanhar o status na aba **Deployments**.

Se tiver dúvidas, consulte a documentação oficial do [Vite](https://vitejs.dev/guide/static-deploy.html#cloudflare-pages).
