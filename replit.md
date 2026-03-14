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
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

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

### Relatórios
- Gráficos de fluxo financeiro mensal
- Distribuição de residentes por status
- Visão geral de categorias de despesas

## Database Schema

- `residents` - Residentes da casa
- `finances` - Transações financeiras
- `inventory` - Itens de estoque
- `activities` - Atividades e agenda

## API Routes

All routes prefixed with `/api`:
- `GET/POST /residents` - Lista e cria residentes
- `GET/PUT/DELETE /residents/:id` - Operações individuais
- `GET/POST /finances` - Lista e cria transações
- `PUT/DELETE /finances/:id` - Operações individuais
- `GET/POST /inventory` - Lista e cria itens
- `PUT/DELETE /inventory/:id` - Operações individuais
- `GET/POST /activities` - Lista e cria atividades
- `PUT/DELETE /activities/:id` - Operações individuais
- `GET /dashboard/stats` - Estatísticas do dashboard

## Running

- Frontend: `pnpm --filter @workspace/casa-apoio run dev` (port 23522)
- API: `pnpm --filter @workspace/api-server run dev` (port 8080)
- DB push: `pnpm --filter @workspace/db run push`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
