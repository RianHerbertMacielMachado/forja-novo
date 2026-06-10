# ⚔️ Sistema de Forja — RPG Weapon Forge

Sistema web completo para gerenciamento de uma forja de armas de RPG, com catálogo de produtos, sistema de pedidos, painel de forjadores e painel administrativo.

---

## 🏗️ Arquitetura

```
/projeto
  /backend    → API REST Node.js + Express + PostgreSQL
  /frontend   → React + Vite + TailwindCSS
```

**3 serviços no Railway:**
1. **PostgreSQL** — banco de dados nativo Railway
2. **Backend** — Node.js/Express (pasta `/backend`)
3. **Frontend** — React buildado servido via `serve` (pasta `/frontend`)

---

## 🚀 Deploy no Railway — Passo a Passo

### 1. Criar Projeto no Railway
1. Acesse [railway.app](https://railway.app) e crie um novo projeto
2. Clique em **"New Project"** → **"Empty Project"**

### 2. Adicionar PostgreSQL
1. Clique em **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. O Railway cria automaticamente a variável `DATABASE_URL`

### 3. Deploy do Backend
1. Clique em **"+ New"** → **"GitHub Repo"**
2. Selecione seu repositório e configure:
   - **Root Directory:** `/backend`
   - O `railway.toml` cuida do build e start automaticamente
3. Vincule o PostgreSQL ao Backend:
   - Vá em **Variables** do serviço backend
   - Clique em **"Add Variable Reference"** → selecione o PostgreSQL
   - Isso injeta `DATABASE_URL` automaticamente
4. Adicione as seguintes **variáveis de ambiente** no Backend:

| Variável | Valor |
|---|---|
| `JWT_SECRET` | string aleatória longa (ex: `forge_super_secret_2024_xyz`) |
| `JWT_EXPIRES_IN` | `8h` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | sua senha admin segura |
| `FRONTEND_URL` | URL do frontend (preencher após step 4) |
| `NODE_ENV` | `production` |
| `DISCORD_BOT_TOKEN` | (opcional) token do bot Discord |

5. Aguarde o deploy e **copie a URL pública** do backend (ex: `https://backend-xyz.up.railway.app`)

### 4. Executar Migrations
Após o primeiro deploy do backend, execute via Railway CLI ou pelo terminal do serviço:
```bash
npm run migrate
```
Ou configure como **Release Command** nas configurações do serviço:
- Em **Settings** → **Deploy** → **Release Command**: `npm run migrate`

> ⚠️ Execute o migrate apenas uma vez no primeiro deploy!

### 5. Deploy do Frontend
1. Clique em **"+ New"** → **"GitHub Repo"**
2. Configure:
   - **Root Directory:** `/frontend`
3. Adicione a variável:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL pública do backend (ex: `https://backend-xyz.up.railway.app`) |

4. Aguarde o deploy e **copie a URL pública** do frontend
5. Volte ao serviço **Backend** e atualize `FRONTEND_URL` com a URL do frontend

---

## 💻 Rodando Localmente

### Requisitos
- Node.js 18+
- PostgreSQL local ou Docker

### Backend
```bash
cd backend
cp .env.example .env
# Edite .env com sua DATABASE_URL local e demais variáveis
npm install
npm run migrate
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edite VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

### Acesso local
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

---

## 🗃️ Banco de Dados

### Tabelas principais:
- `admins` — administradores do sistema
- `forjadores` — forjadores cadastrados
- `registration_tokens` — tokens únicos de cadastro
- `materiais` — matérias-primas
- `produtos` — itens forjáveis (básico/encantado)
- `produto_materiais` — receitas (relação produto × material)
- `pedidos` — pedidos de clientes e forjadores
- `pedido_itens` — itens de cada pedido
- `pedido_transferencias` — transferências entre forjadores
- `logs` — auditoria completa do sistema
- `configuracoes` — configurações chave-valor

---

## 🌐 Rotas do Sistema

| URL | Acesso | Descrição |
|---|---|---|
| `/` | Público | Catálogo de produtos + carrinho |
| `/consulta` | Público | Consultar status de pedido |
| `/cadastro` | Público | Cadastro de novo forjador (requer token) |
| `/forjador/login` | Público | Login do forjador |
| `/forjador/fila` | Forjador | Fila de pedidos disponíveis |
| `/forjador/catalogo` | Forjador | Catálogo para pedidos manuais |
| `/forjador/meus-pedidos` | Forjador | Pedidos em atendimento |
| `/forjador/transferencias` | Forjador | Transferências recebidas |
| `/forjador/configuracoes` | Forjador | Webhook e senha |
| `/admin/login` | Admin | Login administrativo |
| `/admin` | Admin | Dashboard analítico |
| `/admin/forjadores` | Admin | Gerenciar forjadores |
| `/admin/pedidos` | Admin | Todos os pedidos |
| `/admin/produtos` | Admin | CRUD de produtos |
| `/admin/materiais` | Admin | CRUD de materiais |
| `/admin/logs` | Admin | Logs do sistema |
| `/admin/configuracoes` | Admin | Webhooks, tokens, senhas |

---

## 🔑 Credenciais Iniciais

- **Admin:** usuário e senha definidos em `ADMIN_USERNAME` e `ADMIN_PASSWORD`
- **Token de cadastro inicial:** `FORJA2024` (gerado no seed)
- Após o primeiro cadastro de forjador, um novo token é gerado automaticamente

---

## 🖼️ Imagens dos Produtos

Salve as imagens dos produtos em:
```
/frontend/public/images/{NomeDoProduto}.png
```

Exemplos:
- `Espada de Ferro.png`
- `Espada Arcana.png`
- `Martelo do Trovão.png`
- `Flechas.png`

Uma imagem `default.png` é usada como fallback quando o arquivo não existe.

---

## 🔔 Discord Webhooks

Configure no painel admin (`/admin/configuracoes`):
1. **Webhook de Novos Pedidos** — notificação quando cliente faz pedido
2. **Webhook do Token de Cadastro** — exibe token para novos forjadores

Cada forjador pode configurar sua **webhook pessoal** em `/forjador/configuracoes`.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express |
| Banco de Dados | PostgreSQL (Railway) |
| Autenticação | JWT + bcryptjs |
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS |
| Gráficos | Chart.js + react-chartjs-2 |
| Forms | react-hook-form |
| Notificações | react-toastify |
| HTTP Client | Axios |
| Deploy | Railway |

---

## 📋 Funcionalidades Implementadas

### Área do Cliente (público)
- ✅ Catálogo de produtos com filtros e busca
- ✅ Carrinho de compras lateral
- ✅ Finalização de pedido com dados do cliente
- ✅ Consulta de pedido por Registro ID ou Passaporte
- ✅ Histórico de status do pedido

### Área do Forjador
- ✅ Login com JWT
- ✅ Cadastro via token único
- ✅ Fila de pedidos disponíveis
- ✅ Catálogo para pedidos manuais
- ✅ Gerenciamento de pedidos em atendimento
- ✅ Atualização de status com 4 opções
- ✅ Copiar resumo do pedido
- ✅ Sistema de transferência entre forjadores
- ✅ Webhook pessoal do Discord
- ✅ Alteração de senha

### Painel Administrativo
- ✅ Dashboard com gráficos (Doughnut, Bar, Line)
- ✅ Gerenciamento de forjadores (editar, desativar, resetar senha)
- ✅ Visualização de todos os pedidos com filtros
- ✅ CRUD completo de produtos com receitas de materiais
- ✅ CRUD de materiais
- ✅ Logs do sistema com exportação CSV
- ✅ Configuração de webhooks globais
- ✅ Gerenciamento de token de cadastro
- ✅ Configuração do Discord Bot Token
- ✅ Alteração de senha admin

### Discord
- ✅ Notificação de novo pedido (webhook global)
- ✅ Notificação ao forjador (webhook pessoal)
- ✅ Atualização de mensagem do token de cadastro
- ✅ DM ao cliente (estrutura preparada, requer bot token)

---

## ⚠️ Notas Importantes

1. **Migrations:** Execute `npm run migrate` no primeiro deploy do backend
2. **FRONTEND_URL:** Atualize no backend após fazer deploy do frontend
3. **Token inicial:** `FORJA2024` — mude após o primeiro cadastro
4. **Imagens:** Salve em `/frontend/public/images/` com nome exato do produto
5. **SSL:** Railway gerencia SSL automaticamente — não configure certificados manualmente
