CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_admin boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, organisation, phone)
  VALUES (NEW.id, NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name',''),
    NULLIF(NEW.raw_user_meta_data ->> 'organisation',''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone',''))
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_admin;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN has_admin THEN 'customer'::public.app_role ELSE 'admin'::public.app_role end)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;