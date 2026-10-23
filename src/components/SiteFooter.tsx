"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";
import { SITE, FEEDBACK } from "@/constants/site";
import { DonationModal } from "@/components/DonationModal";
import { FeedbackModal, FeedbackKind } from "@/components/FeedbackModal";

export function SiteFooter() {
  const { developer } = SITE;
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind | null>(null);

  return (
    <>
    <footer className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/70 px-4 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.04)]">
      <div className="max-w-2xl mx-auto space-y-2 text-[11px] text-slate-500">
        <div className="flex items-center justify-center gap-2">
          {(["bug", "feature"] as FeedbackKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFeedback(k)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:border-emerald-300 active:scale-95 transition"
            >
              <span>{FEEDBACK[k].emoji}</span>
              {FEEDBACK[k].label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Donasi
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>
            Dibuat oleh{" "}
            <a
              href={developer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-700 hover:underline"
            >
              {developer.name}
            </a>
          </span>
        </p>
      </div>
    </footer>
    <DonationModal open={open} onClose={() => setOpen(false)} />
    <FeedbackModal kind={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}
