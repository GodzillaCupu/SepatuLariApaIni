"use client";

import React, { useRef, useState } from "react";
import { X, Camera, ImagePlus, Loader2, AlertCircle, KeyRound, SearchX } from "lucide-react";
import type { RunningShoe } from "@/types";
import type { DetectOk } from "@/lib/vision/handler";
import { prepareImage, scanShoe, ScanError } from "@/lib/vision/client";
import { ShoeImage } from "@/components/ShoeImage";

interface Props {
  open: boolean;
  shoes: RunningShoe[];
  onClose: () => void;
  onSelectShoe: (shoe: RunningShoe) => void;
  onOpenSettings: () => void;
}

type State =
  | { phase: "idle" }
  | { phase: "loading"; preview: string }
  | { phase: "done"; preview: string; result: DetectOk }
  | { phase: "error"; preview?: string; code: string; message: string };

export function ScanShoeSheet({ open, shoes, onClose, onSelectShoe, onOpenSettings }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const close = () => {
    setState({ phase: "idle" });
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    let preview: string | undefined;
    try {
      const img = await prepareImage(file);
      preview = img.previewUrl;
      setState({ phase: "loading", preview });
      const result = await scanShoe(img.base64, img.mimeType);
      setState({ phase: "done", preview, result });
    } catch (err) {
      const e = err instanceof ScanError ? err : new ScanError("UPSTREAM", "Gagal memindai foto.");
      setState({ phase: "error", preview, code: e.code, message: e.message });
    }
  };

  const byId = (id: string) => shoes.find((s) => s.id === id);
  const reset = () => setState({ phase: "idle" });

  const matched = state.phase === "done" && state.result.match.matchId ? byId(state.result.match.matchId) : undefined;
  const candidates =
    state.phase === "done"
      ? state.result.match.candidates
          .filter((c) => c.id !== state.result.match.matchId)
          .map((c) => byId(c.id))
          .filter((s): s is RunningShoe => !!s)
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" /> Scan Sepatu
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Foto sepatu dari samping, terang, dan terlihat logo / tulisan modelnya.</p>
          </div>
          <button
            onClick={close}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />

        {state.phase === "idle" && (
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-5 text-xs font-bold">
              <Camera className="w-6 h-6" /> Ambil foto
            </button>
            <button onClick={() => galleryRef.current?.click()} className="flex flex-col items-center gap-1.5 bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 rounded-2xl py-5 text-xs font-bold">
              <ImagePlus className="w-6 h-6" /> Dari galeri
            </button>
          </div>
        )}

        {state.phase !== "idle" && "preview" in state && state.preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.preview} alt="Foto yang dipindai" className="w-full max-h-56 object-contain rounded-2xl border border-slate-100 bg-slate-50" />
        )}

        {state.phase === "loading" && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Mengenali sepatu...
          </div>
        )}

        {state.phase === "error" && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3.5 text-xs space-y-2">
            <p className="flex items-center gap-1.5 font-bold"><AlertCircle className="w-4 h-4" /> {state.message}</p>
            <div className="flex gap-3">
              {(state.code === "KEY_REQUIRED" || state.code === "KEY_INVALID") && (
                <button onClick={onOpenSettings} className="inline-flex items-center gap-1 font-semibold underline">
                  <KeyRound className="w-3.5 h-3.5" /> Buka Pengaturan AI
                </button>
              )}
              <button onClick={reset} className="font-semibold underline">Coba lagi</button>
            </div>
          </div>
        )}

        {state.phase === "done" && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">
              Terdeteksi: <strong className="text-slate-800">{state.result.detection.brand} {state.result.detection.model}</strong>{" "}
              (keyakinan {Math.round(state.result.detection.confidence * 100)}%)
              {state.result.keySource === "server-dev" && <span className="ml-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">key server (dev)</span>}
            </p>

            {matched && (
              <button onClick={() => { onSelectShoe(matched); close(); }} className="w-full text-left flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                <ShoeImage src={matched.imageUrl} alt={`${matched.brand} ${matched.model}`} sizes="64px" className="w-16 h-16 rounded-xl border border-emerald-100 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cocok di katalog</p>
                  <p className="text-sm font-bold text-slate-900">{matched.brand} {matched.model}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">Lihat spesifikasi lab →</p>
                </div>
              </button>
            )}

            {candidates.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{matched ? "Mirip lainnya" : "Mungkin salah satu ini"}</p>
                {candidates.map((s) => (
                  <button key={s.id} onClick={() => { onSelectShoe(s); close(); }} className="w-full text-left flex items-center gap-3 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-2.5">
                    <ShoeImage src={s.imageUrl} alt={`${s.brand} ${s.model}`} sizes="48px" className="w-12 h-12 rounded-lg border border-slate-100 shrink-0" />
                    <p className="text-xs font-bold text-slate-900 min-w-0 truncate">{s.brand} {s.model}</p>
                  </button>
                ))}
              </div>
            )}

            {!matched && candidates.length === 0 && (
              <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs text-slate-600">
                <SearchX className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>Sepatu ini belum ada di katalog (atau belum terbaca jelas). Coba foto dari sisi lain dengan logo terlihat.</p>
              </div>
            )}

            <button onClick={reset} className="text-[11px] font-semibold text-emerald-600 hover:underline">Scan foto lain</button>
          </div>
        )}
      </div>
    </div>
  );
}
