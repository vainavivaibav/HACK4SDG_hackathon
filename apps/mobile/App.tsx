import "react-native-url-polyfill/auto";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import QRCode from "react-native-qrcode-svg";
import {
  createHungerClient,
  HungerApi,
  sampleMeals,
  dictionaries,
  mealTime,
  isServing,
  directions,
  distanceKm,
  effectiveStatus,
  tokenSeconds,
  qrPayload,
  parseQr,
  errorMessage,
  type Profile,
  type Meal,
  type Reservation,
  type Language,
  type Coords,
} from "@hunger/core";
import type { User } from "@supabase/supabase-js";
import { Icon, type IconName } from "./src/ui/icons";
import { copyFor } from "./src/ui/copy";
import { s, palette } from "./src/ui/styles";
import { sessionStorage } from "./src/storage";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL,
  key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const api =
  url && key
    ? new HungerApi(
        createHungerClient(url, key, {
          auth: {
            storage: sessionStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        }),
      )
    : null;
type Screen = "discover" | "meals" | "profile" | "counter";
export default function App() {
  return (
    <SafeAreaProvider>
      <MobileApp />
    </SafeAreaProvider>
  );
}
function MobileApp() {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [lang, setLang] = useState<Language>("en"),
    [screen, setScreen] = useState<Screen>("discover"),
    [meals, setMeals] = useState<Meal[]>([]),
    [reservations, setReservations] = useState<Reservation[]>([]),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [area, setArea] = useState("all"),
    [diet, setDiet] = useState("all"),
    [coords, setCoords] = useState<Coords | null>(null),
    [radius, setRadius] = useState(0),
    [servingNow, setServingNow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false),
    [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [areas, setAreas] = useState(""),
    [duty, setDuty] = useState(false),
    [detail, setDetail] = useState<Meal | null>(null),
    [token, setToken] = useState<Reservation | null>(null),
    [clock, setClock] = useState(Date.now()),
    [feedback, setFeedback] = useState<Reservation | null>(null),
    [comment, setComment] = useState(""),
    [rating, setRating] = useState(5),
    [report, setReport] = useState<Meal | null>(null),
    [reason, setReason] = useState("");
  const [hostMeals, setHostMeals] = useState<Meal[]>([]),
    [counterId, setCounterId] = useState(""),
    [counterToken, setCounterToken] = useState(""),
    [camera, setCamera] = useState(false),
    [permission, requestPermission] = useCameraPermissions();
  const loadedUser = useRef<string | null>(null);
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const [reduced, setReduced] = useState(false);
  const t = dictionaries[lang],
    c = copyFor(lang);
  const [query, setQuery] = useState("");
  function goTo(next: Screen) {
    setScreen(next);
    setError("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  const notify = (s: string) => {
    setMessage(s);
    setTimeout(
      () => setMessage((current) => (current === s ? "" : current)),
      6000,
    );
  };
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduced) return;
    fade.setValue(0.4);
    Animated.timing(fade, {
      toValue: 1,
      duration: 240,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [screen, reduced, fade]);
  const load = useCallback(async () => {
    if (!api) {
      setMeals(sampleMeals());
      setLoading(false);
      return;
    }
    try {
      const list = await api.meals();
      setMeals(list);
      if (user) {
        const [r, p, v] = await Promise.all([
          api.reservations(),
          api.profile(user.id),
          api.venues(),
        ]);
        setReservations(r.filter((x) => x.worker_id === user.id));
        setProfile(p);
        if (loadedUser.current !== user.id) {
          setName(p.display_name);
          setAreas(p.work_areas.join(", "));
          setDuty(p.on_duty);
          setLang(p.language);
          loadedUser.current = user.id;
        }
        const ids = new Set(
          v
            .filter((x) => x.owner_id === user.id || p.role === "admin")
            .map((x) => x.id),
        );
        setHostMeals(
          list.filter((x) => ids.has(x.venue_id) && x.status === "open"),
        );
      } else {
        setReservations([]);
        setProfile(null);
        loadedUser.current = null;
      }
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);
  useEffect(() => {
    if (!api) return;
    void api.client.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = api.client.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") api.client.auth.startAutoRefresh();
      else api.client.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      app.remove();
    };
  }, []);
  useEffect(() => {
    void load();
    if (!api) return;
    const off = api.subscribe(() => void load());
    const timer = setInterval(() => {
      if (AppState.currentState === "active") {
        if (user)
          void api!
            .refresh()
            .then(load)
            .catch(() => {});
        else void load();
      }
    }, 30000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [load, user]);
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function authenticate() {
    if (!api) {
      setError(t.noBackend);
      return;
    }
    await perform(async () => {
      if (signup) {
        const r = await api.signUp(email, password, name);
        notify(t.signupSuccess);
        if (r.session) setAuthOpen(false);
        else setSignup(false);
      } else {
        await api.signIn(email, password);
        setAuthOpen(false);
      }
      setPassword("");
    });
  }
  async function reserve(m: Meal) {
    if (!user || !api) {
      setDetail(null);
      setAuthOpen(true);
      return;
    }
    await perform(async () => {
      const r = await api.reserve(m.id);
      setDetail(null);
      setToken(r);
      notify(t.reserved);
      await load();
    });
  }
  function release(r: Reservation) {
    const doRelease = () =>
      void perform(async () => {
        await api!.cancel(r.id);
        setToken(null);
        notify(t.released);
        await load();
      });
    if (Platform.OS === "web") {
      if (window.confirm(t.confirmRelease)) doRelease();
    } else
      Alert.alert(t.release, t.confirmRelease, [
        { text: t.cancel, style: "cancel" },
        { text: t.release, onPress: doRelease },
      ]);
  }
  async function locate() {
    await perform(async () => {
      const access = await Location.requestForegroundPermissionsAsync();
      if (access.status !== "granted")
        throw new Error(
          "Location access was not granted. Select an area instead.",
        );
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      setRadius(5);
    });
  }
  const filtered = meals
    .filter(
      (m) =>
        m.status === "open" &&
        Date.parse(m.ends_at) > clock &&
        (area === "all" || m.area === area) &&
        (!query.trim() ||
          [m.title, m.description, m.venue_name, m.area]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase())) &&
        (diet === "all" || m.diet === diet) &&
        (!servingNow || isServing(m)) &&
        (!coords || !radius || distanceKm(coords, m) <= radius),
    )
    .sort((a, b) =>
      coords ? distanceKm(coords, a) - distanceKm(coords, b) : 0,
    );
  const activeReservation = reservations.find(
    (r) => effectiveStatus(r, clock) === "active",
  );
  const activeToken = token
    ? reservations.find((r) => r.id === token.id) || token
    : null;
  const showSignIn = (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name="user" size={30} color={palette.red} />
      </View>
      <Text style={s.sectionTitle}>{t.signinFirst}</Text>
      <Action onPress={() => setAuthOpen(true)}>{t.signin}</Action>
    </View>
  );
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="HUNGER home"
          onPress={() => goTo("discover")}
          style={s.wordmark}
        >
          <View style={s.brandIcon}>
            <Icon name="utensils" size={19} color="white" />
          </View>
          <Text style={s.brand}>
            hunger<Text style={s.red}>.</Text>
          </Text>
        </Pressable>
        <View style={s.row}>
          {(["en", "kn", "hi"] as Language[]).map((l) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                { en: "English", kn: "ಕನ್ನಡ", hi: "हिन्दी" }[l]
              }
              accessibilityState={{ selected: lang === l }}
              key={l}
              onPress={() => setLang(l)}
              style={[s.lang, lang === l && s.langActive]}
            >
              <Text style={[s.langText, lang === l && s.red]}>
                {{ en: "EN", kn: "ಕ", hi: "हि" }[l]}
              </Text>
            </Pressable>
          ))}
          {!user && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setAuthOpen(true)}
              style={s.loginButton}
            >
              <Text style={s.login}>{t.signin}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={palette.red}
          />
        }
      >
        <Animated.View
          style={{
            opacity: fade,
            transform: [
              {
                translateY: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          }}
        >
          {error ? (
            <View accessibilityRole="alert" style={s.error}>
              <Text style={s.errorText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setError("");
                  void load();
                }}
              >
                <Text style={s.red}>{t.retry}</Text>
              </Pressable>
            </View>
          ) : null}
          {screen === "discover" ? (
            <>
              <View style={s.neighbourhood}>
                <Icon name="pin" size={16} color={palette.red} />
                <Text style={s.neighbourhoodText}>
                  {area === "all" ? c.neighbourhood : area}
                </Text>
                <Text style={s.neighbourhoodFree}>{t.free}</Text>
              </View>
              <View style={s.hero}>
                <View style={s.heroCopy}>
                  <Text style={s.eyebrow}>{c.tag}</Text>
                  <Text style={s.heroTitle}>
                    {c.title}
                    {"\n"}
                    <Text style={s.heroAccent}>{c.accent}</Text>
                  </Text>
                  <Text style={s.heroBody}>{c.zero}</Text>
                </View>
                <Image
                  source={require("./assets/thali-v2.jpg")}
                  style={s.heroImage}
                  resizeMode="cover"
                  accessible
                  accessibilityLabel={c.photo}
                />
              </View>
              {activeReservation && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setToken(activeReservation)}
                  style={s.activeBanner}
                >
                  <Icon name="ticket" color={palette.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.activeTitle}>{c.active}</Text>
                    <Text style={s.activeBody}>{t.viewToken}</Text>
                  </View>
                  <Icon name="arrow" size={17} color={palette.green} />
                </Pressable>
              )}
              <View style={s.searchBox}>
                <Icon name="search" size={20} color="#9399a2" />
                <TextInput
                  style={s.searchField}
                  accessibilityLabel={c.search}
                  placeholder={c.search}
                  placeholderTextColor="#9297a0"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
                {!!query && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={c.reset}
                    onPress={() => setQuery("")}
                    style={s.searchClear}
                  >
                    <Icon name="close" size={17} />
                  </Pressable>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chips}
              >
                <Chip
                  active={area === "all"}
                  label={t.allAreas}
                  onPress={() => setArea("all")}
                />
                {[...new Set(meals.map((m) => m.area))].map((a) => (
                  <Chip
                    key={a}
                    active={area === a}
                    label={a}
                    onPress={() => setArea(a)}
                  />
                ))}
              </ScrollView>
              <View style={s.dietRow}>
                {[
                  ["all", t.all],
                  ["veg", t.veg],
                  ["nonveg", t.nonveg],
                ].map(([v, label]) => (
                  <Chip
                    key={v}
                    label={label}
                    active={diet === v}
                    onPress={() => setDiet(v)}
                  />
                ))}
              </View>
              <View style={s.filterRow}>
                <Chip
                  label={t.now}
                  active={servingNow}
                  onPress={() => setServingNow(!servingNow)}
                />
                <Chip
                  label={coords ? `${radius || "∞"} km` : t.nearby}
                  active={!!coords}
                  onPress={() =>
                    coords
                      ? setRadius(radius === 5 ? 10 : radius === 10 ? 0 : 5)
                      : void locate()
                  }
                />
              </View>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{c.nearYou}</Text>
                <Text style={s.resultCount}>
                  {filtered.length}{" "}
                  {lang === "en" && filtered.length === 1
                    ? "meal to explore"
                    : c.results}
                </Text>
              </View>
              {!api && (
                <View style={s.previewBanner}>
                  <View style={s.previewTop}>
                    <View style={s.previewDot} />
                    <Text style={s.previewTitle}>{c.preview}</Text>
                  </View>
                  <Text style={s.previewBody}>{c.previewBody}</Text>
                </View>
              )}
              {loading ? (
                <ActivityIndicator size="large" color={palette.red} />
              ) : filtered.length ? (
                filtered.map((m) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.details}: ${m.title}`}
                    key={m.id}
                    style={({ pressed }) => [s.mealCard, pressed && s.pressed]}
                    onPress={() => setDetail(m)}
                  >
                    <View>
                      <Image
                        source={mealImage(m)}
                        style={s.mealImage}
                        resizeMode="cover"
                        accessibilityLabel={c.photo}
                      />
                      <View style={s.dietBadge}>
                        <Icon
                          name={m.diet === "veg" ? "leaf" : "utensils"}
                          size={11}
                          color={m.diet === "veg" ? palette.green : palette.red}
                        />
                        <Text
                          style={[
                            s.dietBadgeText,
                            m.diet === "nonveg" && s.red,
                          ]}
                        >
                          {m.diet === "veg" ? t.veg : t.nonveg}
                        </Text>
                      </View>
                      <Text style={s.photoLabel}>{c.photo}</Text>
                    </View>
                    <View style={s.cardBody}>
                      <View style={s.cardRow}>
                        <Text style={s.availability}>
                          {isServing(m) ? "● " + c.ready : c.later}
                        </Text>
                        <Text style={s.portions}>
                          {m.available_portions} {t.portions}
                        </Text>
                      </View>
                      <Text style={s.cardTitle}>{m.title}</Text>
                      <Text style={s.venue}>{m.venue_name}</Text>
                      <Text style={s.cardDescription}>{m.description}</Text>
                      <View style={s.cardMeta}>
                        <View style={s.metaItem}>
                          <Icon name="pin" size={14} color="#969da5" />
                          <Text style={s.tiny}>
                            {m.area}
                            {coords
                              ? ` · ${distanceKm(coords, m).toFixed(1)} km`
                              : ""}
                          </Text>
                        </View>
                        <View style={s.metaItem}>
                          <Icon name="clock" size={14} color="#969da5" />
                          <Text style={s.tiny}>
                            {mealTime(m.starts_at, lang)} –{" "}
                            {mealTime(m.ends_at, lang)}
                          </Text>
                        </View>
                      </View>
                      <View style={s.cardBottom}>
                        <View style={s.priceRow}>
                          <Text style={s.price}>₹0</Text>
                          <Text style={s.priceNote}>{t.free}</Text>
                        </View>
                        <View style={s.detailButton}>
                          <Text style={s.detailLink}>{t.details}</Text>
                          <Icon name="arrow" size={16} color={palette.red} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={s.empty}>
                  <View style={s.emptyIcon}>
                    <Icon name="search" size={28} color={palette.red} />
                  </View>
                  <Text style={s.cardTitle}>{t.empty}</Text>
                  <Text style={s.body}>{c.notFound}</Text>
                  <Action
                    secondary
                    onPress={() => {
                      setQuery("");
                      setArea("all");
                      setDiet("all");
                      setServingNow(false);
                      setRadius(0);
                    }}
                  >
                    {c.reset}
                  </Action>
                </View>
              )}
              <View style={s.trustNote}>
                <Icon name="shield" size={15} color="#959ba3" />
                <Text style={s.bottomNote}>
                  {t.collect}. {t.phoneFree}
                </Text>
              </View>
            </>
          ) : screen === "meals" ? (
            <>
              <Text style={s.eyebrow}>HUNGER / {t.meals}</Text>
              <Text style={s.sectionTitle}>{c.history}</Text>
              <Text style={s.body}>{t.tokenNote}</Text>
              {!user ? (
                showSignIn
              ) : reservations.length ? (
                reservations.map((r) => {
                  const m = meals.find((x) => x.id === r.listing_id);
                  const status = effectiveStatus(r, clock);
                  return (
                    <View key={r.id} style={s.reservationCard}>
                      <Text style={[s.status, status === "active" && s.red]}>
                        {t[status]}
                      </Text>
                      <Text style={s.cardTitle}>{m?.title || t.meals}</Text>
                      <Text style={s.body}>{m?.venue_name}</Text>
                      {status === "active" ? (
                        <>
                          <Text style={s.countdown}>
                            {t.expiresIn}{" "}
                            {Math.floor(tokenSeconds(r, clock) / 60)}:
                            {String(tokenSeconds(r, clock) % 60).padStart(
                              2,
                              "0",
                            )}
                          </Text>
                          <Action onPress={() => setToken(r)}>
                            {t.viewToken}
                          </Action>
                        </>
                      ) : status === "served" ? (
                        <Action
                          secondary
                          onPress={() => {
                            setFeedback(r);
                            setComment("");
                            setRating(5);
                          }}
                        >
                          {t.feedback}
                        </Action>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <View style={s.empty}>
                  <Text style={s.cardTitle}>{t.noReservations}</Text>
                  <Text style={s.body}>{t.noReservationsHelp}</Text>
                  <Action onPress={() => goTo("discover")}>{t.find}</Action>
                </View>
              )}
            </>
          ) : screen === "profile" ? (
            <>
              <Text style={s.eyebrow}>HUNGER / {t.profile}</Text>
              <Text style={s.sectionTitle}>{c.account}</Text>
              <Text style={s.body}>{t.profileIntro}</Text>
              {!user ? (
                showSignIn
              ) : (
                <View style={s.formCard}>
                  <Field
                    label={t.name}
                    value={name}
                    onChangeText={setName}
                    maxLength={80}
                  />
                  <Field
                    label={t.workAreas}
                    value={areas}
                    onChangeText={setAreas}
                    placeholder={t.comma}
                  />
                  <Text style={s.tiny}>{t.preferred}</Text>
                  <View style={s.switchRow}>
                    <Text style={s.body}>{t.duty}</Text>
                    <Switch
                      accessibilityLabel={t.duty}
                      value={duty}
                      onValueChange={setDuty}
                      trackColor={{ true: palette.red }}
                    />
                  </View>
                  <Text style={s.notice}>{t.noAlerts}</Text>
                  <Action
                    busy={busy}
                    onPress={() =>
                      void perform(async () => {
                        await api!.updateProfile(user.id, {
                          display_name: name,
                          language: lang,
                          work_areas: areas
                            .split(",")
                            .map((a) => a.trim())
                            .filter(Boolean),
                          on_duty: duty,
                        });
                        notify(t.saved);
                        await load();
                      })
                    }
                  >
                    {t.save}
                  </Action>
                  <Action
                    secondary
                    onPress={() =>
                      void perform(async () => {
                        await api!.signOut();
                        setUser(null);
                        setReservations([]);
                        notify(t.signout);
                      })
                    }
                  >
                    {t.signout}
                  </Action>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={s.eyebrow}>HUNGER / SERVING COUNTER</Text>
              <Text style={s.sectionTitle}>
                A token.<Text style={s.serifRed}>{"\n"}A warm welcome.</Text>
              </Text>
              <Text style={s.body}>
                Select a listing, scan a token or enter its four-digit backup
                code, then confirm the meal is handed over.
              </Text>
              <ScrollView horizontal contentContainerStyle={s.chips}>
                {hostMeals.map((m) => (
                  <Chip
                    key={m.id}
                    active={counterId === m.id}
                    label={m.title}
                    onPress={() => {
                      setCounterId(m.id);
                      setCounterToken("");
                      setCamera(false);
                    }}
                  />
                ))}
              </ScrollView>
              {!hostMeals.length && (
                <Text style={s.notice}>
                  No open host listings. Use the host website to apply for a
                  venue and post food.
                </Text>
              )}
              <Field
                label="Backup code or scanned token"
                value={counterToken}
                onChangeText={setCounterToken}
                placeholder="0000"
              />
              <Action
                secondary
                onPress={() =>
                  void perform(async () => {
                    if (!counterId) throw new Error("Choose a listing first.");
                    if (Platform.OS !== "web" && !permission?.granted) {
                      const p = await requestPermission();
                      if (!p.granted)
                        throw new Error(
                          "Camera permission was not granted. Use the backup code.",
                        );
                    }
                    setCamera(!camera);
                  })
                }
              >
                {camera ? "Stop camera" : "Scan QR"}
              </Action>
              {camera && (
                <CameraView
                  style={s.camera}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={({ data }) => {
                    try {
                      setCounterToken(parseQr(data, counterId));
                      setCamera(false);
                    } catch (e) {
                      setError(errorMessage(e));
                      setCamera(false);
                    }
                  }}
                />
              )}
              <Action
                busy={busy}
                disabled={!counterId || !counterToken}
                onPress={() =>
                  void perform(async () => {
                    const v = /^[0-9a-f-]{36}$/i.test(counterToken)
                      ? counterToken
                      : parseQr(counterToken, counterId);
                    await api!.serve(counterId, v);
                    setCounterToken("");
                    notify("Meal served. Availability updated.");
                    await load();
                  })
                }
              >
                Confirm meal served
              </Action>
            </>
          )}
        </Animated.View>
      </ScrollView>
      <View style={s.tabBar} accessibilityRole="tablist">
        {(
          [
            ["discover", "home", t.find],
            ["meals", "ticket", t.meals],
            ["profile", "user", t.profile],
            ...(profile?.role === "host" || profile?.role === "admin"
              ? [["counter", "utensils", "Counter"]]
              : []),
          ] as [Screen, IconName, string][]
        ).map(([id, icon, label]) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: screen === id }}
            onPress={() => goTo(id)}
            style={s.tab}
          >
            <View style={[s.tabIconWrap, screen === id && s.tabActive]}>
              <Icon
                name={icon}
                size={22}
                color={screen === id ? palette.red : "#9399a2"}
              />
            </View>
            <Text style={[s.tabText, screen === id && s.red]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {!!message && (
        <View style={s.toast} accessibilityLiveRegion="polite">
          <Text style={s.toastText}>{message}</Text>
        </View>
      )}
      <Sheet
        reduced={reduced}
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title={signup ? t.signup : t.signin}
        closeLabel={t.close}
      >
        <Text style={s.sheetTitle}>
          {signup ? t.signup : t.signin}
          <Text style={s.serifRed}>.</Text>
        </Text>
        <Text style={s.body}>{t.signinFirst}</Text>
        {!api && <Text style={s.notice}>{t.noBackend}</Text>}
        {signup && (
          <Field
            label={t.name}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        )}
        <Field
          label={t.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label={t.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={signup ? "new-password" : "current-password"}
        />
        {error && (
          <Text accessibilityRole="alert" style={s.errorText}>
            {error}
          </Text>
        )}
        <Action busy={busy} disabled={!api} onPress={() => void authenticate()}>
          {signup ? t.signup : t.signin}
        </Action>
        <Action
          secondary
          onPress={() => {
            setSignup(!signup);
            setError("");
          }}
        >
          {signup ? t.haveAccount : t.noAccount}
        </Action>
      </Sheet>
      <Sheet
        reduced={reduced}
        open={!!detail}
        onClose={() => setDetail(null)}
        title={t.details}
        closeLabel={t.close}
      >
        {detail && (
          <>
            <Image
              source={mealImage(detail)}
              style={s.detailPhoto}
              accessibilityLabel={c.photo}
            />
            <Text style={s.diet}>
              {detail.diet === "veg" ? t.veg : t.nonveg}
            </Text>
            <Text style={s.sheetTitle}>{detail.title}</Text>
            <Text style={s.body}>{detail.description}</Text>
            <Text style={s.cardTitle}>{detail.venue_name}</Text>
            <Text style={s.body}>{detail.address}</Text>
            <View style={s.detailGrid}>
              <View>
                <Text style={s.tiny}>{t.serving}</Text>
                <Text style={s.detailValue}>
                  {mealTime(detail.starts_at, lang)} -{" "}
                  {mealTime(detail.ends_at, lang)}
                </Text>
              </View>
              <View>
                <Text style={s.tiny}>{t.cooked}</Text>
                <Text style={s.detailValue}>
                  {mealTime(detail.cooked_at, lang)}
                </Text>
              </View>
            </View>
            <Text style={s.instructions}>{detail.instructions}</Text>
            <Text style={s.portions}>
              {detail.available_portions} {t.portions} · ₹0
            </Text>
            {error && <Text style={s.errorText}>{error}</Text>}
            <Action
              busy={busy}
              disabled={!isServing(detail)}
              onPress={() => void reserve(detail)}
            >
              {t.reserve}
            </Action>
            <Action
              secondary
              onPress={() =>
                void Linking.openURL(directions(detail)).catch((e) =>
                  setError(errorMessage(e)),
                )
              }
            >
              {t.directions}
            </Action>
            {api && user && (
              <Action
                secondary
                onPress={() => {
                  setReport(detail);
                  setReason("");
                  setDetail(null);
                }}
              >
                {t.report}
              </Action>
            )}
          </>
        )}
      </Sheet>
      <Sheet
        reduced={reduced}
        open={!!activeToken}
        onClose={() => setToken(null)}
        title={t.token}
        closeLabel={t.close}
      >
        {activeToken && (
          <>
            <Text style={s.sheetTitle}>{t.token}</Text>
            <View style={s.qr}>
              <QRCode
                value={qrPayload(activeToken)}
                size={190}
                backgroundColor="white"
              />
            </View>
            <Text style={s.backupLabel}>{c.backup}</Text>
            <Text style={s.backupCode}>{activeToken.code}</Text>
            <Text style={s.countdown}>
              {effectiveStatus(activeToken, clock) === "active"
                ? `${t.expiresIn} ${Math.floor(tokenSeconds(activeToken, clock) / 60)}:${String(tokenSeconds(activeToken, clock) % 60).padStart(2, "0")}`
                : t[effectiveStatus(activeToken, clock)]}
            </Text>
            <Text style={s.tokenVenue}>
              {meals.find((m) => m.id === activeToken.listing_id)?.venue_name}
            </Text>
            <Text style={s.body}>{t.tokenNote}</Text>
            {error && <Text style={s.errorText}>{error}</Text>}
            {effectiveStatus(activeToken, clock) === "active" && (
              <Action
                secondary
                busy={busy}
                onPress={() => release(activeToken)}
              >
                {t.release}
              </Action>
            )}
          </>
        )}
      </Sheet>
      <Sheet
        reduced={reduced}
        open={!!feedback}
        onClose={() => setFeedback(null)}
        title={t.feedback}
        closeLabel={t.close}
      >
        <Text style={s.sheetTitle}>{t.feedback}</Text>
        <Text style={s.fieldLabel}>{t.rating}</Text>
        <View style={s.filterRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip
              key={n}
              active={rating === n}
              label={`${n} ★`}
              onPress={() => setRating(n)}
            />
          ))}
        </View>
        <Field
          label={t.comment}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={600}
        />
        {error && <Text style={s.errorText}>{error}</Text>}
        <Action
          busy={busy}
          onPress={() =>
            void perform(async () => {
              await api!.leaveFeedback({
                reservation_id: feedback!.id,
                rating,
                comment,
              });
              setFeedback(null);
              notify(t.feedbackThanks);
            })
          }
        >
          {t.send}
        </Action>
      </Sheet>
      <Sheet
        reduced={reduced}
        open={!!report}
        onClose={() => setReport(null)}
        title={t.report}
        closeLabel={t.close}
      >
        <Text style={s.sheetTitle}>{t.report}</Text>
        <Field
          label={t.reportPrompt}
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={1000}
        />
        {error && <Text style={s.errorText}>{error}</Text>}
        <Action
          busy={busy}
          disabled={reason.trim().length < 8}
          onPress={() =>
            void perform(async () => {
              await api!.report(report!.id, reason);
              setReport(null);
              notify(t.reported);
            })
          }
        >
          {t.send}
        </Action>
      </Sheet>
    </SafeAreaView>
  );
}
function Action({
  children,
  onPress,
  secondary = false,
  busy = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        secondary && s.secondary,
        (disabled || busy) && s.disabled,
        pressed && s.pressed,
      ]}
    >
      {busy && (
        <ActivityIndicator
          color={secondary ? palette.ink : "white"}
          size="small"
        />
      )}
      <Text style={[s.actionText, secondary && s.secondaryText]}>
        {children}
      </Text>
    </Pressable>
  );
}
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.chip, active && s.chipActive]}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}
function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.muted}
        {...props}
        style={[
          s.input,
          props.multiline && { height: 100, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  reduced,
}: {
  reduced: boolean;
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View style={s.modalBackdrop}>
        <SafeAreaView style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.eyebrow}>HUNGER / {title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={onClose}
            >
              <Text style={s.close}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.sheetContent}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function mealImage(meal: Meal) {
  const text = (meal.title + " " + meal.description).toLowerCase();
  return meal.diet === "nonveg"
    ? require("./assets/biryani-v2.jpg")
    : /pulao|rice bowl/.test(text)
      ? require("./assets/pulao-v2.jpg")
      : require("./assets/thali-v2.jpg");
}
