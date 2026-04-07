-- =============================================
-- SORTENAWEB - Setup do Admin
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- 1. Permitir que Admins vejam todos os profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 2. Permitir que Admins atualizem qualquer profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =============================================
-- 3. DEFINIR SEU USUÁRIO COMO ADMIN
-- Substitua 'SEU_EMAIL@AQUI.COM' pelo email
-- que você usou para se registrar no Sortenaweb
-- =============================================
UPDATE public.profiles
SET role = 'admin', subscription_status = 'active'
WHERE email = 'SEU_EMAIL@AQUI.COM';
