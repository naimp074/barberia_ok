-- ============================================
-- FIX: Política RLS para permitir lectura inmediata
-- después del registro
-- ============================================

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS "Members can view barbershop" ON public.barbershops;

-- Crear política mejorada que permite al owner leer su barbería
-- incluso si aún no tiene perfil (útil durante el registro)
CREATE POLICY "Members can view barbershop"
  ON public.barbershops FOR SELECT
  USING (
    -- Permitir si es miembro (tiene perfil)
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.barbershop_id = barbershops.id AND p.user_id = auth.uid()
    )
    OR
    -- O si es el owner (útil durante el registro)
    owner_user_id = auth.uid()
  );

-- Verificar que la política se creó
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'barbershops'
  AND policyname = 'Members can view barbershop';

-- Verificar que los usuarios pueden leer sus propias barberías
DO $$
BEGIN
  RAISE NOTICE '✅ Política RLS actualizada para barbershops';
  RAISE NOTICE 'Ahora los owners pueden leer sus barberías inmediatamente después del registro';
END $$;

