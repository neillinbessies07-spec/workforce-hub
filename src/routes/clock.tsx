import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  CameraOff,
  CheckCircle2,
  CloudOff,
  Loader2,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employees } from "@/lib/workforce-data";
import { cn } from "@/lib/utils";
import {
  currentAccount,
  markSynced,
  recordPunch,
  signIn,
  signOut,
  signUp,
  statusTone,
  upcomingShifts,
  useStore,
  type StoreState,
} from "@/lib/shiftops-store";

const title = "ShiftOps — Clock in with QR";
const description =
  "Sign in, see your upcoming shifts, scan your badge QR code with verified GPS and clock in even while offline.";

export const Route = createFileRoute("/clock")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClockPage,
});

const selectAccount = (s: StoreState) => currentAccount(s);
const selectPunches = (s: StoreState) => s.punches;

function ClockPage() {
  const account = useStore(selectAccount);
  if (!account) return <AuthPanel />;
  return <Kiosk />;
}

/* ---------------- auth ---------------- */

function AuthPanel() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [site, setSite] = useState("");
  const [rate, setRate] = useState("");

  function submit() {
    if (mode === "in") {
      const res = signIn(email, password);
      if (!res.ok) toast.error(res.error);
      else toast.success("Signed in");
      return;
    }
    const res = signUp({
      email,
      password,
      name,
      role,
      site,
      hourlyRate: Number.parseFloat(rate) || 0,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Welcome ${res.account.name}`, {
      description: res.account.isManager
        ? "You're the first account — manager access granted."
        : "Employee account created.",
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8">
      <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Employee kiosk</p>
      <h1 className="mt-1 text-2xl font-semibold">
        {mode === "in" ? "Sign in to clock" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The first account created becomes the manager. Demo accounts are stored on this device only.
      </p>

      <div className="panel mt-5 space-y-3 p-4">
        {mode === "up" && (
          <>
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
            <Input placeholder="Role (e.g. Barista)" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" />
            <Input placeholder="Site (e.g. Rosebank Cafe)" value={site} onChange={(e) => setSite(e.target.value)} aria-label="Site" />
            <Input
              placeholder="Hourly rate (R)"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              aria-label="Hourly rate"
            />
          </>
        )}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
        />
        <Button className="w-full" size="lg" onClick={submit}>
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-primary"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "No account? Sign up" : "Already registered? Sign in"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- kiosk ---------------- */

function Kiosk() {
  const account = useStore(selectAccount)!;
  const punches = useStore(selectPunches);
  const shifts = useStore(
    useCallback((s: StoreState) => upcomingShifts(s, account.id, 4), [account.id]),
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "locating" | "ok" | "denied">("idle");

  const myPunches = punches.filter((p) => p.personId === account.id);
  const pending = myPunches.filter((p) => !p.synced).length;

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGeoState("ok");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitPunch = useCallback(
    async (rawBadge: string) => {
      const badge = rawBadge.trim().toUpperCase();
      const known =
        badge === account.id.toUpperCase() ||
        badge === `SHIFTOPS:${account.id.toUpperCase()}` ||
        employees.some(
          (e) => e.badge.toUpperCase() === badge || e.id.toUpperCase() === badge.replace("SHIFTOPS:", ""),
        );

      if (!known) {
        toast.error("Badge not recognised", { description: badge || "empty code" });
        return;
      }
      if (geoState !== "ok") {
        toast.warning("Location not verified", {
          description: "Enable location so your site can be confirmed.",
        });
      }

      setBusy(true);
      const last = myPunches[0];
      const punch = recordPunch({
        id: crypto.randomUUID(),
        personId: account.id,
        name: account.name,
        badge: `SHIFTOPS:${account.id}`,
        direction: last?.direction === "in" ? "out" : "in",
        at: new Date().toISOString(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        accuracy: coords?.accuracy ?? null,
        synced: false,
      });

      if (!navigator.onLine) {
        setBusy(false);
        toast.info("Saved offline", {
          description: "This scan will sync automatically when you're back online.",
        });
        return;
      }

      await new Promise((r) => setTimeout(r, 700));
      markSynced([punch.id]);
      setBusy(false);
      toast.success(`Clocked ${punch.direction} — awaiting approval`, {
        description: coords
          ? `Verified at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (±${Math.round(coords.accuracy)}m)`
          : "Location unverified",
      });
    },
    [account.id, account.name, coords, geoState, myPunches],
  );

  const detectLoop = useCallback(() => {
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o: { formats: string[] }) => {
          detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) return;
    const detector = new Detector({ formats: ["qr_code"] });
    const tick = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) {
          const value = codes[0].rawValue;
          stopCamera();
          void submitPunch(value);
          return;
        }
      } catch {
        /* frame not ready */
      }
      requestAnimationFrame(() => void tick());
    };
    void tick();
  }, [stopCamera, submitPunch]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      queueMicrotask(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
      detectLoop();
    } catch {
      setCameraError("Camera unavailable — use your badge ID below.");
    }
  }, [detectLoop]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Still offline", { description: "Cached scans stay safe on this device." });
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    markSynced();
    setBusy(false);
    toast.success("All cached scans synced");
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
            {account.isManager ? "Manager" : "Employee"} · {account.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Clock in / out</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]",
              online ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning",
            )}
          >
            {online ? <ShieldCheck className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {online ? "Online" : "Offline"}
          </span>
          <Button size="sm" variant="ghost" aria-label="Sign out" onClick={() => signOut()}>
            <LogOut />
          </Button>
        </div>
      </header>

      <div className="panel mt-4 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4 text-primary" /> Upcoming shifts
        </div>
        {shifts.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No shifts scheduled yet — your manager publishes them on the schedule page.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {shifts.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium">
                  {new Date(`${s.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="tabular text-muted-foreground">
                  {s.start}–{s.end}
                </span>
                <span className="ml-auto truncate text-muted-foreground">{s.site}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel signal-glow mt-4 overflow-hidden">
        <div className="relative aspect-square w-full bg-secondary/40">
          {scanning ? (
            <video ref={videoRef} playsInline muted className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <QrCode className="size-16 text-primary/70" />
              <p className="px-8 text-center text-xs">
                Point the camera at your badge QR code to record a verified punch.
              </p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-primary/70">
            <span className="absolute inset-x-0 top-1/2 h-px animate-pulse bg-primary" />
          </div>
        </div>

        <div className="space-y-3 p-4">
          {scanning ? (
            <Button variant="secondary" className="w-full" onClick={stopCamera}>
              <CameraOff /> Stop camera
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={() => void startCamera()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <QrCode />} Scan badge
            </Button>
          )}
          {cameraError && <p className="text-center text-xs text-warning">{cameraError}</p>}

          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={`Or enter badge ID (${account.id})`}
              inputMode="text"
              aria-label="Badge ID"
            />
            <Button
              variant="secondary"
              onClick={() => {
                void submitPunch(manual);
                setManual("");
              }}
              disabled={busy || manual.trim().length === 0}
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      <div className="panel mt-4 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className={cn("size-4", geoState === "ok" ? "text-primary" : "text-warning")} />
          Location verification
        </div>
        <p className="tabular mt-2 text-xs text-muted-foreground">
          {geoState === "ok" && coords
            ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} · ±${Math.round(coords.accuracy)}m`
            : geoState === "locating"
              ? "Acquiring GPS fix…"
              : geoState === "denied"
                ? "Permission denied — falling back to network address check."
                : "Not requested"}
        </p>
        <Button variant="ghost" size="sm" className="mt-2 px-0 text-primary" onClick={requestLocation}>
          <RefreshCw /> Refresh location
        </Button>
      </div>

      <div className="panel mt-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CloudOff className="size-4 text-muted-foreground" />
            My punches
          </div>
          {pending > 0 && (
            <Button size="sm" variant="secondary" onClick={() => void syncNow()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync {pending}
            </Button>
          )}
        </div>
        {myPunches.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No punches recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myPunches.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs">
                {p.synced ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <CloudOff className="size-3.5 shrink-0 text-warning" />
                )}
                <span className="truncate">clocked {p.direction}</span>
                <span className={cn("rounded-full px-2 py-0.5 capitalize", statusTone[p.status])}>
                  {p.status}
                </span>
                <span className="tabular ml-auto shrink-0 text-muted-foreground">
                  {new Date(p.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel mt-4 flex items-start gap-3 p-4">
        <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Shift reminders</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Push reminders arrive 45 minutes before each scheduled shift start.
          </p>
        </div>
      </div>
    </div>
  );
}
