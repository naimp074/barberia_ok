-- Función para obtener barberos con emails de forma segura
-- Esto permite que los admins vean los emails de los barberos de su barbería
-- Nota: Acceder a auth.users requiere permisos especiales

CREATE OR REPLACE FUNCTION public.get_barbers_with_emails(p_barbershop_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  barbershop_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar que el usuario es miembro de la barbería
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND barbershop_id = p_barbershop_id
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    up.user_id,
    COALESCE(au.email, '')::text as email,
    up.role::text,
    up.barbershop_id
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.user_id
  WHERE up.barbershop_id = p_barbershop_id
    AND up.role = 'barber';
END;
$$;

-- Permitir ejecutar la función a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_barbers_with_emails(uuid) TO authenticated;

-- Comentario sobre la función
COMMENT ON FUNCTION public.get_barbers_with_emails(uuid) IS 'Obtiene lista de barberos con sus emails. Solo accesible por miembros de la barbería.';

