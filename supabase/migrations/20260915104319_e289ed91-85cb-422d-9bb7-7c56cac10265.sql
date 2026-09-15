
CREATE TYPE public.app_role AS ENUM ('admin','staff','customer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  organisation text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'))
$$;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_staff(auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE TABLE public.facilities (
  id text PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  state text NOT NULL,
  address text NOT NULL,
  classes text[] NOT NULL DEFAULT '{}',
  capacity integer NOT NULL DEFAULT 0,
  price_per_pallet_day integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.facilities TO anon;
GRANT SELECT ON public.facilities TO authenticated;
GRANT ALL ON public.facilities TO service_role;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Facilities are public" ON public.facilities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage facilities" ON public.facilities FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  facility_id text NOT NULL REFERENCES public.facilities(id),
  storage_class text NOT NULL,
  pallets integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  days integer NOT NULL DEFAULT 1,
  total_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  contact_name text,
  organisation text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Customers create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Customers update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff update all bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.temperature_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id text NOT NULL REFERENCES public.facilities(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  reading numeric(4,1) NOT NULL,
  status text NOT NULL DEFAULT 'In range',
  logged_by text NOT NULL DEFAULT 'Sensor',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.temperature_readings TO anon;
GRANT SELECT, INSERT ON public.temperature_readings TO authenticated;
GRANT ALL ON public.temperature_readings TO service_role;
ALTER TABLE public.temperature_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Readings are public" ON public.temperature_readings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff log readings" ON public.temperature_readings FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, organisation, phone)
  VALUES (NEW.id, NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name',''),
    NULLIF(NEW.raw_user_meta_data ->> 'organisation',''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone',''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (NEW.user_id, 'Booking received', 'Booking ' || NEW.reference || ' has been received and is awaiting confirmation.', 'booking');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (NEW.user_id, 'Booking ' || NEW.status, 'Booking ' || NEW.reference || ' is now ' || NEW.status || '.', 'booking');
  ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (NEW.user_id, 'Payment ' || NEW.payment_status, 'Payment for booking ' || NEW.reference || ' is now ' || NEW.payment_status || '.', 'payment');
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER booking_inserted AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();
CREATE TRIGGER booking_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

INSERT INTO public.facilities (id, code, name, state, address, classes, capacity, price_per_pallet_day, sort_order) VALUES
 ('fct','FCT','FCT Cold Storage (Shedda)','FCT','Shedda, Federal Capital Territory','{"Ultra-Cold","Frozen","Chilled"}',480,2500,1),
 ('adamawa','YOL','Adamawa Cold Storage (Jembutu, Yola)','Adamawa','Jembutu, Yola, Adamawa State','{"Frozen","Chilled"}',240,2500,2),
 ('edo','BEN','Edo Cold Storage (Benin)','Edo','Benin City, Edo State','{"Frozen","Chilled"}',300,2800,3),
 ('lagos','LOS','Lagos Cold Storage','Lagos','Lagos State','{"Ultra-Cold","Frozen","Chilled"}',360,3000,4);

INSERT INTO public.temperature_readings (facility_id, recorded_at, reading, status, logged_by)
SELECT f.id,
       now() - (g * interval '3 hours'),
       round((2.6 + ((g * 7 + length(f.id)) % 13) * 0.1)::numeric, 1),
       'In range',
       CASE WHEN g % 4 = 0 THEN 'Facility officer' ELSE 'Sensor' END
FROM public.facilities f, generate_series(0, 23) AS g;
