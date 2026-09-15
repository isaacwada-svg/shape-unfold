import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, LogOut, ShieldCheck, Thermometer, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, money } from "@/lib/session";
import brandAsset from "@/assets/lpres-brand.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });

type AdminBooking = {
  id: string; reference: string; storage_class: string; pallets: number; start_date: string; days: number;
  total_amount: number; status: string; payment_status: string; organisation: string | null; contact_name: string | null;
  email: string | null; facility_id: string; facilities: { name: string; code: string } | null;
};
type Facility = { id: string; name: string; code: string; capacity: number };

function Admin() {
  const navigate = useNavigate();
  const { isStaff, loading, profile } = useSession();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState("fct");
  const [reading, setReading] = useState("3.2");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [{ data: b }, { data: f }] = await Promise.all([
      supabase.from("bookings").select("id,reference,storage_class,pallets,start_date,days,total_amount,status,payment_status,organisation,contact_name,email,facility_id,facilities(name,code)").order("created_at", { ascending: false }),
      supabase.from("facilities").select("id,name,code,capacity").order("sort_order"),
    ]);
    setBookings((b as unknown as AdminBooking[]) ?? []);
    setFacilities((f as Facility[]) ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    void load();
  };

  const logReading = async () => {
    const value = Number(reading);
    const status = value >= -2 && value <= 8 ? "In range" : "Out of range";
    await supabase.from("temperature_readings").insert({ facility_id: facilityId, reading: value, status, logged_by: profile?.full_name ?? "Facility officer" });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="grid-header">
        <Link to="/" className="brand-button">
          <img src={brandAsset.url} alt="L-PRES" />
          <span><strong>National Cold Chain Grid</strong><small>Staff console</small></span>
        </Link>
        <nav aria-label="Staff navigation">
          <Link to="/dashboard" className="nav-link">My account</Link>
          <button className="nav-link" onClick={signOut}><LogOut /> Sign out</button>
        </nav>
      </header>

      <section className="page-wrap">
        <div className="page-heading">
          <span className="eyebrow"><ShieldCheck /> Staff console</span>
          <h1>Bookings and facility records</h1>
          <p>Approve reservations, track payments and log manual temperature readings.</p>
        </div>

        {loading ? <p>Loading…</p> : !isStaff ? (
          <div className="empty-state">
            <ShieldCheck />
            <h2>Staff access required</h2>
            <p>This console is only available to facility staff and administrators.</p>
            <Link to="/dashboard" className="btn-primary">Back to my account</Link>
          </div>
        ) : (
          <>
            <article className="admin-panel">
              <h2>Log a temperature reading</h2>
              <div className="admin-form">
                <label className="form-field"><span>Facility</span>
                  <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                    {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </label>
                <label className="form-field"><span>Reading (°C)</span><input value={reading} onChange={(e) => setReading(e.target.value)} /></label>
                <button className="btn-primary" onClick={logReading}><Thermometer /> Save reading</button>
              </div>
              {saved && <p className="auth-message"><Check /> Reading saved to the facility log.</p>}
            </article>

            <article className="admin-panel">
              <h2>All bookings</h2>
              <table className="log-table">
                <thead><tr><th>Reference</th><th>Facility</th><th>Customer</th><th>Dates</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.reference}</strong></td>
                      <td>{b.facilities?.name ?? b.facility_id}</td>
                      <td>{b.organisation ?? b.contact_name ?? b.email}</td>
                      <td>{b.start_date} · {b.days}d</td>
                      <td>{money(b.total_amount)}</td>
                      <td>{b.payment_status}</td>
                      <td><span className={b.status === "confirmed" ? "status-live" : "status-pending"}>{b.status}</span></td>
                      <td className="admin-actions">
                        <button className="btn-secondary" onClick={() => setStatus(b.id, "confirmed")}><Check /> Approve</button>
                        <button className="btn-secondary" onClick={() => setStatus(b.id, "cancelled")}><X /> Cancel</button>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={8}>No bookings yet.</td></tr>}
                </tbody>
              </table>
            </article>
          </>
        )}
      </section>
    </main>
  );
}
