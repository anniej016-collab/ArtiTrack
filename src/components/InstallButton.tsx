"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * An install control the app owns, rather than waiting to be offered one.
 *
 * Browsers decide for themselves whether to show an install banner, and the
 * rules differ per browser and per device — the same app can prompt on a phone
 * and stay silent on a tablet. Chromium hands the offer over through
 * `beforeinstallprompt`, which is caught here and turned into a button that is
 * always there. Safari fires nothing at all, so on an iPad the only route is
 * the Share menu, and saying so is more use than a button that can't work.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Whether the app is already running from a home screen rather than a tab. */
function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

function readDisplayMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, which predates the standard media query.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/** An iPad reports itself as a Mac, so touch points are what give it away. */
function isApple() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  );
}

export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Only ever read, never rendered before the help is opened, so the server's
  // answer and the browser's can differ without a hydration mismatch.
  const [apple] = useState(isApple);

  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    readDisplayMode,
    () => false,
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Keep the event: it can only be replayed if the default is stopped.
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone || accepted) return null;

  if (prompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          // One shot per event; the browser fires a fresh one if it's declined.
          if (outcome === "accepted") setAccepted(true);
          setPrompt(null);
        }}
        className="text-xs font-medium text-accent transition-colors hover:brightness-125"
      >
        Install as an app
      </button>
    );
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setShowHelp((open) => !open)}
        aria-expanded={showHelp}
        className="text-xs text-faint transition-colors hover:text-muted"
      >
        Install as an app
      </button>

      {showHelp && (
        <span className="panel absolute bottom-full left-0 mb-2 block w-72 p-3 text-xs text-muted">
          {apple ? (
            <>
              Tap the <strong className="text-text">Share</strong> button in the browser
              bar, then <strong className="text-text">Add to Home Screen</strong>. Safari
              never offers this by itself, on any iPhone or iPad.
            </>
          ) : (
            <>
              Open the browser&apos;s <strong className="text-text">⋮</strong> menu and
              choose <strong className="text-text">Install app</strong>, or{" "}
              <strong className="text-text">Add to Home screen</strong>. Some browsers
              only offer it after you&apos;ve opened the site a few times.
            </>
          )}
        </span>
      )}
    </span>
  );
}
