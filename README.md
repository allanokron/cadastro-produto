# OKRon — Cadastro de Produtos Senior × Tiny

Sistema interno para ler cinco bases públicas do Google Sheets, cruzar produtos do Senior e Tiny, revisar pendências e gerar arquivos XLSX para importação manual no Tiny/Olist Tiny.

## Funcionalidades

- Login administrativo simples, sem troca obrigatória da senha inicial.
- Configuração das bases Senior, Tiny, estoque, classificação, preços e custos.
- Mapeamento livre dos títulos das colunas e teste das conexões.
- Cruzamento por SKU e, como alternativa, EAN; conflitos ambíguos nunca são resolvidos automaticamente.
- Pendências, validação de IDs, correções físicas, geração de descrições por OpenAI, URLs de imagens e variações.
- Mapeamento do modelo Tiny, validação de obrigatórios, exportação XLSX e histórico de downloads.
- Arquivos privados no Vercel Blob e dados persistidos no Neon PostgreSQL.

## Executar localmente

Requisitos: Node.js 22+, pnpm e um projeto Neon.

1. Copie `.env.example` para `.env.local` e preencha as variáveis.
2. Instale as dependências com `pnpm install`.
3. Gere o cliente: `pnpm db:generate`.
4. Aplique as migrations: `pnpm db:deploy`.
5. Crie o administrador: `pnpm db:seed`.
6. Inicie: `pnpm dev`.

O usuário inicial é `admin`. Defina a senha por meio de `INITIAL_ADMIN_PASSWORD` antes de executar o seed.

## Neon

- Use a URL com `-pooler` em `DATABASE_URL` para a aplicação serverless.
- Use a URL direta em `DIRECT_URL` para migrations.
- O schema versionado está em `prisma/schema.prisma`; migrations ficam em `prisma/migrations`.
- Nunca versione strings de conexão reais.

## OpenAI

Configure `OPENAI_API_KEY` apenas no servidor. `OPENAI_MODEL` usa `gpt-5.6-luna` por padrão e pode ser alterado sem mudança de código. Toda geração fica como rascunho até revisão do administrador.

## Vercel

1. Importe o repositório e mantenha o preset Next.js.
2. Conecte um Vercel Blob privado.
3. Configure `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `INITIAL_ADMIN_PASSWORD`, `OPENAI_API_KEY` e `OPENAI_MODEL` em Preview e Production.
4. Execute `pnpm db:deploy` e `pnpm db:seed` antes do primeiro uso.
5. Publique e verifique `/api/health`.

## Qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

O GitHub Actions executa essas verificações em pull requests e em atualizações da branch `main`.

## Limites da primeira versão

- As fontes precisam ser Google Sheets públicas; não há escrita direta no Senior ou Tiny.
- Uma atualização aceita até 20 mil linhas por fonte no perfil inicial.
- A geração de IA processa no máximo 50 produtos por lote.
- A exportação aceita até 20 mil produtos selecionados.
