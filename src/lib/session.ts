import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; email: string | null; full_name: string | null; organisation: string | null; phone: string | null };

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      if (!nextUser) { setProfile(null); setIsStaff(false); setLoading(false); return; }
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,organisation,phone").eq("id", nextUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", nextUser.id),
      ]);
      if (!active) return;
      setProfile((p as Profile) ?? null);
      setIsStaff(Boolean(roles?.some((r) => r.role === "admin" || r.role === "staff")));
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { void load(session?.user ?? null); });
    void supabase.auth.getUser().then(({ data }) => load(data.user ?? null));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { user, profile, isStaff, loading };
}

export const money = (n: number) => `\u20a6${n.toLocaleString("en-NG")}`;
