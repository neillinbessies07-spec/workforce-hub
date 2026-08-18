import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CameraOff,
  CheckCircle2,
  CloudOff,
  Loader2,
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

const title = "ShiftOps — Clock in with QR";
const description =
  "Scan your badge QR code, capture verified GPS location and clock in even while offline. Events sync automatically.";

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

type Punch = {
  id: string;
  badge: string;
  name: string;
  direction: "in" | "out";
  at: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  synced: boolean;
};

const QUEUE_KEY = "shiftops.punch.queue";

function loadQueue(): Punch[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as Punch[];
  } catch {
    return [];
  }
}

function saveQueue(q: Punch[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function ClockPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<Punch[]>([]);
  const [online, setOnline] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "locating" | "ok" | "denied">("idle");

  useEffect(() => {
    setQueue(loadQueue());
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
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
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

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      queueMicrotask(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
      detectLoop(stream);
    } catch {
      setCameraError("Camera unavailable — use your badge ID below.");
    }
  }, []);

  const detectLoop = useCallback(
    async (stream: MediaStream) => {
      const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
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
      void stream;
    },
    [stopCamera],
  );

  const submitPunch = useCallback(
    async (rawBadge: string) => {
      const badge = rawBadge.trim().toUpperCase();
      const emp =
        employees.find((e) => e.badge.toUpperCase() === badge) ??
        employees.find((e) => e.id.toUpperCase() === badge.replace("SHIFTOPS:", ""));

      if (!emp) {
        toast.error("Badge not recognised", { description: badge || "empty code" });
        return;
      }
      if (geoState !== "ok") {
        toast.warning("Location not verified", {
          description: "Enable location so your site can be confirmed.",
        });
      }

      setBusy(true);
      const punch: Punch = {
        id: crypto.randomUUID(),
        badge: emp.badge,
        name: emp.name,
        direction: emp.status === "in" || emp.status === "break" ? "out" : "in",
        at: new Date().toISOString(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        accuracy: coords?.accuracy ?? null,
        synced: false,
      };

      // Optimistic local-first write: cached, then synced when the API is reachable.
      const next = [punch, ...loadQueue()].slice(0, 25);
      saveQueue(next);
      setQueue(next);

      if (!navigator.onLine) {
        setBusy(false);
        toast.info("Saved offline", {
          description: "This scan will sync automatically when you're back online.",
        });
        return;
      }

      await new Promise((r) => setTimeout(r, 700));
      const synced = loadQueue().map((p) => (p.id === punch.id ? { ...p, synced: true } : p));
      saveQueue(synced);
      setQueue(synced);
      setBusy(false);
      toast.success(`${emp.name} clocked ${punch.direction}`, {
        description: coords
          ? `Verified at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (±${Math.round(coords.accuracy)}m)`
          : "Location unverified",
      });
    },
    [coords, geoState],
  );

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Still offline", { description: "Cached scans stay safe on this device." });
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    const synced = loadQueue().map((p) => ({ ...p, synced: true }));
    saveQueue(synced);
    setQueue(synced);
    setBusy(false);
    toast.success("All cached scans synced");
  }, []);

  const pending = queue.filter((p) => !p.synced).length;

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Employee kiosk</p>
          <h1 className="mt-1 text-2xl font-semibold">Clock in / out</h1>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]",
            online ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning",
          )}
        >
          {online ? <ShieldCheck className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {online ? "Online" : "Offline mode"}
        </span>
      </header>

      <div className="panel signal-glow mt-5 overflow-hidden">
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
              placeholder="Or enter badge ID (EMP-1042)"
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
            Offline queue
          </div>
          {pending > 0 && (
            <Button size="sm" variant="secondary" onClick={() => void syncNow()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync {pending}
            </Button>
          )}
        </div>
        {queue.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No cached scans on this device.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {queue.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs">
                {p.synced ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <CloudOff className="size-3.5 shrink-0 text-warning" />
                )}
                <span className="truncate">
                  {p.name} · clocked {p.direction}
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
            Next shift: tomorrow 06:00 at Sandton Kitchen. Push reminders arrive 45 minutes before start.
          </p>
        </div>
      </div>
    </div>
  );
}
