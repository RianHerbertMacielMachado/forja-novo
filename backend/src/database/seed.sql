-- ============================================
-- SEED INICIAL DO SISTEMA DE FORJA
-- ============================================

-- Inserir configurações padrão
INSERT INTO configuracoes (chave, valor) VALUES
  ('webhook_novos_pedidos', ''),
  ('webhook_token_cadastro', ''),
  ('webhook_token_cadastro_message_id', ''),
  ('discord_bot_token', ''),
  ('token_cadastro_atual', '')
ON CONFLICT (chave) DO NOTHING;

-- Inserir token inicial de cadastro
INSERT INTO registration_tokens (token) VALUES ('FORJA2024')
ON CONFLICT (token) DO NOTHING;

-- Atualizar configuração com o token inicial
UPDATE configuracoes SET valor = 'FORJA2024' WHERE chave = 'token_cadastro_atual';

-- Inserir materiais de exemplo
INSERT INTO materiais (nome) VALUES
  ('Minério de Ferro'),
  ('Carvão Arcano'),
  ('Pedra de Amolar'),
  ('Essência Mágica'),
  ('Couro de Dragão'),
  ('Cristal de Poder'),
  ('Madeira de Ébano')
ON CONFLICT (nome) DO NOTHING;

-- Inserir produtos de exemplo
INSERT INTO produtos (nome, tipo, valor_unitario, quantidade_minima, multiplo_quantidade, ativo) VALUES
  ('Espada de Ferro', 'basico', 150.00, 1, 1, true),
  ('Machado de Guerra', 'basico', 200.00, 1, 1, true),
  ('Adaga Élfica', 'basico', 80.00, 1, 1, true),
  ('Espada Arcana', 'encantado', 450.00, 1, 1, true),
  ('Martelo do Trovão', 'encantado', 600.00, 1, 1, true),
  ('Flechas', 'basico', 5.00, 100, 100, true)
ON CONFLICT (nome) DO NOTHING;

-- Inserir materiais dos produtos (receitas)
-- Espada de Ferro
INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 3
FROM produtos p, materiais m
WHERE p.nome = 'Espada de Ferro' AND m.nome = 'Minério de Ferro'
ON CONFLICT DO NOTHING;

INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 1
FROM produtos p, materiais m
WHERE p.nome = 'Espada de Ferro' AND m.nome = 'Carvão Arcano'
ON CONFLICT DO NOTHING;

INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 1
FROM produtos p, materiais m
WHERE p.nome = 'Espada de Ferro' AND m.nome = 'Pedra de Amolar'
ON CONFLICT DO NOTHING;

-- Machado de Guerra
INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 5
FROM produtos p, materiais m
WHERE p.nome = 'Machado de Guerra' AND m.nome = 'Minério de Ferro'
ON CONFLICT DO NOTHING;

INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 2
FROM produtos p, materiais m
WHERE p.nome = 'Machado de Guerra' AND m.nome = 'Carvão Arcano'
ON CONFLICT DO NOTHING;

-- Espada Arcana
INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 5
FROM produtos p, materiais m
WHERE p.nome = 'Espada Arcana' AND m.nome = 'Minério de Ferro'
ON CONFLICT DO NOTHING;

INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 3
FROM produtos p, materiais m
WHERE p.nome = 'Espada Arcana' AND m.nome = 'Essência Mágica'
ON CONFLICT DO NOTHING;

INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 2
FROM produtos p, materiais m
WHERE p.nome = 'Espada Arcana' AND m.nome = 'Cristal de Poder'
ON CONFLICT DO NOTHING;

-- Martelo do Trovão
INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 8
FROM produtos p, materiais m
WHERE p.nome = 'Martelo do Trovão' AND m.nome = 'Minério de Ferro'
ON CONFLICT DO NOTHING;

INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 5
FROM produtos p, materiais m
WHERE p.nome = 'Martelo do Trovão' AND m.nome = 'Cristal de Poder'
ON CONFLICT DO NOTHING;

INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 3
FROM produtos p, materiais m
WHERE p.nome = 'Martelo do Trovão' AND m.nome = 'Essência Mágica'
ON CONFLICT DO NOTHING;

-- Flechas (100 unidades)
INSERT INTO produto_materiais (produto_id, material_id, quantidade)
SELECT p.id, m.id, 10
FROM produtos p, materiais m
WHERE p.nome = 'Flechas' AND m.nome = 'Madeira de Ébano'
ON CONFLICT DO NOTHING;
