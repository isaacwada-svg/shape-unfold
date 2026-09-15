import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Reading = { id: string; recorded_at: string; reading: number; status: string; logged_by: string };

export function TemperatureLog({ facilityId, facilityName, reference, storageClass, close }: { facilityId: string; facilityName: string; reference?: string; storageClass?: string; close: () => void }) {
  const [rows, setRows] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.from("temperature_readings").select("id,recorded_at,reading,status,logged_by").eq("facility_id", facilityId).order("recorded_at", { ascending: false }).limit(24)
      .then(({ data }) => { if (active) { setRows((data as Reading[]) ?? []); setLoading(false); } });
    return () => { active = false; };
  }, [facilityId]);

  const values = rows.map((r) => Number(r.reading));
  const min = Math.min(...values, 2);
  const max = Math.max(...values, 5);
  const points = rows.slice().reverse().map((r, i, arr) => {
    const x = arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50;
    const y = 100 - ((Number(r.reading) - min) / (max - min || 1)) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" onClick={close} aria-label="Close temperature log" />
      <aside className="log-modal">
        <div className="drawer-top">
          <div><small>Temperature log</small><h2>{facilityName}</h2></div>
          <button className="icon-button" onClick={close} aria-label="Close"><X /></button>
        </div>
        <p className="log-meta">{reference ? `${reference} · ` : ""}{storageClass ?? "Chilled"} · target 3°C ±5°C · acceptable range -2°C to 8°C</p>
        {loading ? <p className="log-meta">Loading readings…</p> : (
          <>
            <div className="log-chart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Temperature trend">
                <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <table className="log-table">
              <thead><tr><th>Date</th><th>Time</th><th>Reading</th><th>Status</th><th>Logged by</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const d = new Date(r.recorded_at);
                  return (
                    <tr key={r.id}>
                      <td>{d.toLocaleDateString("en-NG", { day: "2-digit", month: "short" })}</td>
                      <td>{d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td><strong>{Number(r.reading).toFixed(1)}°C</strong></td>
                      <td><span className="status-live">{r.status}</span></td>
                      <td>{r.logged_by}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </aside>
    </div>
  );
}
