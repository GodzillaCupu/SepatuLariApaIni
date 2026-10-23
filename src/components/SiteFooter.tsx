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
    <footer className="mt-8 bg-white border-t border-slate-100 px-4 py-2.5">
      <div className="max-w-2xl mx-auto space-y-2 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Dibuat oleh{" "}
              <a
                href={developer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-700 hover:underline"
              >
                {developer.name}
              </a>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> Donasi
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(["bug", "feature"] as FeedbackKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFeedback(k)}
              className="flex-1 py-1.5 rounded-full border border-slate-200 bg-white font-semibold text-slate-600 hover:border-emerald-300 transition-colors"
            >
              {FEEDBACK[k].emoji} {FEEDBACK[k].label}
            </button>
          ))}
        </div>
      </div>
      <DonationModal open={open} onClose={() => setOpen(false)} />
      <FeedbackModal kind={feedback} onClose={() => setFeedback(null)} />
    </footer>
  );
}
