import type { Sizing, Breathability } from "@/types";

/** Label & warna badge. Definisi aturannya: scripts/lib/classify-fit.ts. */
export const SIZING_META: Record<Sizing, { label: string; hint: string; cls: string }> = {
  true_to_size: { label: "True to size", hint: "Panjang pas, lebar standar", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  narrow: { label: "Sempit", hint: "Lebar sempit — pertimbangkan varian wide", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  wide: { label: "Lebar", hint: "Ruang jari lega", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  runs_small: { label: "Ukuran kecil", hint: "Pertimbangkan naik ½–1 size", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  runs_large: { label: "Ukuran besar", hint: "Pertimbangkan turun ½–1 size", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  unknown: { label: "Fit belum ada data", hint: "", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

export const BREATHABILITY_META: Record<Breathability, { label: string; hint: string; cls: string }> = {
  cool: { label: "Adem", hint: "Upper terbuka, sirkulasi udara baik", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  moderate: { label: "Sedang", hint: "Sirkulasi udara cukup", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  warm: { label: "Panas", hint: "Upper rapat / membran, cenderung hangat", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  unknown: { label: "Adem/panas belum ada data", hint: "", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};
