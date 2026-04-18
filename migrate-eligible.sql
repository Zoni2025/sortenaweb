-- Adicionar campo eligible na tabela participantes (default true = todos elegíveis)
ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS eligible boolean NOT NULL DEFAULT true;
