"use client";

import React, { useRef, useState } from "react";
import { X, Camera, ImagePlus, Loader2, AlertCircle, KeyRound, SearchX, Sparkles, Cpu } from "lucide-react";
import type { RunningShoe } from "@/types";
import type { DetectOk } from "@/lib/vision/handler";
import { prepareImage, scanShoe, ScanError } from "@/lib/vision/client";
import { ShoeImage } from "@/components/ShoeImage";
import { predictShoes, type PredictResult, type Confidence } from "@/lib/vision/ondevice/predict";
import { IndexError } from "@/lib/vision/ondevice/index-store";

/** Foto contoh untuk uji cepat di dev server (file ada di public/dev-samples/, tidak ikut production). */
const DEV_SAMPLES = [
  { file: "Superblast-testImage.jpg", label: "Superblast 3" },
  { file: "NB-SCRebel-testImage.jpg", label: "NB SC Rebel" },
];

const CONFIDENCE_UI: Record<Confidence, { label: string; cls: string }> = {
  kuat: { label: "Cukup yakin", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sedang: { label: "Perkiraan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  lemah: { label: "Kurang yakin", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

interface Props {
  open: boolean;
  shoes: RunningShoe[];
  onClose: () => void;
  onSelectShoe: (shoe: RunningShoe) => void;
  onOpenSettings: () => void;
}

type PreparedImage = { base64: string; mimeType: "image/jpeg"; previewUrl: string };

type State =
  | { phase: "idle" }
  | { phase: "loading"; preview: string; step: "model" | "embed" | "ai"; fraction: number | null }
  | { phase: "local"; preview: string; result: PredictResult }
  | { phase: "done"; preview: string; result: DetectOk }
  | { phase: "error"; preview?: string; code: string; message: string };

export function ScanShoeSheet({ open, shoes, onClose, onSelectShoe, onOpenSettings }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const lastImage = useRef<PreparedImage | null>(null); // hook harus di atas early return

  if (!open) return null;

  const close = () => {
    setState({ phase: "idle" });
    onClose();
  };

  const isDev = process.env.NODE_ENV !== "production";

  /** Jalur utama: prediksi on-device (tanpa API key, foto tidak keluar perangkat). */
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    let preview: string | undefined;
    try {
      const img = await prepareImage(file);
      lastImage.current = img;
      preview = img.previewUrl;
      setState({ phase: "loading", preview, step: "model", fraction: null });
      const result = await predictShoes(img.previewUrl, {
        onProgress: (p) => setState((cur) => (cur.phase === "loading" ? { ...cur, step: "model", fraction: p.fraction } : cur)),
      });
      setState({ phase: "local", preview, result });
    } catch (err) {
      const message =
        err instanceof ScanError || err instanceof IndexError
          ? err.message
          : typeof navigator !== "undefined" && !navigator.onLine
          ? "Model belum terunduh dan perangkat offline. Hubungkan internet sekali untuk mengunduh model."
          : "Gagal memproses foto di perangkat. Coba lagi atau gunakan Scan AI.";
      const code = err instanceof ScanError || err instanceof IndexError ? err.code : "LOCAL";
      setState({ phase: "error", preview, code, message });
    }
  };

  /** Jalur opsional: Gemini (BYOK) memakai foto terakhir. */
  const handleAi = async () => {
    const img = lastImage.current;
    if (!img) return;
    try {
      setState({ phase: "loading", preview: img.previewUrl, step: "ai", fraction: null });
      const result = await scanShoe(img.base64, img.mimeType);
      setState({ phase: "done", preview: img.previewUrl, result });
    } catch (err) {
      const e = err instanceof ScanError ? err : new ScanError("UPSTREAM", "Gagal memindai foto.");
      setState({ phase: "error", preview: img.previewUrl, code: e.code, message: e.message });
    }
  };

  const loadSample = async (file: string) => {
    const res = await fetch(`/dev-samples/${file}`);
    const blob = await res.blob();
    await handleFile(new File([blob], file, { type: blob.type || "image/jpeg" }));
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
            <p className="text-xs text-slate-500 mt-0.5">Foto sepatu dari samping, terang, dan terlihat logo / tulisan modelnya. Dikenali di perangkatmu — foto tidak dikirim ke mana pun.</p>
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

        {state.phase === "idle" && isDev && (
          <div className="text-[11px] bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900 space-y-1.5">
            <p className="font-bold">Uji cepat (dev)</p>
            <div className="flex flex-wrap gap-1.5">
              {DEV_SAMPLES.map((d) => (
                <button key={d.file} data-testid={`sample-${d.file}`} onClick={() => loadSample(d.file)} className="px-2.5 py-1 rounded-full bg-white border border-amber-300 font-semibold hover:bg-amber-100">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.phase !== "idle" && "preview" in state && state.preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.preview} alt="Foto yang dipindai" className="w-full max-h-56 object-contain rounded-2xl border border-slate-100 bg-slate-50" />
        )}

        {state.phase === "loading" && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            {state.step === "ai"
              ? "Menanyakan AI..."
              : state.fraction !== null && state.fraction < 1
              ? `Mengunduh model pengenal (sekali saja) ${Math.round(state.fraction * 100)}%`
              : "Mengenali sepatu di perangkat..."}
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

        {state.phase === "local" && (
          <div className="space-y-3" data-testid="local-result">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> Perkiraan di perangkat
              </p>
              <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${CONFIDENCE_UI[state.result.confidence].cls}`}>
                {CONFIDENCE_UI[state.result.confidence].label}
              </span>
            </div>

            {state.result.confidence === "lemah" && (
              <p className="text-[11px] text-slate-500">Belum yakin. Coba foto dari samping dengan cahaya lebih baik, atau pakai Scan AI di bawah.</p>
            )}

            <div className="space-y-1.5">
              {state.result.top
                .map((p) => byId(p.shoeId))
                .filter((s): s is RunningShoe => !!s)
                .map((s, i) => (
                  <button key={s.id} data-testid="local-candidate" onClick={() => { onSelectShoe(s); close(); }} className={`w-full text-left flex items-center gap-3 rounded-xl p-2.5 border ${i === 0 ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:border-emerald-300"}`}>
                    <span className="w-5 text-center text-[11px] font-extrabold text-slate-400">{i + 1}</span>
                    <ShoeImage src={s.imageUrl} alt={`${s.brand} ${s.model}`} sizes="48px" className="w-12 h-12 rounded-lg border border-slate-100 shrink-0" />
                    <p className="text-xs font-bold text-slate-900 min-w-0 truncate">{s.brand} {s.model}</p>
                  </button>
                ))}
            </div>

            {isDev && (
              <details open className="text-[11px] bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900">
                <summary className="font-bold cursor-pointer">Debug on-device (dev)</summary>
                <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono">{JSON.stringify({ timings: state.result.timings, confidence: state.result.confidence, top: state.result.top.map((p) => ({ id: p.shoeId, score: +p.score.toFixed(3) })) }, null, 2)}</pre>
              </details>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button onClick={handleAi} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:underline">
                <Sparkles className="w-3.5 h-3.5" /> Scan lebih akurat (AI, butuh API key)
              </button>
              <button onClick={reset} className="text-[11px] font-semibold text-slate-500 hover:underline">Scan foto lain</button>
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

            {process.env.NODE_ENV !== "production" && (
              <details open className="text-[11px] bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900">
                <summary className="font-bold cursor-pointer">Hasil AI (dev)</summary>
                <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono">{JSON.stringify(state.result.detection, null, 2)}</pre>
              </details>
            )}

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
