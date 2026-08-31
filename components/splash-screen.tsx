"use client";

import { useEffect } from "react";

// Dismisses the server-rendered #initial-splash element (defined in the root
// layout + globals.css). It is painted by the browser before any JavaScript
// runs, so there is no white flash on first load.
//
// IMPORTANT: we do NOT call el.remove() — that node is owned by React (it's in
// the layout JSX), and removing it manually breaks React's DOM reconciliation
// ("insertBefore" NotFoundError). Instead we hide it via CSS so React keeps
// ownership of the node.
export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById("initial-splash");
    if (!el) return;

    function hide() {
      if (!el) return;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      el.style.visibility = "hidden";
    }

    // Only show the splash once per session
    const shown = sessionStorage.getItem("pd_splash_shown");
    if (shown) {
      hide();
      return;
    }

    // Hold briefly, then fade out
    const fadeTimer = setTimeout(() => {
      el.style.transition = "opacity 500ms ease";
      el.style.opacity = "0";
    }, 1600);

    const hideTimer = setTimeout(() => {
      hide();
      sessionStorage.setItem("pd_splash_shown", "1");
    }, 2150);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return null;
}
