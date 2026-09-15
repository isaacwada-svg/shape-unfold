CREATE TABLE public.facility_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id text NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  label text NOT NULL,
  brand text,
  model text,
  connection text NOT NULL DEFAULT 'wifi',
  mode text NOT NULL DEFAULT 'pull',
  endpoint_url text,
  poll_interval_seconds integer NOT NULL DEFAULT 300,
  device_key text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  notes text,
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX facility_devices_device_key_idx ON public.facility_devices(device_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_devices TO authenticated;
GRANT ALL ON public.facility_devices TO service_role;

ALTER TABLE public.facility_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view devices" ON public.facility_devices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can add devices" ON public.facility_devices FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can edit devices" ON public.facility_devices FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can remove devices" ON public.facility_devices FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_facility_devices()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE EXECUTE ON FUNCTION public.touch_facility_devices() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER facility_devices_touch BEFORE UPDATE ON public.facility_devices
FOR EACH ROW EXECUTE FUNCTION public.touch_facility_devices();