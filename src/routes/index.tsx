import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, ArrowRight, Building2, Camera, Check, ChevronRight, Minus,
  Plus, ShieldCheck, Snowflake, Thermometer, X, Zap,
} from "lucide-react";
import brandAsset from "@/assets/lpres-brand.png.asset.json";
import chilledBay from "@/assets/chilled-bay.jpg";
import ultraBay from "@/assets/ultra-cold-bay.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "L-PRES Cold Chain Access" },
    { name: "description", content: "Browse, book and monitor trusted cold-chain storage across Nigeria." },
    { property: "og:title", content: "L-PRES Cold Chain Access" },
    { property: "og:description", content: "Nationwide cold-chain storage for health and livestock organisations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Index,
});

type View = "home" | "facilities" | "monitor" | "dashboard";
type Facility = { id: string; name: string; state: string; address: string; tier: string; types: string[]; cap: number; occ: number; live: boolean; temp: string; humidity: number };

const facilities: Facility[] = [
  { id: "sheda", name: "Sheda National Cold Chain Hub", state: "FCT", address: "Sheda Science & Technology Complex, Abuja", tier: "National Hub", types: ["Ultra-Cold", "Frozen", "Chilled"], cap: 480, occ: 312, live: true, temp: "3.2°C", humidity: 46 },
  { id: "edo", name: "Edo Regional Cold Store", state: "Edo", address: "Benin City Livestock Development Centre", tier: "Regional Hub", types: ["Frozen", "Chilled"], cap: 240, occ: 98, live: true, temp: "2.8°C", humidity: 51 },
  { id: "kano", name: "Kano Regional Cold Store", state: "Kano", address: "Kano State Veterinary Complex", tier: "Regional Hub", types: ["Frozen", "Chilled"], cap: 300, occ: 224, live: true, temp: "3.6°C", humidity: 48 },
  { id: "plateau", name: "Plateau Regional Cold Store", state: "Plateau", address: "Exact site address pending confirmation with L-PRES/FMLD", tier: "Regional Hub", types: ["Chilled"], cap: 180, occ: 0, live: false, temp: "—", humidity: 0 },
];

const plans = [
  { id: "Daily", days: 1, price: 2500 }, { id: "Weekly", days: 7, price: 16000, save: "Save 9%" },
  { id: "Monthly", days: 30, price: 75000 }, { id: "Quarterly", days: 90, price: 202500, save: "Save 10%" },
];

const money = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function Index() {
  const [view, setView] = useState<View>("home");
  const [booking, setBooking] = useState<Facility | null>(null);
  const [step, setStep] = useState(1);
  const [pallets, setPallets] = useState(2);
  const [grade, setGrade] = useState("Chilled");
  const [plan, setPlan] = useState(plans[1]);
  const [state, setState] = useState("All states");
  const [type, setType] = useState("All");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [payment, setPayment] = useState("Card");
  const [created, setCreated] = useState(false);

  const filtered = facilities.filter((f) => (state === "All states" || f.state === state) && (type === "All" || f.types.includes(type)));
  const total = plan.price * pallets;

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openBooking = (facility: Facility) => { setBooking(facility); setGrade(facility.types.includes("Chilled") ? "Chilled" : facility.types[0]); setStep(1); };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button className="flex items-center gap-3" onClick={() => navigate("home")} aria-label="L-PRES home">
            <img src={brandAsset.url} alt="L-PRES" className="h-14 w-20 object-cover object-top" />
            <span className="hidden border-l border-border pl-3 text-left sm:block"><strong className="block font-display text-lg text-primary">Cold Chain Access</strong><small className="text-muted-foreground">Operated by Farm Alert Ltd</small></span>
          </button>
          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            {[{ id: "facilities", label: "Browse & Book" }, { id: "monitor", label: "Live Monitoring" }, { id: "dashboard", label: "My Dashboard" }].map((item) => (
              <button key={item.id} onClick={() => navigate(item.id as View)} className={`nav-link ${view === item.id ? "nav-link-active" : ""}`}>{item.label}</button>
            ))}
          </nav>
        </div>
      </header>

      {view === "home" && <Home onBrowse={() => navigate("facilities")} onHow={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} />}
      {view === "facilities" && <Facilities filtered={filtered} state={state} type={type} onState={setState} onType={setType} onBook={openBooking} />}
      {view === "monitor" && <Monitoring />}
      {view === "dashboard" && <Dashboard created={created} organisation={organisation} onBrowse={() => navigate("facilities")} />}

      <footer className="border-t border-border bg-ink py-10 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 sm:flex-row lg:px-8"><div><strong className="font-display text-xl">L-PRES Cold Chain Access</strong><p className="mt-1 text-sm text-primary-foreground/70">A Federal Ministry of Livestock Development programme</p></div><p className="text-sm text-primary-foreground/70">Operated by Farm Alert Ltd · World Bank-backed infrastructure</p></div>
      </footer>

      {booking && <BookingDrawer facility={booking} step={step} setStep={setStep} close={() => setBooking(null)} pallets={pallets} setPallets={setPallets} grade={grade} setGrade={setGrade} plan={plan} setPlan={setPlan} total={total} organisation={organisation} setOrganisation={setOrganisation} email={email} setEmail={setEmail} payment={payment} setPayment={setPayment} finish={() => { setCreated(true); setStep(3); }} goDashboard={() => { setBooking(null); navigate("dashboard"); }} />}
    </main>
  );
}

function Home({ onBrowse, onHow }: { onBrowse: () => void; onHow: () => void }) {
  return <>
    <section className="relative overflow-hidden bg-ink text-primary-foreground">
      <img src={chilledBay} alt="Modern L-PRES cold storage facility" className="absolute inset-0 h-full w-full object-cover opacity-25" width={1280} height={800} />
      <div className="absolute inset-0 hero-overlay" />
      <div className="relative mx-auto grid min-h-[650px] max-w-7xl content-center px-5 py-24 lg:px-8">
        <div className="max-w-3xl"><span className="eyebrow eyebrow-light"><ShieldCheck size={15} /> Government-backed cold-chain network</span><h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">Cold storage you can trust. Anywhere in Nigeria.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-primary-foreground/80">Reserve secure, temperature-controlled pallet space for vaccines, medicines and biologics — then monitor conditions from wherever you are.</p><div className="mt-9 flex flex-wrap gap-3"><button className="btn-primary" onClick={onBrowse}>Browse available space <ArrowRight size={18} /></button><button className="btn-ghost-light" onClick={onHow}>See how booking works</button></div></div>
      </div>
    </section>
    <section className="border-b border-border bg-surface"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border lg:grid-cols-4"><Fact label="Programme" value="L-PRES · FMLD" /><Fact label="Infrastructure" value="World Bank-backed" /><Fact label="Storage grades" value="Ultra · Frozen · Chilled" /><Fact label="Assurance" value="24/7 monitoring" /></div></section>
    <section id="how" className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="max-w-2xl"><span className="eyebrow">Built for critical supply chains</span><h2 className="section-title">Why organisations trust L-PRES</h2><p className="section-copy">Public infrastructure, clear pricing and continuous condition monitoring make every booking accountable.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[["Health & pharma", "Vaccines and temperature-sensitive medicines"], ["Animal health", "Veterinary vaccines and biologics"], ["Laboratories", "Diagnostic reagents and samples"], ["Emergency response", "Rapid, reliable regional storage"]].map(([a,b], i) => <article className="trust-card" key={a}><span className="icon-box">{[<Thermometer key="t" />, <ShieldCheck key="s" />, <Activity key="a" />, <Building2 key="b" />][i]}</span><h3>{a}</h3><p>{b}</p></article>)}</div></section>
  </>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div className="bg-surface px-6 py-7"><small className="text-muted-foreground">{label}</small><strong className="mt-1 block text-sm text-foreground">{value}</strong></div>; }

function Facilities({ filtered, state, type, onState, onType, onBook }: { filtered: Facility[]; state: string; type: string; onState: (s:string)=>void; onType:(s:string)=>void; onBook:(f:Facility)=>void }) {
  return <section className="page-wrap"><div className="page-heading"><span className="eyebrow">National network</span><h1>Browse available cold storage</h1><p>Compare capacity and storage grades, then reserve the space that fits your needs.</p></div><div className="filter-bar"><label><span>State</span><select value={state} onChange={(e)=>onState(e.target.value)}><option>All states</option>{[...new Set(facilities.map(f=>f.state))].map(s=><option key={s}>{s}</option>)}</select></label><div className="filter-chips">{["All","Ultra-Cold","Frozen","Chilled"].map(t=><button key={t} onClick={()=>onType(t)} className={type===t?"chip-active":"chip"}>{t}</button>)}</div><strong>{filtered.length} facilities</strong></div><div className="facility-grid">{filtered.map(f=><FacilityCard key={f.id} f={f} onBook={onBook} />)}</div></section>;
}

function FacilityCard({ f, onBook }: { f: Facility; onBook:(f:Facility)=>void }) { const pct=Math.round(f.occ/f.cap*100); return <article className="facility-card"><div className="flex items-start justify-between gap-3"><span className="tier-badge">{f.tier}</span><span className={f.live?"status-live":"status-pending"}>{f.live?"Bookable now":"Coming soon"}</span></div><h2>{f.name}</h2><p className="address">{f.address}</p><div className="flex flex-wrap gap-2">{f.types.map(t=><span className="grade-tag" key={t}><Snowflake size={13}/>{t}</span>)}</div><div className="occupancy"><div className="flex justify-between"><span>Current occupancy</span><strong>{f.occ} / {f.cap} pallets</strong></div><div className="track"><span style={{width:`${pct}%`}} /></div></div><div className="card-foot"><div><small>From</small><strong>₦2,500 <span>/ pallet / day</span></strong></div><button className={f.live?"btn-primary":"btn-secondary"} onClick={()=>f.live&&onBook(f)}>{f.live?"Book now":"Notify me"}<ChevronRight size={17}/></button></div></article>; }

function Monitoring() { return <section className="page-wrap"><div className="page-heading"><span className="eyebrow"><span className="pulse-dot"/> Public live view</span><h1>Live facility conditions</h1><p>Transparent, near real-time monitoring across the L-PRES network.</p></div><div className="monitor-list">{facilities.filter(f=>f.live).map(f=><article className="monitor-card" key={f.id}><div className="monitor-head"><div><span className="tier-badge">{f.tier}</span><h2>{f.name}</h2><p>{f.address}</p></div><div className="camera-ok"><Camera size={18}/><span><strong>4 / 4</strong> cameras online</span></div></div><div className="condition-grid"><Condition icon={<Thermometer/>} label="Chilled zone" value={f.temp} note="In range"/><Condition icon={<Activity/>} label="Humidity" value={`${f.humidity}%`} note="Normal"/><Condition icon={<Zap/>} label="Power" value="Solar" note="Stable"/><Condition icon={<ShieldCheck/>} label="Capacity" value={`${f.occ}/${f.cap}`} note="Pallets used"/></div><div className="sync-line"><span className="pulse-dot"/> Loggers last synced 2 minutes ago</div></article>)}</div></section>; }
function Condition({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}){return <div className="condition"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em><Check size={12}/>{note}</em></div></div>}

function Dashboard({created,organisation,onBrowse}:{created:boolean;organisation:string;onBrowse:()=>void}){return <section className="page-wrap"><div className="page-heading"><span className="eyebrow">Customer dashboard</span><h1>{created?`Welcome, ${organisation}`:"Your cold-chain bookings"}</h1><p>Monitor current conditions and retrieve storage records.</p></div>{created?<article className="booking-card"><div><span className="status-live">Active</span><h2>Sheda National Cold Chain Hub</h2><p>Booking FA-SH-260913 · Chilled · 2 pallet-spaces</p></div><div className="dashboard-metrics"><span><small>Temperature</small><strong>3.2°C</strong></span><span><small>Humidity</small><strong>46%</strong></span><span><small>Power</small><strong>Stable</strong></span></div><button className="btn-secondary">View temperature log</button></article>:<div className="empty-state"><span className="icon-box"><Snowflake/></span><h2>No bookings yet</h2><p>Reserve cold storage to see live conditions and temperature logs here.</p><button className="btn-primary" onClick={onBrowse}>Browse facilities <ArrowRight size={18}/></button></div>}</section>}

function BookingDrawer(props:{facility:Facility;step:number;setStep:(n:number)=>void;close:()=>void;pallets:number;setPallets:(n:number)=>void;grade:string;setGrade:(s:string)=>void;plan:typeof plans[number];setPlan:(p:typeof plans[number])=>void;total:number;organisation:string;setOrganisation:(s:string)=>void;email:string;setEmail:(s:string)=>void;payment:string;setPayment:(s:string)=>void;finish:()=>void;goDashboard:()=>void}){
  const {facility,step,setStep,close,pallets,setPallets,grade,setGrade,plan,setPlan,total,organisation,setOrganisation,email,setEmail,payment,setPayment,finish,goDashboard}=props;
  return <div className="drawer-layer"><button className="drawer-backdrop" onClick={close} aria-label="Close booking"/><aside className="drawer"><div className="drawer-top"><div><small>Reserve cold storage</small><h2>{facility.name}</h2></div><button className="icon-button" onClick={close} aria-label="Close"><X/></button></div><div className="steps">{[1,2,3].map(n=><span key={n} className={step>=n?"step-active":"step"}>{step>n?<Check/>:n}</span>)}</div>{step===1&&<div className="drawer-body"><FieldTitle n="01" title="Choose storage grade"/><div className="option-grid">{facility.types.map(t=><button className={grade===t?"option-active":"option"} onClick={()=>setGrade(t)} key={t}><strong>{t}</strong><small>{t==="Chilled"?"−2 to 8°C":t==="Frozen"?"−18°C":"−20 to −70°C"}</small></button>)}</div><img src={grade==="Ultra-Cold"?ultraBay:chilledBay} alt={`${grade} storage bay preview`} className="bay-preview" width={1280} height={800}/><small className="image-note">Illustrative facility view · site photography is being captured for launch</small><FieldTitle n="02" title="How much space?"/><div className="stepper"><button className="icon-button" onClick={()=>setPallets(Math.max(1,pallets-1))}><Minus/></button><div><strong>{pallets}</strong><small>pallet-spaces · approx. {pallets*500}kg</small></div><button className="icon-button" onClick={()=>setPallets(Math.min(20,pallets+1))}><Plus/></button></div><FieldTitle n="03" title="Choose duration"/><div className="plan-grid">{plans.map(p=><button key={p.id} className={plan.id===p.id?"plan-active":"plan"} onClick={()=>setPlan(p)}><span>{p.id}</span><strong>{money(p.price)}</strong><small>per pallet {p.save&&`· ${p.save}`}</small></button>)}</div><Summary grade={grade} pallets={pallets} plan={plan.id} total={total}/><button className="btn-primary btn-full" onClick={()=>setStep(2)}>Continue to payment <ArrowRight size={18}/></button></div>}{step===2&&<div className="drawer-body"><FieldTitle n="04" title="Booking contact"/><label className="form-field"><span>Organisation name</span><input value={organisation} onChange={e=>setOrganisation(e.target.value)} placeholder="e.g. HealthBridge Nigeria"/></label><label className="form-field"><span>Email address</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@organisation.org"/></label><FieldTitle n="05" title="Payment method"/><div className="payment-list">{["Card","Bank transfer","USSD"].map(p=><button className={payment===p?"payment-active":"payment"} onClick={()=>setPayment(p)} key={p}><span className="radio-dot"/><strong>{p}</strong><small>{p==="Card"?"Visa, Mastercard or Verve":p==="USSD"?"No data required":"Instant confirmation"}</small></button>)}</div><Summary grade={grade} pallets={pallets} plan={plan.id} total={total}/><p className="demo-note">Demo checkout — no real payment will be processed.</p><button disabled={!organisation||!email} className="btn-primary btn-full" onClick={finish}>Confirm & pay {money(total)}</button></div>}{step===3&&<div className="confirmation"><span className="success-mark"><Check/></span><span className="eyebrow">Booking confirmed</span><h2>Your cold space is reserved.</h2><p>A confirmation would normally be sent to {email}.</p><div className="reference"><small>Booking reference</small><strong>FA-SH-260913</strong></div><Summary grade={grade} pallets={pallets} plan={plan.id} total={total}/><button className="btn-primary btn-full" onClick={goDashboard}>Go to my dashboard <ArrowRight size={18}/></button></div>}</aside></div>;
}
function FieldTitle({n,title}:{n:string;title:string}){return <div className="field-title"><span>{n}</span><h3>{title}</h3></div>}
function Summary({grade,pallets,plan,total}:{grade:string;pallets:number;plan:string;total:number}){return <div className="summary"><div><span>{grade} · {pallets} pallet{pallets>1?"s":""}</span><small>{plan} storage period</small></div><div><small>Total due</small><strong>{money(total)}</strong></div></div>}