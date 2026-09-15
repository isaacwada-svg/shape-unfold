import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import brandAsset from "@/assets/lpres-brand.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in | National Cold Chain Grid" },
    { name: "description", content: "Create an account or sign in to book and manage cold storage on the National Cold Chain Grid." },
    { property: "og:title", content: "Sign in | National Cold Chain Grid" },
    { property: "og:description", content: "Create an account or sign in to book and manage cold storage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate({ to: "/dashboard", replace: true });
    });
    void supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/dashboard", replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async () => {
    setBusy(true); setError(null); setMessage(null);
    if (mode === "signup") {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: fullName, organisation, phone } },
      });
      if (err) setError(err.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    }
    setBusy(false);
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setError("Google sign-in could not be completed. Please try again.");
  };

  return (
    <main className="auth-page">
      <section className="auth-side">
        <Link to="/" className="brand-button">
          <img src={brandAsset.url} alt="L-PRES" />
          <span><strong>National Cold Chain Grid</strong><small>Powered by L-PRES · Operated by Farm Alert Ltd</small></span>
        </Link>
        <h1>Your cold chain, in one account.</h1>
        <p>Book pallet space, follow live facility conditions, download temperature records and manage payments in one place.</p>
        <ul>
          <li><ShieldCheck /> Government-backed facility network</li>
          <li><ShieldCheck /> Verified temperature records for every booking</li>
          <li><ShieldCheck /> Instant booking confirmation and alerts</li>
        </ul>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
          </div>
          <button className="btn-secondary btn-full google-button" onClick={google}>Continue with Google</button>
          <div className="auth-divider"><span>or use your email</span></div>
          {mode === "signup" && (
            <>
              <label className="form-field"><span>Full name</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amina Bello" /></label>
              <label className="form-field"><span>Organisation</span><input value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="HealthBridge Nigeria" /></label>
              <label className="form-field"><span>Phone number</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." /></label>
            </>
          )}
          <label className="form-field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@organisation.org" /></label>
          <label className="form-field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message"><Mail /> {message}</p>}
          <button className="btn-primary btn-full" disabled={busy || !email || !password} onClick={submit}>
            {mode === "signin" ? "Sign in" : "Create account"}<ArrowRight />
          </button>
          <Link to="/" className="auth-back">Back to booking</Link>
        </div>
      </section>
    </main>
  );
}
