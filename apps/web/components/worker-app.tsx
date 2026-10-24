"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  MapPin,
  Clock,
  Heart,
  Utensils,
  Navigation,
  Leaf,
  LogIn,
  RefreshCw,
  Ticket,
  Check,
  ShieldCheck,
  LocateFixed,
  UserRound,
  LogOut,
  MessageCircle,
  Search,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Home,
  CheckCircle2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Button,
  ErrorNotice,
  LanguageSelect,
  Modal,
  useHunger,
} from "@hunger/ui";
import {
  sampleMeals,
  distanceKm,
  isServing,
  directions,
  mealTime,
  effectiveStatus,
  tokenSeconds,
  qrPayload,
  errorMessage,
  type Meal,
  type Reservation,
  type Coords,
  type Language,
} from "@hunger/core";
import { copyFor, mealPhoto } from "../lib/presentation";
type Screen = "discover" | "meals" | "profile";
const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL || "http://localhost:3001";
export function WorkerApp({ screen }: { screen: Screen }) {
  const {
    api,
    user,
    t,
    lang,
    setLang,
    setAuthOpen,
    notify,
    version,
    realtime,
    reload,
  } = useHunger();
  const [meals, setMeals] = useState<Meal[]>([]),
    [reservations, setReservations] = useState<Reservation[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Meal | null>(null),
    [token, setToken] = useState<Reservation | null>(null),
    [busy, setBusy] = useState(false);
  const [area, setArea] = useState("all"),
    [diet, setDiet] = useState("all"),
    [windowFilter, setWindowFilter] = useState("all"),
    [coords, setCoords] = useState<Coords | null>(null),
    [radius, setRadius] = useState(0),
    [locationBusy, setLocationBusy] = useState(false),
    [reportMeal, setReportMeal] = useState<Meal | null>(null),
    [feedback, setFeedback] = useState<Reservation | null>(null);
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const c = copyFor(lang);
  const active = reservations.find((r) => effectiveStatus(r) === "active");
  const load = useCallback(async () => {
    if (!api) {
      setMeals(sampleMeals());
      setLoading(false);
      return;
    }
    try {
      const list = await api.meals();
      setMeals(list);
      if (user)
        setReservations(
          (await api.reservations()).filter((r) => r.worker_id === user.id),
        );
      else setReservations([]);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [api, user]);
  useEffect(() => {
    void load();
  }, [load, version]);
  const areas = useMemo(
    () => [...new Set(meals.map((m) => m.area))].sort(),
    [meals],
  );
  const filtered = useMemo(
    () =>
      meals
        .filter(
          (m) =>
            m.status === "open" &&
            Date.parse(m.ends_at) > Date.now() &&
            (area === "all" || m.area === area) &&
            (!query.trim() ||
              [m.title, m.description, m.area, m.venue_name]
                .join(" ")
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase())) &&
            (diet === "all" || m.diet === diet) &&
            (windowFilter !== "now" || isServing(m)) &&
            (!coords || !radius || distanceKm(coords, m) <= radius),
        )
        .sort((a, b) =>
          coords
            ? distanceKm(coords, a) - distanceKm(coords, b)
            : Date.parse(a.starts_at) - Date.parse(b.starts_at),
        ),
    [meals, area, diet, windowFilter, coords, radius, query],
  );
  useEffect(() => {
    setToken((current) =>
      current ? reservations.find((r) => r.id === current.id) || current : null,
    );
  }, [reservations]);
  const requireAuth = () => {
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    return true;
  };
  async function reserve(m: Meal) {
    if (!api || !requireAuth()) {
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    try {
      const r = await api.reserve(m.id);
      setToken(r);
      setSelected(null);
      notify(t.reserved);
      reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function release(r: Reservation) {
    if (!api || !window.confirm(t.confirmRelease)) return;
    setBusy(true);
    try {
      await api.cancel(r.id);
      setToken(null);
      notify(t.released);
      reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      notify("Location is unavailable. Choose an area instead.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setRadius(5);
        setLocationBusy(false);
      },
      () => {
        notify("Location access was unavailable. Choose an area instead.");
        setLocationBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link href="/" className="wordmark" aria-label="HUNGER home">
            <span className="brand-symbol">
              <Utensils size={21} />
            </span>
            hunger<span className="wordmark-dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link
              href="/#find-food"
              aria-current={screen === "discover" ? "page" : undefined}
            >
              {t.find}
            </Link>
            <Link
              href="/meals"
              aria-current={screen === "meals" ? "page" : undefined}
            >
              {t.meals}
            </Link>
            <Link
              href="/profile"
              aria-current={screen === "profile" ? "page" : undefined}
            >
              {t.profile}
            </Link>
          </nav>
          <div className="header-actions">
            <LanguageSelect />
            <span className="header-divider" />
            {user ? (
              <Link
                href="/profile"
                className="avatar-link"
                aria-label={t.profile}
              >
                <UserRound size={19} />
              </Link>
            ) : (
              <Button onClick={() => setAuthOpen(true)}>
                {t.signin}
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main-content">
        {screen === "discover" ? (
          <>
            <section className="wrap hero">
              <div className="hero-copy">
                <p className="hero-tag">
                  <span className="status-dot" />
                  {c.tag}
                </p>
                <h1>
                  {c.title}
                  <br />
                  <span>{c.accent}</span>
                </h1>
                <p className="hero-description">{c.intro}</p>
                <div className="hero-actions">
                  <a href="#find-food" className="button primary">
                    {c.explore}
                    <ArrowRight size={18} />
                  </a>
                  <a href="#how-it-works" className="hero-how">
                    {t.how}
                    <ChevronRight size={16} />
                  </a>
                </div>
                <div className="hero-trust">
                  <ShieldCheck size={16} />
                  {t.free}
                  <span>·</span>
                  {c.pickup}
                </div>
              </div>
              <div className="hero-visual">
                <img
                  src="/assets/thali-v2.jpg"
                  alt={c.photo}
                  fetchPriority="high"
                />
                <span className="hero-photo-label">{c.photo}</span>
                <div className="hero-caption">
                  <span className="caption-heart">
                    <Heart size={22} />
                  </span>
                  <div>
                    <strong>{c.zero}</strong>
                    <span>{c.community}</span>
                  </div>
                  <span className="caption-spark">
                    <Sparkles size={20} />
                  </span>
                </div>
              </div>
            </section>
            <section className="wrap discovery section" id="find-food">
              {active && (
                <div className="active-reservation">
                  <div className="active-icon">
                    <Ticket size={23} />
                  </div>
                  <div>
                    <strong>{c.active}</strong>
                    <p>{c.activeBody}</p>
                  </div>
                  <Button onClick={() => setToken(active)}>
                    {t.viewToken}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              )}
              <div className="section-head">
                <div>
                  <p className="eyebrow">{c.neighbourhood}</p>
                  <h2>
                    {c.nearYou}
                    <span className="red-dot">.</span>
                  </h2>
                  <p className="section-description">{t.discoverBody}</p>
                </div>
                <div className="result-count" role="status" aria-live="polite">
                  <span className={`status-dot ${!api ? "warn" : ""}`} />
                  {loading
                    ? t.loading
                    : `${filtered.length} ${lang === "en" && filtered.length === 1 ? "meal to explore" : c.results}`}
                  <button
                    className="refresh-button"
                    aria-label={t.refresh}
                    onClick={reload}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
              <div className="finder-panel">
                <div className="search-row">
                  <label className="search-input">
                    <Search size={20} />
                    <span className="sr-only">{c.search}</span>
                    <input
                      type="search"
                      placeholder={c.search}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label className="area-input">
                    <MapPin size={19} />
                    <span className="sr-only">{t.area}</span>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    >
                      <option value="all">{t.allAreas}</option>
                      {areas.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <Button
                    variant="secondary"
                    busy={locationBusy}
                    onClick={locate}
                  >
                    <LocateFixed size={17} />
                    <span>{t.nearby}</span>
                  </Button>
                </div>
                <div className="filter-row">
                  <div className="tab-buttons" role="group" aria-label="Diet">
                    {[
                      ["all", t.all],
                      ["veg", t.veg],
                      ["nonveg", t.nonveg],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setDiet(value)}
                        aria-pressed={diet === value}
                      >
                        {value === "veg" ? (
                          <Leaf size={15} />
                        ) : value === "all" ? (
                          <Utensils size={15} />
                        ) : null}
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="time-filter">
                    <Clock size={16} />
                    <span className="sr-only">{t.serving}</span>
                    <select
                      value={windowFilter}
                      onChange={(e) => setWindowFilter(e.target.value)}
                    >
                      <option value="all">{t.anyTime}</option>
                      <option value="now">{t.now}</option>
                    </select>
                  </label>
                  {coords && (
                    <label className="distance-filter">
                      <span className="sr-only">{t.distance}</span>
                      <select
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                      >
                        <option value={0}>{t.anyDistance}</option>
                        <option value={2}>2 km</option>
                        <option value={5}>5 km</option>
                        <option value={10}>10 km</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>
              {!api && (
                <div className="preview-banner">
                  <span className="preview-dot" />
                  <strong>{c.preview}</strong>
                  <p>{c.previewBody}</p>
                </div>
              )}
              {api && (
                <p className="live-note">
                  <span
                    className={`status-dot ${realtime !== "SUBSCRIBED" ? "warn" : ""}`}
                  />
                  {realtime === "SUBSCRIBED" ? t.updated : t.offline}
                </p>
              )}
              {process.env.NEXT_PUBLIC_DATA_MODE === "sample" && (
                <div className="notice">
                  LOCAL TEST DATA — these reservations do not secure real food.
                </div>
              )}
              {error && <ErrorNotice message={error} retry={reload} />}
              <div className="meal-grid">
                {loading
                  ? [1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="meal-skeleton skeleton"
                        aria-label={t.loading}
                      />
                    ))
                  : filtered.map((m, i) => (
                      <motion.article
                        className="meal-card"
                        key={m.id}
                        initial={reduced ? false : { opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(i * 0.06, 0.18),
                        }}
                      >
                        <div className="meal-image">
                          <img
                            src={mealPhoto(m)}
                            alt={c.photo}
                            loading="lazy"
                          />
                          <span
                            className={`diet-label ${m.diet === "veg" ? "" : "nonveg"}`}
                          >
                            <span />
                            {m.diet === "veg" ? t.veg : t.nonveg}
                          </span>
                          <span className="photo-label">{c.photo}</span>
                        </div>
                        <div className="meal-content">
                          <div className="card-status">
                            <span
                              className={`availability ${!isServing(m) ? "upcoming" : ""}`}
                            >
                              <i />
                              {m.available_portions === 0
                                ? t.soldOut
                                : isServing(m)
                                  ? c.ready
                                  : c.later}
                            </span>
                            <span className="portion-count">
                              {m.available_portions} {t.portions}
                            </span>
                          </div>
                          <h3>{m.title}</h3>
                          <p className="venue-name">
                            {m.venue_name}
                            {m.verification === "approved" && (
                              <ShieldCheck size={14} />
                            )}
                          </p>
                          <p className="meal-description">{m.description}</p>
                          <div className="meal-meta">
                            <span>
                              <MapPin size={15} />
                              {m.area}
                              {coords &&
                                ` · ${distanceKm(coords, m).toFixed(1)} km`}
                            </span>
                            <span>
                              <Clock size={15} />
                              {mealTime(m.starts_at, lang)} –{" "}
                              {mealTime(m.ends_at, lang)}
                            </span>
                          </div>
                          <div className="meal-bottom">
                            <div className="free-price">
                              ₹0<span>{t.free}</span>
                            </div>
                            <button
                              className="meal-detail-button"
                              onClick={() => setSelected(m)}
                            >
                              {t.details}
                              <ArrowRight size={17} />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
              </div>
              {!loading && !error && !filtered.length && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Search size={28} />
                  </div>
                  <h3>{t.empty}</h3>
                  <p>{c.notFound}</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setArea("all");
                      setDiet("all");
                      setWindowFilter("all");
                      setRadius(0);
                      setQuery("");
                    }}
                  >
                    {c.reset}
                  </Button>
                </div>
              )}
              <p className="finder-note">
                <ShieldCheck size={16} />
                {t.collect}. {t.phoneFree}
              </p>
            </section>
            <section className="how-section" id="how-it-works">
              <div className="wrap">
                <div className="how-heading">
                  <p className="eyebrow">{t.how}</p>
                  <h2>{c.how}</h2>
                </div>
                <div className="steps">
                  {[
                    [c.step1, c.body1],
                    [c.step2, c.body2],
                    [c.step3, c.body3],
                  ].map(([title, body], i) => (
                    <article key={title}>
                      <div className="step-icon">
                        {i === 0 ? (
                          <Search />
                        ) : i === 1 ? (
                          <Ticket />
                        ) : (
                          <Utensils />
                        )}
                      </div>
                      <span className="step-number">0{i + 1}</span>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </article>
                  ))}
                </div>
                <div className="share-banner">
                  <div>
                    <h3>{c.share}</h3>
                    <p>{c.shareBody}</p>
                  </div>
                  <a href={consoleUrl} className="button secondary">
                    {t.host}
                    <ArrowUpRight size={17} />
                  </a>
                </div>
              </div>
            </section>
          </>
        ) : screen === "meals" ? (
          <section className="wrap section account-section">
            <div className="account-heading">
              <div className="page-icon">
                <Ticket size={26} />
              </div>
              <p className="eyebrow">{t.meals}</p>
              <h1>{c.history}</h1>
              <p className="page-intro">{c.historyBody}</p>
            </div>
            {!user ? (
              <SignInEmpty />
            ) : error ? (
              <ErrorNotice message={error} retry={reload} />
            ) : reservations.length ? (
              <div className="reservation-grid">
                {reservations.map((r) => {
                  const m = meals.find((x) => x.id === r.listing_id);
                  const status = effectiveStatus(r);
                  return (
                    <article key={r.id} className="reservation-card">
                      <div className="reservation-top">
                        <Ticket size={24} />
                        <span
                          className={`badge ${status === "active" ? "" : status === "served" ? "neutral" : "red"}`}
                        >
                          {t[status]}
                        </span>
                      </div>
                      <h3>{m?.title || t.meals}</h3>
                      <p>{m?.venue_name}</p>
                      <p className="status-line">
                        {t.reservedAt}{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      {status === "active" ? (
                        <>
                          <Countdown reservation={r} />
                          <Button className="full" onClick={() => setToken(r)}>
                            {t.viewToken}
                            <ArrowRight size={16} />
                          </Button>
                        </>
                      ) : status === "served" ? (
                        <Button
                          variant="secondary"
                          onClick={() => setFeedback(r)}
                        >
                          <MessageCircle size={15} />
                          {t.feedback}
                        </Button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Ticket size={30} />
                </div>
                <h3>{t.noReservations}</h3>
                <p>{t.noReservationsHelp}</p>
                <Link href="/#find-food" className="button primary">
                  {c.browse}
                  <ArrowRight size={17} />
                </Link>
              </div>
            )}
          </section>
        ) : (
          <section className="wrap section account-section profile-section">
            <div className="account-heading">
              <div className="page-icon">
                <UserRound size={26} />
              </div>
              <p className="eyebrow">{t.profile}</p>
              <h1>{c.account}</h1>
              <p className="page-intro">{c.accountBody}</p>
              <div className="account-reassurance">
                <ShieldCheck size={20} />
                <p>{t.preferred}</p>
              </div>
            </div>
            <div>{user ? <ProfileForm /> : <SignInEmpty />}</div>
          </section>
        )}
      </main>
      <footer className="wrap footer">
        <Link href="/" className="wordmark" aria-label="HUNGER home">
          <span className="brand-symbol">
            <Utensils size={18} />
          </span>
          hunger<span className="wordmark-dot">.</span>
        </Link>
        <p>{c.trust}</p>
        <a href={consoleUrl}>
          {t.host}
          <ArrowUpRight size={15} />
        </a>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ["discover", "/", t.find],
          ["meals", "/meals", t.meals],
          ["profile", "/profile", t.profile],
        ].map(([id, href, label]) => (
          <Link
            key={id}
            href={href}
            aria-current={screen === id ? "page" : undefined}
          >
            {id === "discover" ? (
              <Home size={21} />
            ) : id === "meals" ? (
              <Ticket size={21} />
            ) : (
              <UserRound size={21} />
            )}
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      {selected && (
        <Modal title={t.details} onClose={() => setSelected(null)}>
          <img
            className="detail-photo"
            src={mealPhoto(selected)}
            alt={c.photo}
          />
          <span className="badge">
            {selected.diet === "veg" ? t.veg : t.nonveg}
          </span>
          <h2 className="detail-title">{selected.title}</h2>
          <p className="muted">{selected.description}</p>
          <div className="detail-venue">
            <MapPin size={17} />
            <div>
              <strong>{selected.venue_name}</strong>
              <p>{selected.address}</p>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <small>{t.serving}</small>
              <strong>
                {mealTime(selected.starts_at, lang)} -{" "}
                {mealTime(selected.ends_at, lang)}
              </strong>
            </div>
            <div>
              <small>{t.cooked}</small>
              <strong>{mealTime(selected.cooked_at, lang)}</strong>
            </div>
            <div>
              <small>{t.portions}</small>
              <strong>{selected.available_portions}</strong>
            </div>
            <div>
              <small>{t.free}</small>
              <strong>₹0</strong>
            </div>
          </div>
          <p className="instructions">
            <b>{t.instructions}</b>
            <br />
            {selected.instructions}
          </p>
          <div className="detail-actions">
            <Button
              busy={busy}
              disabled={!isServing(selected)}
              onClick={() => void reserve(selected)}
            >
              {t.reserve}
              <Ticket size={15} />
            </Button>
            <a
              className="button secondary"
              href={directions(selected)}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={14} />
              {t.directions}
            </a>
          </div>
          {!isServing(selected) && (
            <p className="muted availability-note">
              {selected.available_portions === 0
                ? t.soldOut
                : Date.parse(selected.starts_at) > Date.now()
                  ? t.upcoming
                  : t.ended}
            </p>
          )}
          {!api && <p className="preview-notice">{t.sampleNotice}</p>}
          {api && (
            <button
              className="report-link"
              onClick={() => {
                if (requireAuth()) {
                  setReportMeal(selected);
                  setSelected(null);
                }
              }}
            >
              {t.report}
            </button>
          )}
        </Modal>
      )}
      {token && (
        <Modal title={t.token} onClose={() => setToken(null)}>
          <div className="token-success">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="token-heading">{t.token}</h2>
          <p className="token-note muted">{t.mealSaved}</p>
          <div className="qr-wrap">
            <QRCodeSVG
              role="img"
              aria-label={t.token}
              value={qrPayload(token)}
              size={176}
              level="M"
              title={t.token}
            />
          </div>
          <p className="backup-label">{c.backup}</p>
          <div className="backup-code">{token.code}</div>
          {effectiveStatus(token) === "active" ? (
            <Countdown reservation={token} />
          ) : (
            <p className="countdown">{t[effectiveStatus(token)]}</p>
          )}
          <p className="token-venue">
            {meals.find((m) => m.id === token.listing_id)?.venue_name}
          </p>
          <p className="muted token-note">{t.tokenNote}</p>
          {effectiveStatus(token) === "active" && (
            <Button
              variant="secondary"
              className="full"
              busy={busy}
              onClick={() => void release(token)}
            >
              {t.release}
            </Button>
          )}
        </Modal>
      )}
      {reportMeal && (
        <ReportForm meal={reportMeal} onClose={() => setReportMeal(null)} />
      )}
      {feedback && (
        <FeedbackForm
          reservation={feedback}
          onClose={() => setFeedback(null)}
        />
      )}
    </>
  );
}
function Countdown({ reservation }: { reservation: Reservation }) {
  const { t } = useHunger();
  const [seconds, setSeconds] = useState(() => tokenSeconds(reservation));
  useEffect(() => {
    setSeconds(tokenSeconds(reservation));
    const id = setInterval(() => setSeconds(tokenSeconds(reservation)), 1000);
    return () => clearInterval(id);
  }, [reservation]);
  return (
    <p className={`countdown ${seconds <= 60 ? "urgent" : ""}`}>
      {seconds
        ? `${t.expiresIn} ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
        : t.expiredNote}
    </p>
  );
}
function SignInEmpty() {
  const { t, setAuthOpen } = useHunger();
  return (
    <div className="empty-state">
      <UserRound size={35} />
      <h3>{t.signinFirst}</h3>
      <Button onClick={() => setAuthOpen(true)}>
        {t.signin}
        <LogIn size={15} />
      </Button>
    </div>
  );
}
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
