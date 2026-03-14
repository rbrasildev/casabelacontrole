# Workspace

## Overview

Sistema de Gestão para Casa de Apoio — uma plataforma web completa para gerenciar residentes, finanças, estoque e atividades de uma casa de apoio/lar de idosos.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui, Recharts, React Query
- **Auth**: Replit Auth (OIDC/PKCE) via `@workspace/replit-auth-web`

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── casa-apoio/         # React frontend (served at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── replit-auth-web/    # Auth hook for React frontend
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

### Authentication & Authorization
- Replit Auth via OIDC/PKCE (no custom login forms)
- Role-based access: admin, manager, staff, viewer
- User management page (admin/manager only)
- Inactive user session invalidation
- Session stored in PostgreSQL with 7-day TTL

### Dashboard
- Visão geral com métricas principais
- Residentes ativos, saldo mensal, pagamentos pendentes, alertas de estoque
- Transações recentes e próximas atividades

### Residentes
- Listagem com busca e filtro por status
- Cadastro completo (nome, CPF, data de nascimento, telefone, contato de emergência, quarto, mensalidade)
- Status: ativo / desligado

### Financeiro
- Controle de entradas e saídas
- Filtro por tipo, mês e ano
- Categorias: Mensalidade, Doação, Convênio, Alimentação, Medicamentos, etc.
- Status: pago, pendente, vencido
- Vínculo opcional com residente

### Estoque
- Controle de itens com quantidade mínima configurável
- Alertas visuais para itens abaixo do mínimo
- Categorias: Higiene, Alimentação, Medicamentos, Materiais

### Atividades
- Agenda de atividades com data, hora e responsável
- Tipos: médica, terapia, recreação, administrativa, limpeza, outros
- Status: pendente, concluída, cancelada
- Vínculo opcional com residente

### Vaquinha (Crowdfunding)
- Campanhas com meta, valor arrecadado, progresso
- Contribuições com rastreamento de doadores
- Chave PIX com botão de cópia
- CRUD completo de campanhas e contribuições

### Relatórios
- Gráficos de fluxo financeiro mensal
- Distribuição de residentes por status
- Visão geral de categorias de despesas

### Registro de Usuários
- Listagem de todos os usuários cadastrados
- Filtro por nome, e-mail e cargo
- Alterar cargo (admin, gerente, colaborador, visualizador)
- Ativar/desativar usuários
- Exclusão de usuários com confirmação
- Acesso restrito a administradores e gerentes

## Database Schema

- `users` - Usuários do sistema (id, email, nome, cargo, status ativo)
- `sessions` - Sessões de autenticação
- `residents` - Residentes da casa
- `finances` - Transações financeiras
- `inventory` - Itens de estoque
- `activities` - Atividades e agenda
- `campaigns` - Campanhas de vaquinha
- `contributions` - Contribuições das campanhas

## API Routes

All routes prefixed with `/api`:
- `GET /auth/user` - Usuário autenticado atual
- `GET /auth/me` - Dados completos do usuário (com cargo)
- `GET/LOGIN /login` - Inicia fluxo OIDC
- `GET /logout` - Encerra sessão
- `GET/PUT/DELETE /users/:id` - Gerenciar usuários (admin/manager)
- `GET/POST /residents` - Lista e cria residentes
- `GET/PUT/DELETE /residents/:id` - Operações individuais
- `GET/POST /finances` - Lista e cria transações
- `PUT/DELETE /finances/:id` - Operações individuais
- `GET/POST /inventory` - Lista e cria itens
- `PUT/DELETE /inventory/:id` - Operações individuais
- `GET/POST /activities` - Lista e cria atividades
- `PUT/DELETE /activities/:id` - Operações individuais
- `GET /dashboard/stats` - Estatísticas do dashboard
- `GET/POST /campaigns` - Campanhas de vaquinha
- `PUT/DELETE /campaigns/:id` - Operações individuais
- `POST /campaigns/:id/contributions` - Adicionar contribuição
- `DELETE /contributions/:id` - Remover contribuição

## Running

- Frontend: `pnpm --filter @workspace/casa-apoio run dev` (port 23522)
- API: `pnpm --filter @workspace/api-server run dev` (port 8080)
- DB push: `cd lib/db && pnpm exec drizzle-kit push`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
