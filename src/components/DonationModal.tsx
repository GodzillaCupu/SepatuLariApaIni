"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { SITE } from "@/constants/site";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DonationModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Donasi via QRIS Saweria"
    >
      <div
        className="bg-white w-full max-w-xs rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-3 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="space-y-1 pt-1">
          <h3 className="text-sm font-extrabold text-slate-900">☕ Dukung Lari Yuk ☕</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Scan QRIS, Untuk Membelikan Developer Kopi.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SITE.donation.qrImage}
          alt="QR code donasi Saweria"
          className="w-full aspect-square object-contain rounded-2xl border border-slate-100"
        />
        <p className="text-[10px] text-slate-400">Terima kasih sudah mendukung 💚</p>
      </div>
    </div>
  );
}
