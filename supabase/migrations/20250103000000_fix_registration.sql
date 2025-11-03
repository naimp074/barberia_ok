-- Función para crear barbería y perfil durante el registro
-- Esto evita problemas con RLS cuando el usuario acaba de registrarse

CREATE OR REPLACE FUNCTION public.create_barbershop_on_signup(
  p_user_id uuid,
  p_barbershop_name text,
  p_num_barbers integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id uuid;
BEGIN
  -- Crear barbería
  INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
  VALUES (p_barbershop_name, p_user_id, p_num_barbers)
  RETURNING id INTO v_barbershop_id;

  -- Crear perfil de admin
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (p_user_id, 'admin', v_barbershop_id);

  RETURN v_barbershop_id;
END;
$$;

-- Permitir ejecutar la función a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) TO authenticated;

-- También permitir a service_role (para triggers de auth)
GRANT EXECUTE ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) TO service_role;

COMMENT ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) IS 'Crea una barbería y perfil de admin para un usuario recién registrado';

