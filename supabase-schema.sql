-- =============================================
-- SORTENAWEB - Schema do Banco de Dados Supabase
-- =============================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: profiles (perfis de usuários)
-- =============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
  subscription_expires_at TIMESTAMPTZ,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABELA: sorteios
-- =============================================
CREATE TABLE public.sorteios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'finished', 'cancelled')),
  draw_date TIMESTAMPTZ,
  max_participants INT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABELA: premios (prêmios do sorteio)
-- =============================================
CREATE TABLE public.premios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sorteio_id UUID REFERENCES public.sorteios(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  quantity INT DEFAULT 1,
  win_percentage DECIMAL(5,2) DEFAULT 0 CHECK (win_percentage >= 0 AND win_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABELA: participantes
-- =============================================
CREATE TABLE public.participantes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sorteio_id UUID REFERENCES public.sorteios(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sorteio_id, email)
);

-- =============================================
-- TABELA: ganhadores (winners)
-- =============================================
CREATE TABLE public.ganhadores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sorteio_id UUID REFERENCES public.sorteios(id) ON DELETE CASCADE NOT NULL,
  participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE NOT NULL,
  premio_id UUID REFERENCES public.premios(id) ON DELETE CASCADE NOT NULL,
  revealed BOOLEAN DEFAULT false,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sorteio_id, premio_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_sorteios_user_id ON public.sorteios(user_id);
CREATE INDEX idx_sorteios_slug ON public.sorteios(slug);
CREATE INDEX idx_premios_sorteio_id ON public.premios(sorteio_id);
CREATE INDEX idx_participantes_sorteio_id ON public.participantes(sorteio_id);
CREATE INDEX idx_participantes_email ON public.participantes(email);
CREATE INDEX idx_ganhadores_sorteio_id ON public.ganhadores(sorteio_id);
CREATE INDEX idx_ganhadores_participante_id ON public.ganhadores(participante_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Sorteios
ALTER TABLE public.sorteios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sorteios"
  ON public.sorteios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sorteios"
  ON public.sorteios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sorteios"
  ON public.sorteios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sorteios"
  ON public.sorteios FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public sorteios are viewable by anyone"
  ON public.sorteios FOR SELECT
  USING (is_public = true);

-- Premios
ALTER TABLE public.premios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage premios of own sorteios"
  ON public.premios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteios
      WHERE sorteios.id = premios.sorteio_id
      AND sorteios.user_id = auth.uid()
    )
  );

CREATE POLICY "Public premios viewable"
  ON public.premios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteios
      WHERE sorteios.id = premios.sorteio_id
      AND sorteios.is_public = true
    )
  );

-- Participantes
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage participantes of own sorteios"
  ON public.participantes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteios
      WHERE sorteios.id = participantes.sorteio_id
      AND sorteios.user_id = auth.uid()
    )
  );

CREATE POLICY "Participantes can view own data"
  ON public.participantes FOR SELECT
  USING (true);

-- Ganhadores
ALTER TABLE public.ganhadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage ganhadores of own sorteios"
  ON public.ganhadores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteios
      WHERE sorteios.id = ganhadores.sorteio_id
      AND sorteios.user_id = auth.uid()
    )
  );

CREATE POLICY "Public ganhadores viewable"
  ON public.ganhadores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteios
      WHERE sorteios.id = ganhadores.sorteio_id
      AND sorteios.is_public = true
    )
  );

-- =============================================
-- FUNCTION: handle_new_user (trigger para criar profile)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCTION: perform_draw (realizar sorteio)
-- =============================================
CREATE OR REPLACE FUNCTION public.perform_draw(p_sorteio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_premio RECORD;
  v_participante RECORD;
  v_winners JSONB := '[]'::JSONB;
  v_available_participants UUID[];
  v_winner_id UUID;
BEGIN
  -- Verificar se o sorteio pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM public.sorteios
    WHERE id = p_sorteio_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sorteio não encontrado ou sem permissão';
  END IF;

  -- Pegar todos participantes aprovados
  SELECT ARRAY_AGG(id) INTO v_available_participants
  FROM public.participantes
  WHERE sorteio_id = p_sorteio_id AND status = 'approved';

  IF v_available_participants IS NULL OR array_length(v_available_participants, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum participante aprovado para este sorteio';
  END IF;

  -- Para cada prêmio, sortear um ganhador
  FOR v_premio IN
    SELECT id, name, win_percentage
    FROM public.premios
    WHERE sorteio_id = p_sorteio_id
    ORDER BY win_percentage DESC
  LOOP
    -- Verificar se ainda há participantes disponíveis
    IF array_length(v_available_participants, 1) IS NULL OR array_length(v_available_participants, 1) = 0 THEN
      EXIT;
    END IF;

    -- Sortear aleatoriamente
    v_winner_id := v_available_participants[1 + floor(random() * array_length(v_available_participants, 1))::int];

    -- Registrar ganhador
    INSERT INTO public.ganhadores (sorteio_id, participante_id, premio_id)
    VALUES (p_sorteio_id, v_winner_id, v_premio.id)
    ON CONFLICT DO NOTHING;

    -- Remover ganhador da lista de disponíveis
    v_available_participants := array_remove(v_available_participants, v_winner_id);

    -- Adicionar ao resultado
    v_winners := v_winners || jsonb_build_object(
      'premio_id', v_premio.id,
      'premio_name', v_premio.name,
      'participante_id', v_winner_id
    );
  END LOOP;

  -- Atualizar status do sorteio
  UPDATE public.sorteios SET status = 'finished', updated_at = NOW()
  WHERE id = p_sorteio_id;

  RETURN v_winners;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
