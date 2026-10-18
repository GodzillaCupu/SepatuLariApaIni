"use client";

import React from "react";
import { RunningShoe } from "@/types";
import { CATEGORIES_META } from "@/constants/categories";
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Gauge,
  Layers,
  Sparkles,
} from "lucide-react";

interface Props {
  shoe: RunningShoe | null;
  onClose: () => void;
}

export function ShoeDetailModal({ shoe, onClose }: Props) {
  if (!shoe) return null;

  const meta = CATEGORIES_META[shoe.category] || {
    label: shoe.category,
    badgeColor: "text-slate-700",
    badgeBg: "bg-slate-100",
    badgeBorder: "border-slate-200",
    description: "",
  };

  const categoriesRecord = CATEGORIES_META as Record<string, typeof meta | undefined>;
  const subMeta = shoe.subCategory ? categoriesRecord[shoe.subCategory] : null;
  const terrainMeta = shoe.terrain ? categoriesRecord[shoe.terrain] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {shoe.brand}
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}
              >
                {meta.label}
              </span>
              {subMeta && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {subMeta.label}
                </span>
              )}
              {terrainMeta && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {terrainMeta.label}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              {shoe.model}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Target Pace Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-3.5 rounded-2xl border border-emerald-200/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                Target Pace Lari
              </p>
              <p className="text-base font-bold text-slate-900">
                {shoe.targetPaceRange}
              </p>
              <p className="text-[11px] text-slate-500">{shoe.primaryUse}</p>
            </div>
          </div>

          {/* Lab Metrics Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Spesifikasi Uji Lab</span>
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400">Berat (Weight)</span>
                <p className="font-bold text-slate-900 text-sm">{shoe.specs?.weightGrams ?? "-"} gram</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400">Heel-to-Toe Drop</span>
                <p className="font-bold text-slate-900 text-sm">{shoe.specs?.dropMm ?? "-"} mm</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400">Heel / Forefoot Stack</span>
                <p className="font-bold text-slate-900 text-sm">
                  {shoe.specs?.heelStackMm ?? "-"} / {shoe.specs?.forefootStackMm ?? "-"} mm
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400">Pelat (Plate)</span>
                <p className="font-bold text-slate-900 text-sm">{shoe.specs?.plateType ?? "-"}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                <span className="text-slate-400">Busa Sol (Midsole Foam)</span>
                <p className="font-bold text-slate-900 text-sm">{shoe.specs?.foamType ?? "-"}</p>
              </div>
            </div>
          </div>

          {/* Verdict Summary */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Verdict Singkat</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {shoe.verdict?.summary ?? "-"}
            </p>
          </div>

          {/* Pros & Cons */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
              <h5 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kelebihan (Pros)</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(shoe.verdict?.pros || []).map((pro, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
              <h5 className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Kekurangan (Cons)</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(shoe.verdict?.cons || []).map((con, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Source Attribution */}
          {shoe.sourceUrl && (
            <div className="pt-2 text-center">
              <a
                href={shoe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 underline"
              >
                <span>Lihat Data Lab Lengkap di RunRepeat</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
