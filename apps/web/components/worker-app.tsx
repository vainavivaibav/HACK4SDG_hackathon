'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {motion,useReducedMotion} from 'motion/react';
import {ArrowUpRight,ArrowRight,MapPin,Clock,Utensils,Leaf,LogIn,RefreshCw,Ticket,Check,ShieldCheck,LocateFixed,UserRound,LogOut,MessageCircle,Search,Home,Navigation,SlidersHorizontal} from 'lucide-react';
import {Button,ErrorNotice,LanguageSelect,Modal,useHunger} from '@hunger/ui';
import {sampleMeals,distanceKm,isServing,effectiveStatus,errorMessage,mealTime,type Meal,type Reservation,type Coords,type Language} from '@hunger/core';
import {copyFor,mealPhoto} from '../lib/presentation';
import {MealDetailView,ReservationView,ReservationClock} from './worker-views';
type Screen='discover'|'meals'|'profile'|'detail'|'reservation';
const consoleUrl=process.env.NEXT_PUBLIC_CONSOLE_URL||'http://localhost:3001';
export function WorkerApp({screen,mealId,reservationId}:{screen:Screen;mealId?:string;reservationId?:string}){
 const {api,user,ready,t,lang,setAuthOpen,notify,version,realtime,reload}=useHunger();
 const router=useRouter(); const reduced=useReducedMotion(),c=copyFor(lang);
 const [meals,setMeals]=useState<Meal[]>([]),[reservations,setReservations]=useState<Reservation[]>([]),[owner,setOwner]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[actionError,setActionError]=useState(''),[busy,setBusy]=useState(false);
 const [area,setArea]=useState('all'),[diet,setDiet]=useState('all'),[windowFilter,setWindowFilter]=useState('all'),[query,setQuery]=useState(''),[sort,setSort]=useState('window'),[coords,setCoords]=useState<Coords|null>(null),[radius,setRadius]=useState(0),[locationBusy,setLocationBusy]=useState(false),[clock,setClock]=useState(Date.now());
 const [filtersExpanded,setFiltersExpanded]=useState(false);
 const [reportMeal,setReportMeal]=useState<Meal|null>(null),[feedback,setFeedback]=useState<Reservation|null>(null),[confirmRelease,setConfirmRelease]=useState<Reservation|null>(null);
 const load=useCallback(async()=>{setLoading(true);if(!api){setMeals(sampleMeals());setLoading(false);return;}try{const list=await api.meals();setMeals(list);if(user){const rows=await api.reservations();setReservations(rows.filter(r=>r.worker_id===user.id));setOwner(user.id);}else{setReservations([]);setOwner(null);}setError('');}catch(e){setError(errorMessage(e));}finally{setLoading(false);}},[api,user]);
 useEffect(()=>{void load();},[load,version]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const ownReservations=owner===user?.id?reservations:[];
 const active=ownReservations.find(r=>effectiveStatus(r,clock)==='active');
 const selected=meals.find(m=>m.id===mealId);
 const currentToken=ownReservations.find(r=>r.id===reservationId);
 const areas=useMemo(()=>[...new Set(meals.map(m=>m.area))].sort(),[meals]);
 const eligible=meals.filter(m=>m.status==='open'&&Date.parse(m.ends_at)>clock&&(area==='all'||m.area===area)&&(!query.trim()||[m.title,m.description,m.area,m.venue_name].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))&&(windowFilter!=='now'||isServing(m,clock))&&(!coords||!radius||distanceKm(coords,m)<=radius));
 const filtered=eligible.filter(m=>diet==='all'||m.diet===diet).sort((a,b)=>sort==='portions'?b.available_portions-a.available_portions:sort==='distance'&&coords?distanceKm(coords,a)-distanceKm(coords,b):Date.parse(a.starts_at)-Date.parse(b.starts_at));
 const count=filtered.reduce((n,m)=>n+m.available_portions,0),venueCount=new Set(filtered.map(m=>m.venue_id)).size;
 const requireAuth=()=>{if(!user){setAuthOpen(true);return false;}return true;};
 async function reserve(m:Meal){if(!api||!requireAuth()){setAuthOpen(true);return;}setBusy(true);setActionError('');try{const r=await api.reserve(m.id);setReservations(rows=>[r,...rows.filter(x=>x.id!==r.id)]);setOwner(user!.id);notify(t.reserved);router.push(`/reservation/${r.id}`);reload();}catch(e){setActionError(errorMessage(e));}finally{setBusy(false);}}
 async function release(r:Reservation){if(!api)return;setBusy(true);setActionError('');try{await api.cancel(r.id);setConfirmRelease(null);setReservations(rows=>rows.map(x=>x.id===r.id?{...x,status:'cancelled'}:x));notify(t.released);router.push('/meals');reload();}catch(e){setActionError(errorMessage(e));}finally{setBusy(false);}}
 function locate(){if(!navigator.geolocation){notify('Location unavailable. Choose an area instead.');return;}setLocationBusy(true);navigator.geolocation.getCurrentPosition(p=>{setCoords({latitude:p.coords.latitude,longitude:p.coords.longitude});setRadius(5);setSort('distance');setLocationBusy(false);},()=>{notify('Location unavailable. Choose an area instead.');setLocationBusy(false);},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});}
 function reset(){setQuery('');setArea('all');setDiet('all');setWindowFilter('all');setRadius(0);setSort('window');}
 const waitForToken=!error&&(!ready||loading||(!!user&&owner!==user.id));
 return <><a className="skip-link" href="#main-content">Skip to content</a>
 <header className="site-header"><div className="wrap header-inner"><Link href="/" className="wordmark" aria-label="HUNGER home"><span className="brand-symbol"><Utensils size={20}/></span>HUNGER<span className="wordmark-dot">·</span></Link><label className="header-area"><MapPin size={16}/><span className="sr-only">{c.neighbourhood}</span><select value={area} onChange={e=>setArea(e.target.value)}><option value="all">{c.neighbourhood}</option>{areas.map(a=><option key={a}>{a}</option>)}</select></label><nav aria-label="Main navigation"><Link href="/" aria-current={screen==='discover'||screen==='detail'?'page':undefined}>{t.find}</Link><Link href="/#how-it-works">{t.how}</Link><Link href="/meals" aria-current={screen==='meals'||screen==='reservation'?'page':undefined}>{t.meals}</Link></nav><div className="header-actions"><LanguageSelect/>{active&&<Link className="header-token" href={`/reservation/${active.id}`}><span className="status-dot"/>{c.yourReservation}</Link>}{user?<Link className="avatar-link" href="/profile" aria-label={t.profile}><UserRound size={19}/></Link>:<Button onClick={()=>setAuthOpen(true)}>{t.signin}</Button>}</div></div></header>
 <main id="main-content" tabIndex={-1}>
 {screen==='discover'?<section className="wrap discovery section" id="find-food"><div className="inventory-panel"><div><div className="inventory-label"><span className="inventory-pill"><span className={`status-dot ${api&&realtime!=='SUBSCRIBED'?'warn':''}`}/>{api?t.live:c.preview}</span><span>{area==='all'?c.neighbourhood:area}</span></div><h1>{c.inventory}</h1><p>{c.inventoryBody} <strong>{c.oneActive}.</strong></p></div><div className="inventory-count" role="status"><strong>{loading&&!meals.length?t.loading:`${count} ${c.portionsReady}`}</strong><span>{venueCount} {c.kitchens} · {t.free}</span></div></div>
 {active&&<div className="active-reservation"><Ticket size={21}/><div><strong>{c.active}</strong><p>{c.activeBody}</p></div><Link className="button primary" href={`/reservation/${active.id}`}>{t.viewToken}<ArrowRight size={16}/></Link></div>}
 <div className={`finder-panel ${filtersExpanded?'expanded':''}`}><button className="finder-toggle" aria-label={c.refine} aria-expanded={filtersExpanded} onClick={()=>setFiltersExpanded(!filtersExpanded)}><SlidersHorizontal size={19}/></button><div className="search-row"><label className="search-input"><Search size={20}/><span className="sr-only">{c.search}</span><input type="search" placeholder={c.search} value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="area-input"><MapPin size={17}/><span className="sr-only">{t.area}</span><select value={area} onChange={e=>setArea(e.target.value)}><option value="all">{t.allAreas}</option>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label className="time-filter"><Clock size={17}/><span className="sr-only">{t.serving}</span><select value={windowFilter} onChange={e=>setWindowFilter(e.target.value)}><option value="all">{t.anyTime}</option><option value="now">{t.now}</option></select></label><select className="sort-filter" aria-label={c.sort} value={sort} onChange={e=>setSort(e.target.value)}><option value="window">{c.earliest}</option><option value="portions">{c.mostPortions}</option>{coords&&<option value="distance">{c.closest}</option>}</select></div><div className="filter-row"><div className="tab-buttons" role="group" aria-label="Diet"><span className="dietary-title">{c.dietary}:</span>{[['all',t.all],['veg',t.veg],['nonveg',t.nonveg]].map(([value,label])=><button key={value} onClick={()=>setDiet(value)} aria-pressed={diet===value}>{value!=='all'&&<i className={`diet-dot ${value}`}/ >}{label} <span>({value==='all'?eligible.length:eligible.filter(m=>m.diet===value).length})</span></button>)}</div><div className="filter-tools"><Button variant="ghost" busy={locationBusy} onClick={locate}><LocateFixed size={15}/>{t.nearby}</Button>{coords&&<select aria-label={t.distance} value={radius} onChange={e=>setRadius(Number(e.target.value))}><option value={0}>{t.anyDistance}</option><option value={2}>2 km</option><option value={5}>5 km</option><option value={10}>10 km</option></select>}<button className="refresh-button" aria-label={t.refresh} onClick={reload}><RefreshCw size={16}/></button></div></div></div>
 {!api&&<div className="preview-banner"><strong>{c.preview}</strong><p>{c.previewBody}</p></div>}{api&&realtime!=='SUBSCRIBED'&&<p className="live-note"><span className="status-dot warn"/>{t.offline}</p>}{process.env.NEXT_PUBLIC_DATA_MODE==='sample'&&<div className="notice">LOCAL TEST DATA — these reservations do not secure real food.</div>}{error&&<ErrorNotice message={error} retry={reload}/>}
 <div className="meal-grid">{loading&&!meals.length?[1,2,3,4].map(i=><div key={i} className="skeleton meal-skeleton" aria-label={t.loading}/>):filtered.map((m,i)=><motion.article className={`meal-card ${m.available_portions===0?'sold-out':''}`} key={m.id} initial={reduced?false:{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.25,delay:Math.min(i*.04,.15)}}><div className="meal-image"><img src={mealPhoto(m)} alt={c.photo} loading="lazy"/><span className={`diet-label ${m.diet==='nonveg'?'nonveg':''}`}><i className={`diet-dot ${m.diet}`}/>{m.diet==='veg'?t.veg:t.nonveg}</span>{!api&&<span className="sample-badge">{c.preview}</span>}<span className={`window-badge ${isServing(m,clock)?'serving':''}`}><Clock size={12}/>{m.available_portions===0?t.soldOut:isServing(m,clock)?c.ready:c.later}</span><span className="photo-label">{c.photo}</span>{m.available_portions===0&&<div className="sold-out-overlay"><Check size={26}/>{t.soldOut}</div>}</div><div className="meal-content"><div className="venue-row"><span><Utensils size={14}/>{m.venue_name}</span>{coords&&<span className="distance-badge">{distanceKm(coords,m).toFixed(1)} km</span>}</div><h3>{m.title}</h3><p className="meal-description">{m.description}</p><div className="collection-summary"><p><Clock size={14}/><span>{t.serving}</span><strong>{mealTime(m.starts_at,lang)} – {mealTime(m.ends_at,lang)}</strong></p><div><span className={`portion-count ${m.available_portions>0&&m.available_portions<=3?'low':''}`}>{m.available_portions} {t.portions}</span><strong className="free-label">{t.free}</strong></div></div><Link aria-label={t.details} className="meal-detail-button" href={`/meal/${m.id}`}>{c.viewDetails}<ArrowRight size={17}/></Link></div></motion.article>)}</div>
 {!loading&&!error&&!filtered.length&&<div className="empty-state"><Search size={30}/><h3>{t.empty}</h3><p>{c.notFound}</p><Button variant="secondary" onClick={reset}>{c.reset}</Button></div>}
 <section className="rules-strip" id="how-it-works" aria-label={t.how}>{[[c.oneActive,c.body2],[t.serving,c.policy],[c.pickup,c.body3]].map(([title,body],i)=><article key={title}><span>{i+1}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</section></section>
 :screen==='detail'?(!selected?(loading?<div className="wrap section"><div className="skeleton"/></div>:<div className="wrap section"><Empty title={c.unavailable} body={t.emptyHelp}/>{error&&<ErrorNotice message={error} retry={reload}/>}</div>):<MealDetailView meal={selected} active={active} busy={busy} error={actionError} reserve={()=>void reserve(selected)} report={()=>{if(requireAuth())setReportMeal(selected);}}/> )
 :screen==='reservation'?(!user&&!ready?<div className="wrap section"><div className="skeleton"/></div>:!user?<div className="wrap section"><SignInEmpty/></div>:!currentToken?(waitForToken?<div className="wrap section"><div className="skeleton"/></div>:<div className="wrap section"><Empty title={c.notYourToken} body={t.noReservationsHelp}/>{error&&<ErrorNotice message={error} retry={reload}/>}</div>):<ReservationView reservation={currentToken} meal={meals.find(m=>m.id===currentToken.listing_id)} now={clock} cancel={()=>setConfirmRelease(currentToken)}/>)
 :screen==='meals'?<section className="wrap section account-section"><div className="account-heading"><p className="eyebrow">{t.meals}</p><h1>{c.history}</h1><p className="page-intro">{c.historyBody}</p></div>{!user?<SignInEmpty/>:error?<ErrorNotice message={error} retry={reload}/>:ownReservations.length?<div className="reservation-grid">{ownReservations.map(r=>{const m=meals.find(x=>x.id===r.listing_id),status=effectiveStatus(r,clock);return <article className="reservation-card" key={r.id}><div className="reservation-top"><Ticket size={23}/><span className={`badge ${status==='active'?'':status==='served'?'neutral':'red'}`}>{t[status]}</span></div><h3>{m?.title||t.meals}</h3><p>{m?.venue_name}</p><p className="status-line">{t.reservedAt} {new Date(r.created_at).toLocaleDateString()}</p>{status==='active'?<><ReservationClock reservation={r} now={clock}/><Link className="button primary full" href={`/reservation/${r.id}`}>{t.viewToken}<ArrowRight size={16}/></Link></>:status==='served'?<Button variant="secondary" onClick={()=>setFeedback(r)}><MessageCircle size={15}/>{t.feedback}</Button>:null}</article>})}</div>:<Empty title={t.noReservations} body={t.noReservationsHelp}/>}</section>
 :<section className="wrap section account-section profile-section"><div className="account-heading"><p className="eyebrow">{t.profile}</p><h1>{c.account}</h1><p className="page-intro">{c.accountBody}</p><div className="account-reassurance"><ShieldCheck size={20}/><p>{t.preferred}</p></div></div><div>{user?<ProfileForm/>:<SignInEmpty/>}</div></section>}
 </main><footer className="site-footer"><div className="wrap footer"><Link href="/" className="wordmark" aria-label="HUNGER home">HUNGER<span className="wordmark-dot">·</span></Link><p>{c.trust}</p><a href={consoleUrl}>{t.host}<ArrowUpRight size={15}/></a></div></footer>
 <nav className="mobile-nav" aria-label="Mobile navigation">{[['discover','/',t.find],['meals','/meals',t.meals],['profile','/profile',t.profile]].map(([id,href,label])=><Link key={id} href={href} aria-current={(screen===id||(id==='discover'&&screen==='detail')||(id==='meals'&&screen==='reservation'))?'page':undefined}>{id==='discover'?<Home size={21}/>:id==='meals'?<Ticket size={21}/>:<UserRound size={21}/>}<span>{label}</span></Link>)}</nav>
 {reportMeal&&<ReportForm meal={reportMeal} onClose={()=>setReportMeal(null)}/>}{feedback&&<FeedbackForm reservation={feedback} onClose={()=>setFeedback(null)}/>}{confirmRelease&&<Modal title={t.release} onClose={()=>setConfirmRelease(null)}><h2>{t.confirmRelease}</h2><p className="muted">{c.cancelBody}</p>{actionError&&<ErrorNotice message={actionError}/>}<div className="detail-actions"><Button busy={busy} onClick={()=>void release(confirmRelease)}>{t.release}</Button><Button variant="secondary" onClick={()=>setConfirmRelease(null)}>{c.keepReservation}</Button></div></Modal>}
 </>;
}
function Empty({title,body}:{title:string;body:string}){const {t}=useHunger();return <div className="empty-state"><Ticket size={30}/><h3>{title}</h3><p>{body}</p><Link className="button primary" href="/">{t.find}<ArrowRight size={16}/></Link></div>;}
function SignInEmpty(){const{t,setAuthOpen}=useHunger();return <div className="empty-state"><UserRound size={33}/><h3>{t.signinFirst}</h3><Button onClick={()=>setAuthOpen(true)}>{t.signin}<LogIn size={15}/></Button></div>;}
function ProfileForm() {
  const { api, user, profile, t, lang, setLang, notify, reloadProfile } =
    useHunger();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!profile) return <div className="skeleton" />;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!api || !user) return;
    setBusy(true);
    setError("");
    const d = new FormData(e.currentTarget);
    try {
      await api.updateProfile(user.id, {
        display_name: d.get("display_name"),
        language: d.get("language"),
        work_areas: String(d.get("work_areas"))
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        on_duty: d.get("on_duty") === "on",
      });
      await reloadProfile();
      notify(t.saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="profile-form" onSubmit={save}>
      <label>
        {t.name}
        <input
          name="display_name"
          defaultValue={profile.display_name}
          required
          maxLength={80}
        />
      </label>
      <label>
        {t.language}
        <select
          name="language"
          value={lang}
          onChange={(e) => setLang(e.target.value as Language)}
        >
          <option value="en">English</option>
          <option value="kn">ಕನ್ನಡ</option>
          <option value="hi">हिन्दी</option>
        </select>
      </label>
      <label>
        {t.workAreas}
        <input
          aria-label={t.workAreas}
          aria-describedby="areas-help"
          name="work_areas"
          defaultValue={profile.work_areas.join(", ")}
          placeholder={t.comma}
        />
        <small id="areas-help">{t.preferred}</small>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          name="on_duty"
          defaultChecked={profile.on_duty}
        />
        {t.duty}
      </label>
      <div className="notice">{t.noAlerts}</div>
      {error && <ErrorNotice message={error} />}
      <div className="profile-actions">
        <Button busy={busy}>
          {t.save}
          <Check size={15} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            void api
              ?.signOut()
              .then(() => notify(t.signout))
              .catch((e) => notify(errorMessage(e)))
          }
        >
          <LogOut size={15} />
          {t.signout}
        </Button>
      </div>
    </form>
  );
}
function ReportForm({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const { api, t, notify } = useHunger();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title={t.report} onClose={onClose}>
      <h2>{t.report}</h2>
      <p className="muted">{meal.venue_name}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const d = new FormData(e.currentTarget);
          try {
            await api!.report(meal.id, String(d.get("reason")));
            notify(t.reported);
            onClose();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t.reportPrompt}
          <textarea name="reason" minLength={8} maxLength={1000} required />
        </label>
        {error && <ErrorNotice message={error} />}
        <Button className="full" busy={busy}>
          {t.send}
        </Button>
      </form>
    </Modal>
  );
}
function FeedbackForm({
  reservation,
  onClose,
}: {
  reservation: Reservation;
  onClose: () => void;
}) {
  const { api, t, notify } = useHunger();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title={t.feedback} onClose={onClose}>
      <h2>{t.feedback}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const d = new FormData(e.currentTarget);
          try {
            await api!.leaveFeedback({
              reservation_id: reservation.id,
              rating: Number(d.get("rating")),
              comment: String(d.get("comment")),
            });
            notify(t.feedbackThanks);
            onClose();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t.rating}
          <select name="rating" defaultValue="5">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.comment}
          <textarea name="comment" maxLength={600} />
        </label>
        {error && <ErrorNotice message={error} />}
        <Button className="full" busy={busy}>
          {t.send}
        </Button>
      </form>
    </Modal>
  );
}
