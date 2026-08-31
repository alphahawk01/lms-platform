"use client";

import { useEffect } from "react";

// Fades out and removes the server-rendered #initial-splash element (defined
// in the root layout + globals.css). Because that element is painted by the
// browser before any JavaScript runs, there is no white flash on first load.
// This component just handles dismissing it once the app is ready.
export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById("initial-splash");
    if (!el) return;

    // Only show the splash once per session
    const shown = sessionStorage.getItem("pd_splash_shown");
    if (shown) {
      el.remove();
      return;
    }

    // Hold briefly, then fade out and remove
    const fadeTimer = setTimeout(() => {
      el.style.transition = "opacity 500ms ease";
      el.style.opacity = "0";
    }, 1600);

    const removeTimer = setTimeout(() => {
      el.remove();
      sessionStorage.setItem("pd_splash_shown", "1");
    }, 2150);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return null;
}
