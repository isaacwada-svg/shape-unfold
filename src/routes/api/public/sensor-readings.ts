import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payload = z.object({
  reading: z.number().min(-90).max(60),
  recorded_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/sensor-readings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deviceKey = request.headers.get("x-device-key") ?? "";
        if (deviceKey.length < 16) return new Response("Missing device key", { status: 401 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = payload.safeParse(body);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: device } = await supabaseAdmin
          .from("facility_devices")
          .select("id,facility_id,label,active")
          .eq("device_key", deviceKey)
          .maybeSingle();

        if (!device || !device.active) return new Response("Unknown device", { status: 401 });

        const value = Math.round(parsed.data.reading * 10) / 10;
        const status = value >= -2 && value <= 8 ? "In range" : "Out of range";

        const { error } = await supabaseAdmin.from("temperature_readings").insert({
          facility_id: device.facility_id,
          reading: value,
          status,
          logged_by: device.label,
          recorded_at: parsed.data.recorded_at ?? new Date().toISOString(),
        });
        if (error) return new Response("Could not store reading", { status: 500 });

        await supabaseAdmin
          .from("facility_devices")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", device.id);

        return Response.json({ ok: true, status });
      },
    },
  },
});
