"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { FEEDBACK } from "@/constants/site";

export type FeedbackKind = "bug" | "feature";

interface Props {
  kind: FeedbackKind | null;
  onClose: () => void;
}

const inputCls =
  "w-full bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500";

export function FeedbackModal({ kind, onClose }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    setStatus("idle");
  }, [kind]);

  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind, onClose]);

  if (!kind) return null;
  const cfg = FEEDBACK[kind];
  const isBug = kind === "bug";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending" || status === "done") return;
    const f = new FormData(e.currentTarget);
    if (f.get("botcheck")) return; // honeypot
    const email = String(f.get("email") ?? "").trim();
    const details = isBug
      ? `Apa yang terjadi:\n${f.get("desc")}\n\nLangkah mengulang:\n${f.get("steps") || "-"}\n\nHalaman: ${location.href}\nBrowser: ${navigator.userAgent}\nLayar: ${innerWidth}x${innerHeight}`
      : `${f.get("desc")}`;

    setStatus("sending");
    try {
      const res = await fetch(FEEDBACK.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: cfg.accessKey,
          subject: `[LariYuk ${isBug ? "Bug" : "Fitur"}] ${f.get("title")}`,
          from_name: "LariYuk PWA",
          ...(email ? { email } : {}),
          title: f.get("title"),
          message: details,
        }),
      });
      const json = await res.json().catch(() => ({}));
      setStatus(res.ok && json.success !== false ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={cfg.label}
    >
      <div
        className="bg-white w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>

        {status === "done" ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-900">Terima kasih!</h3>
            <p className="text-[11px] text-slate-500">
              {isBug ? "Laporan bug diterima." : "Usulan fitur diterima."} Kami baca semuanya.
            </p>
            <button onClick={onClose} className="text-xs font-semibold text-emerald-700 hover:underline">
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="pt-1 pr-8">
              <h3 className="text-sm font-extrabold text-slate-900">
                {cfg.emoji} {cfg.label}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isBug
                  ? "Ceritakan apa yang salah. Info browser & layar ikut terkirim otomatis."
                  : "Ceritakan fitur yang kamu mau dan kenapa itu berguna."}
              </p>
            </div>
            <input name="botcheck" tabIndex={-1} autoComplete="off" className="hidden" />
            <input name="title" required maxLength={120} placeholder={isBug ? "Judul singkat bug" : "Judul fitur"} className={inputCls} />
            <textarea
              name="desc"
              required
              rows={4}
              maxLength={2000}
              placeholder={isBug ? "Apa yang terjadi? Apa yang kamu harapkan?" : "Fitur apa yang kamu mau, dan kenapa?"}
              className={inputCls}
            />
            {isBug && (
              <textarea name="steps" rows={2} maxLength={1000} placeholder="Langkah mengulang (opsional)" className={inputCls} />
            )}
            <input name="email" type="email" placeholder="Email (opsional, kalau mau dibalas)" className={inputCls} />

            {status === "error" && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">
                Gagal mengirim (cek koneksi internet). Coba lagi sebentar.
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
            >
              {status === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "sending" ? "Mengirim..." : "Kirim"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
