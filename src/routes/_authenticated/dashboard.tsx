import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bell, CreditCard, Download, LogOut, Snowflake, Thermometer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, money } from "@/lib/session";
import { TemperatureLog } from "@/components/TemperatureLog";
import brandAsset from "@/assets/lpres-brand.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type BookingRow = {
  id: string; reference: string; facility_id: string; storage_class: string; pallets: number; start_date: string;
  days: number; total_amount: number; status: string; payment_status: string; payment_method: string | null;
  facilities: { name: string; code: string; address: string } | null;
};
type NotificationRow = { id: string; title: string; body: string; read: boolean; created_at: string };

function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isStaff } = useSession();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [notes, setNotes] = useState<NotificationRow[]>([]);
  const [log, setLog] = useState<BookingRow | null>(null);
  const [openNotes, setOpenNotes] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: b }, { data: n }] = await Promise.all([
      supabase.from("bookings").select("id,reference,facility_id,storage_class,pallets,start_date,days,total_amount,status,payment_status,payment_method,facilities(name,code,address)").order("created_at", { ascending: false }),
      supabase.from("notifications").select("id,title,body,read,created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setBookings((b as unknown as BookingRow[]) ?? []);
    setNotes((n as NotificationRow[]) ?? []);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const pay = async (booking: BookingRow) => {
    await supabase.from("bookings").update({ payment_status: "paid", payment_method: booking.payment_method ?? "card" }).eq("id", booking.id);
    void load();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    void load();
  };

  const download = (b: BookingRow) => {
    const lines = [
      "National Cold Chain Grid — booking record",
      `Reference: ${b.reference}`,
      `Facility: ${b.facilities?.name ?? b.facility_id}`,
      `Storage class: ${b.storage_class}`,
      `Pallet spaces: ${b.pallets}`,
      `Start date: ${b.start_date}`,
      `Duration: ${b.days} days`,
      `Total: ${money(b.total_amount)}`,
      `Status: ${b.status} · Payment: ${b.payment_status}`,
      `Account: ${profile?.full_name ?? ""} ${profile?.organisation ? `(${profile.organisation})` : ""}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${b.reference}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const unread = notes.filter((n) => !n.read).length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="grid-header">
        <Link to="/" className="brand-button">
          <img src={brandAsset.url} alt="L-PRES" />
          <span><strong>National Cold Chain Grid</strong><small>Powered by L-PRES · Operated by Farm Alert Ltd</small></span>
        </Link>
        <nav aria-label="Account navigation">
          <Link to="/" className="nav-link">Book storage</Link>
          {isStaff && <Link to="/admin" className="nav-link">Staff console</Link>}
          <button className="nav-link bell" onClick={() => setOpenNotes((v) => !v)} aria-label="Notifications">
            <Bell />{unread > 0 && <i>{unread}</i>}
          </button>
          <button className="nav-link" onClick={signOut}><LogOut /> Sign out</button>
        </nav>
      </header>

      {openNotes && (
        <div className="note-panel">
          <strong>Notifications</strong>
          {notes.length === 0 && <p>No notifications yet.</p>}
          {notes.map((n) => (
            <button key={n.id} className={n.read ? "note read" : "note"} onClick={() => markRead(n.id)}>
              <b>{n.title}</b><span>{n.body}</span>
              <em>{new Date(n.created_at).toLocaleString("en-NG")}</em>
            </button>
          ))}
        </div>
      )}

      <section className="page-wrap">
        <div className="page-heading">
          <span className="eyebrow">My account</span>
          <h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
          <p>{profile?.organisation ?? "Your organisation"} · {profile?.email ?? user?.email}</p>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state">
            <Snowflake />
            <h2>No bookings yet</h2>
            <p>Your cold storage reservations will appear here.</p>
            <Link to="/" className="btn-primary">Book cold storage<ArrowRight /></Link>
          </div>
        ) : (
          <div className="booking-list">
            {bookings.map((b) => (
              <article className="manage-card" key={b.id}>
                <div className="manage-title">
                  <span className={b.status === "confirmed" ? "status-live" : "status-pending"}>{b.status}</span>
                  <small>Booking reference</small>
                  <b>{b.reference}</b>
                  <h2>{b.facilities?.name ?? b.facility_id}</h2>
                  <p>{b.storage_class} · {b.pallets} pallet spaces · {b.facilities?.address}</p>
                </div>
                <div className="manage-detail">
                  <span><small>Starts</small><strong>{b.start_date}</strong></span>
                  <span><small>Duration</small><strong>{b.days} days</strong></span>
                  <span><small>Total</small><strong>{money(b.total_amount)}</strong></span>
                  <span><small>Payment</small><strong>{b.payment_status}</strong></span>
                </div>
                <div className="manage-actions">
                  <button className="btn-secondary" onClick={() => setLog(b)}><Thermometer /> Temperature log</button>
                  <button className="btn-secondary" onClick={() => download(b)}><Download /> Booking record</button>
                  {b.payment_status !== "paid" && <button className="btn-primary" onClick={() => pay(b)}><CreditCard /> Pay {money(b.total_amount)}</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {log && <TemperatureLog facilityId={log.facility_id} facilityName={log.facilities?.name ?? log.facility_id} reference={log.reference} storageClass={log.storage_class} close={() => setLog(null)} />}
    </main>
  );
}
