-- Tabela para armazenar os resultados dos sorteios coletivos
CREATE TABLE IF NOT EXISTS public.sorteio_resultados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sorteio_id uuid NOT NULL REFERENCES public.sorteios(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  drawn_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para buscar resultados por sorteio
CREATE INDEX IF NOT EXISTS idx_sorteio_resultados_sorteio_id ON public.sorteio_resultados(sorteio_id);

-- RLS
ALTER TABLE public.sorteio_resultados ENABLE ROW LEVEL SECURITY;

-- Política: admin pode tudo
CREATE POLICY "Admin full access on sorteio_resultados"
  ON public.sorteio_resultados
  FOR ALL
  USING (public.is_admin());

-- Política: dono do sorteio pode ler e inserir
CREATE POLICY "Owner can read sorteio_resultados"
  ON public.sorteio_resultados
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteios
      WHERE sorteios.id = sorteio_resultados.sorteio_id
        AND sorteios.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert sorteio_resultados"
  ON public.sorteio_resultados
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sorteios
      WHERE sorteios.id = sorteio_resultados.sorteio_id
        AND sorteios.user_id = auth.uid()
    )
  );
