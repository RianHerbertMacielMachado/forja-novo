ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_tipo_check;
ALTER TABLE produtos ADD CONSTRAINT produtos_tipo_check CHECK (tipo IN ('basico', 'encantado', 'flechas'));
