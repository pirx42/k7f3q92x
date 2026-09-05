// Chimera Service Worker — Offline-Fähigkeit
// PRECACHE_URLS wird beim Build durch scripts/inject-precache.ts befuellt.
const CACHE_NAME = "chimera-997e7d8a";
// Base-Pfad aus dem eigenen Registrierungs-Scope ableiten statt hart "/chimera/" —
// so funktioniert der SW für JEDES Build-Target ohne Textersetzung: "/chimera/" für
// local/test, "/" für die Demo auf chim3ra.com (Plan 2026-07-01-vier-deployment-targets).
const BASE_PATH = new URL(self.registration.scope).pathname;
const PRECACHE_URLS = ["/k7f3q92x/","/k7f3q92x/assets/BossLootScreen-CTWnH8s2.js","/k7f3q92x/assets/BranchChoiceScreen-DE6F5Fhy.js","/k7f3q92x/assets/CreditsScreen-CXWV6OU5.js","/k7f3q92x/assets/LegalScreen-BuYafwYO.js","/k7f3q92x/assets/LicenseTexts-5LhbuhqE.js","/k7f3q92x/assets/NewRunScreen-CQrC38hU.js","/k7f3q92x/assets/OptionsScreen-BOyY1LtH.js","/k7f3q92x/assets/ProfileMenu-B7hEMEr2.js","/k7f3q92x/assets/RobotPortrait-DynriP2C.js","/k7f3q92x/assets/RunResultScreen-CVn5tvpU.js","/k7f3q92x/assets/UpgradeMedalCanvas-CX9FSO8B.js","/k7f3q92x/assets/branchMapGeometry-4vCc2JK-.js","/k7f3q92x/assets/buildTarget-Dz1Z9hxC.js","/k7f3q92x/assets/chassisLoader-C7AlhHx1.js","/k7f3q92x/assets/chassisUnlocks-BNC1JOye.js","/k7f3q92x/assets/controllingSide-D62I9UiI.js","/k7f3q92x/assets/dseg7-classic-latin-700-normal-BW8KWXYV.woff","/k7f3q92x/assets/dseg7-classic-latin-700-normal-jUCkPCxO.woff2","/k7f3q92x/assets/eventCards-0RB4rgww.js","/k7f3q92x/assets/hiDpiCanvas-DQCS9S75.js","/k7f3q92x/assets/html2canvas-B0k4OQPy.js","/k7f3q92x/assets/i18n-CYm1Fcqj.js","/k7f3q92x/assets/index-430SS8nc.css","/k7f3q92x/assets/index-DHEPTtAE.js","/k7f3q92x/assets/jetbrains-mono-latin-400-normal-6-qcROiO.woff","/k7f3q92x/assets/jetbrains-mono-latin-400-normal-V6pRDFza.woff2","/k7f3q92x/assets/jetbrains-mono-latin-700-normal-BYuf6tUa.woff2","/k7f3q92x/assets/jetbrains-mono-latin-700-normal-D3wTyLJW.woff","/k7f3q92x/assets/localizedString-DKtfBdWe.js","/k7f3q92x/assets/rolldown-runtime-C4N-s-pu.js","/k7f3q92x/assets/rolldown-runtime-CbXtAM7H.js"];

// Nur erfolgreiche (2xx) Antworten in den Cache legen. Sonst vergiftet eine
// 404/5xx-Antwort den Cache und wird — bei Cache-First — danach dauerhaft
// ausgeliefert, selbst wenn die Datei laengst 200 liefert (iOS-PWA-Bug
// 2026-07-09: nachtraeglich abgelegtes Spectator-Replay blieb 404). Analog
// gilt: ein gecachter Fehler darf nie einem Netzwerk-Retry vorgezogen werden.
//
// WICHTIG: der Klon muss SYNCHRON entstehen (bevor der Body via `return
// response` gelesen wird) — daher hier und nicht erst im async caches.open().
function cacheIfOk(request, response)
{
  if (!response.ok) return;
  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

// ── Install: Alle Precache-URLs cachen ──────────────────────────────────────

self.addEventListener("install", (event) =>
{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: Alte Caches aufräumen ─────────────────────────────────────────

self.addEventListener("activate", (event) =>
{
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Strategie nach Request-Typ ───────────────────────────────────────

self.addEventListener("fetch", (event) =>
{
  const url = new URL(event.request.url);

  // Nur GET-Requests
  if (event.request.method !== "GET") return;

  // API-Calls: immer Netzwerk (Version-Endpoint etc.)
  if (url.pathname.startsWith(`${BASE_PATH}api/`)) return;

  // (Security-Plan I4) Der frühere Google-Fonts-Stale-While-Revalidate-Branch
  // wurde entfernt: die Schriften sind self-hosted (@fontsource) und CSP
  // `font-src 'self'` + `connect-src` blockieren Google Fonts ohnehin — der
  // Branch war unerreichbar und cachte cross-origin OHNE `.ok`-Guard (latente
  // Cache-Poisoning-Form). Alle verbleibenden Caches laufen über `cacheIfOk`.

  // Daten-JSONs (/chassis/*, /runs/*, release-notes.json): Stale-While-Revalidate.
  // Diese Dateien haben KEINE Content-Hashes im Dateinamen — bei reinen
  // Content-Edits aendert sich der Build-Asset-Hash nicht und der SW-
  // Cache-Name bleibt gleich. Cache-First wuerde alte Versionen liefern,
  // bis der User manuell den Cache loescht. Stale-While-Revalidate liefert
  // sofort den Cache, fetcht aber im Hintergrund die neue Version fuer den
  // naechsten Reload. release-notes.json (Whats-New-Dialog, Plan 2026-07-24)
  // gehoert zu derselben Klasse: unversioniert + darf nach einem Update nicht
  // stale bleiben, sonst faende der Dialog die neuen Notes nicht.
  if (url.pathname.includes("/chassis/") || url.pathname.includes("/runs/")
    || url.pathname.endsWith("/release-notes.json"))
  {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) =>
        {
          const fetched = fetch(event.request).then((response) =>
          {
            cacheIfOk(event.request, response);
            return response;
          }).catch(() => cached);
          return (cached && cached.ok) ? cached : fetched;
        })
      )
    );
    return;
  }

  // Gehashte Assets (/assets/*): Cache-First (Dateiname enthält Content-Hash)
  if (url.pathname.includes("/assets/"))
  {
    event.respondWith(
      caches.match(event.request).then((cached) =>
      {
        if (cached && cached.ok) return cached;
        return fetch(event.request).then((response) =>
        {
          cacheIfOk(event.request, response);
          return response;
        });
      })
    );
    return;
  }

  // Navigation (HTML-Seite): Network-First, Fallback auf gecachte Shell
  // iOS Standalone sendet manchmal nicht mode=navigate, daher auch Pathname pruefen
  if (event.request.mode === "navigate"
    || (url.pathname === BASE_PATH || url.pathname === BASE_PATH.slice(0, -1)))
  {
    event.respondWith(
      fetch(event.request)
        .then((response) =>
        {
          cacheIfOk(event.request, response);
          return response;
        })
        .catch(() => caches.match(BASE_PATH))
    );
    return;
  }

  // Alles andere (Icons, Manifest, Replays etc.): Cache-First — aber nur
  // ERFOLGREICH gecachte Antworten ausliefern, sonst frisch aus dem Netz
  // holen (heilt einen zuvor vergifteten 404 selbst, sobald die Datei da ist).
  event.respondWith(
    caches.match(event.request).then((cached) =>
    {
      if (cached && cached.ok) return cached;
      return fetch(event.request).then((response) =>
      {
        cacheIfOk(event.request, response);
        return response;
      });
    })
  );
});
