"use client";

import React, { useEffect, useState } from "react";
import { X, KeyRound, ShieldCheck, Trash2, HelpCircle, ExternalLink } from "lucide-react";
import { getStoredKey, setStoredKey } from "@/lib/vision/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ open, onClose }: Props) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    if (!open) return;
    const k = getStoredKey();
    setValue(k);
    setHasKey(!!k);
    setSaved(false);
  }, [open]);

  if (!open) return null;

  const save = () => {
    setSaved(setStoredKey(value));
    setHasKey(!!value.trim());
  };
  const remove = () => {
    setStoredKey("");
    setValue("");
    setHasKey(false);
    setSaved(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" /> Pengaturan AI
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Scan sepatu memakai Google Gemini dengan API key milikmu (BYOK).</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gemini API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            placeholder="AIza..."
            className="w-full bg-white px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={save}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-full"
          >
            Simpan
          </button>
          {hasKey && (
            <button
              onClick={remove}
              className="text-xs font-semibold text-rose-600 hover:underline inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus key
            </button>
          )}
          {saved && <span className="text-[11px] text-emerald-700">Tersimpan di perangkat ini.</span>}
        </div>

        <details className="group text-[11px] text-slate-600 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 leading-snug">
          <summary className="cursor-pointer font-semibold text-emerald-800 inline-flex items-center gap-1.5 select-none">
            <HelpCircle className="w-3.5 h-3.5" /> Cara mendapatkan API key Gemini
          </summary>
          <ol className="mt-2 space-y-1.5 list-decimal pl-4">
            <li>
              Buka{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-emerald-700 underline inline-flex items-center gap-0.5">
                aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
              </a>{" "}
              lalu masuk dengan akun Google.
            </li>
            <li>Setujui syarat layanan bila diminta.</li>
            <li>
              Klik <strong>Create API key</strong>. Pilih project Google Cloud yang ada, atau biarkan Google membuatkan project baru.
            </li>
            <li>
              Salin key yang muncul (diawali <code className="bg-white px-1 rounded border border-slate-200">AIza</code>).
            </li>
            <li>
              Tempel ke kolom di atas, lalu klik <strong>Simpan</strong>. Setelah itu buka Scan Sepatu.
            </li>
          </ol>
          <p className="mt-2 text-slate-500">
            Tier gratis punya batas permintaan per menit/hari. Jika muncul &quot;Kuota habis&quot;, tunggu sebentar atau cek kuota di AI Studio. Jangan bagikan key ke orang lain.
          </p>
        </details>

        <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 leading-snug">
          <p className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Privasi
          </p>
          <p>Key hanya disimpan di browser ini (localStorage) dan dikirim bersama foto ke server LariYuk untuk diteruskan ke Gemini. Server tidak menyimpan key maupun foto.</p>
          <p>Kuota & biaya mengikuti akun Google-mu.</p>
        </div>
      </div>
    </div>
  );
}
