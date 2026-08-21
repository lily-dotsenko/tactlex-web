"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "./ui";

function subscribeToConnectivity(onStoreChange) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function browserIsOnline() {
  return navigator.onLine;
}

function serverIsOnline() {
  return true;
}

export function LocaleDocument({ locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

export function ThemeProvider({ children }) {
  useEffect(() => {
    const stored = window.localStorage.getItem("tactlex-theme") || "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = stored === "system" ? (prefersDark ? "dark" : "light") : stored;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, []);

  return children;
}

export function PwaProvider({ children }) {
  const t = useTranslations("Offline");
  // The server snapshot is stable while the browser snapshot updates immediately
  // after hydration without forcing React to replace the rendered page.
  const online = useSyncExternalStore(subscribeToConnectivity, browserIsOnline, serverIsOnline);
  const [installEvent, setInstallEvent] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    const handleInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      const visits = Number(window.localStorage.getItem("tactlex-visits") || "0") + 1;
      window.localStorage.setItem("tactlex-visits", String(visits));
      setShowInstall(visits > 1);
    };

    window.addEventListener("beforeinstallprompt", handleInstall);

    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((item) => item.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        window.caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys.filter((key) => key.startsWith("tactlex-")).map((key) => caches.delete(key)),
            ),
          )
          .catch(() => {});
      }
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          if (registration.waiting) setWaitingWorker(registration.waiting);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(worker);
              }
            });
          });
        })
        .catch(() => {
          // The application remains usable when service workers are unavailable.
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
    setShowInstall(false);
  }

  function update() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }

  return (
    <>
      {!online && (
        <div className="connectivity-banner" role="status">
          <WifiOff size={18} aria-hidden="true" />
          <span>{t("banner")}</span>
        </div>
      )}
      {children}
      {showInstall && installEvent && (
        <aside className="install-card" aria-labelledby="install-title">
          <Download size={22} aria-hidden="true" />
          <div>
            <strong id="install-title">{t("install")}</strong>
            <p>{t("installText")}</p>
          </div>
          <Button size="small" onClick={install}>
            {t("install")}
          </Button>
          <IconButton label="Close" onClick={() => setShowInstall(false)}>
            <X size={18} />
          </IconButton>
        </aside>
      )}
      {waitingWorker && (
        <aside className="update-toast" role="status">
          <RefreshCw size={19} aria-hidden="true" />
          <span>{t("update")}</span>
          <Button size="small" variant="secondary" onClick={update}>
            {t("updateAction")}
          </Button>
        </aside>
      )}
    </>
  );
}
