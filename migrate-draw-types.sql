-- Adicionar campos draw_type e view_type na tabela sorteios
ALTER TABLE public.sorteios
  ADD COLUMN IF NOT EXISTS draw_type text NOT NULL DEFAULT 'roleta',
  ADD COLUMN IF NOT EXISTS view_type text NOT NULL DEFAULT 'individual';

-- Constraint para valores válidos
ALTER TABLE public.sorteios
  ADD CONSTRAINT sorteios_draw_type_check CHECK (draw_type IN ('roleta')),
  ADD CONSTRAINT sorteios_view_type_check CHECK (view_type IN ('individual', 'coletivo'));
