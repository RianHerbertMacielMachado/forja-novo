-- ============================================
-- SCHEMA DO SISTEMA DE FORJA
-- ============================================

-- Tabela de Admins
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Forjadores
CREATE TABLE IF NOT EXISTS forjadores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  rp_id VARCHAR(100) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  discord_webhook VARCHAR(500),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Tokens de Registro
CREATE TABLE IF NOT EXISTS registration_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(20) UNIQUE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  used_by INTEGER REFERENCES forjadores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Materiais
CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) UNIQUE NOT NULL,
  tipo VARCHAR(20) CHECK(tipo IN ('basico', 'encantado')) NOT NULL,
  valor_unitario NUMERIC(10,2) NOT NULL,
  quantidade_minima INTEGER DEFAULT 1,
  multiplo_quantidade INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produto-Materiais (receitas)
CREATE TABLE IF NOT EXISTS produto_materiais (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materiais(id),
  quantidade INTEGER NOT NULL
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  registro_id VARCHAR(20) UNIQUE NOT NULL,
  cliente_nome VARCHAR(200) NOT NULL,
  cliente_passaporte VARCHAR(100) NOT NULL,
  cliente_discord_tag VARCHAR(100),
  forjador_id INTEGER REFERENCES forjadores(id),
  status VARCHAR(30) CHECK(status IN ('na_fila','coletando_materiais','em_producao','concluido')) DEFAULT 'na_fila',
  total NUMERIC(10,2) NOT NULL,
  origem VARCHAR(20) CHECK(origem IN ('cliente','forjador')) DEFAULT 'cliente',
  sem_dados_cliente BOOLEAN DEFAULT FALSE,
  discord_forjador_message_id VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  valor_unitario NUMERIC(10,2) NOT NULL
);

-- Tabela de Transferências de Pedidos
CREATE TABLE IF NOT EXISTS pedido_transferencias (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES pedidos(id),
  forjador_origem_id INTEGER REFERENCES forjadores(id),
  forjador_destino_id INTEGER REFERENCES forjadores(id),
  status VARCHAR(20) CHECK(status IN ('pendente','aceito','recusado')) DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Logs
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  actor_tipo VARCHAR(50),
  actor_id INTEGER,
  pedido_id INTEGER REFERENCES pedidos(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(100) PRIMARY KEY,
  valor TEXT
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pedidos_forjador ON pedidos(forjador_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_passaporte ON pedidos(cliente_passaporte);
CREATE INDEX IF NOT EXISTS idx_pedidos_registro_id ON pedidos(registro_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_produto_materiais_produto ON produto_materiais(produto_id);
CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_pedido ON logs(pedido_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_destino ON pedido_transferencias(forjador_destino_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_status ON pedido_transferencias(status);
