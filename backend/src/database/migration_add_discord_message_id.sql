-- ============================================================
-- MIGRATION: Adiciona discord_forjador_message_id na tabela pedidos
-- Permite editar a mensagem do Discord do forjador a cada
-- atualização de status, em vez de criar uma nova mensagem.
-- Execute uma única vez no banco já existente:
--   node src/database/run_migration.js
-- ============================================================
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS discord_forjador_message_id VARCHAR(30);
