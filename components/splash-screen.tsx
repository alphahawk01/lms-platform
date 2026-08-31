"use client";

import { useEffect, useState } from "react";

// In-app splash screen shown on first load, then fades out.
// Works consistently across all devices (iOS/Android/desktop) since it's
// rendered by the app itself rather than relying on platform splash support.
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only show the splash once per session so it doesn't appear on every
    // client navigation.
    const shown = sessionStorage.getItem("pd_splash_shown");
    if (shown) {
      setVisible(false);
      return;
    }

    // Start fade after a short display, then unmount
    const fadeTimer = setTimeout(() => setFading(true), 1400);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("pd_splash_shown", "1");
    }, 1900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0f1d] transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/splash.png"
        alt="Premier Data"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
