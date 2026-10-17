"use client";

import React, { useState, useEffect } from "react";
import { Footprints, WifiOff, Sparkles } from "lucide-react";

export function Navbar() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-sm">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              LariYuk
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Lab Specs & Rotasi Sepatu</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full border border-amber-200">
              <WifiOff className="w-3 h-3" />
              <span>Offline Mode</span>
            </div>
          )}
          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>PWA v1.0</span>
          </span>
        </div>
      </div>
    </header>
  );
}
