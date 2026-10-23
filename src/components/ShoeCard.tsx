"use client";

import React from "react";
import { RunningShoe } from "@/types";
import { CATEGORIES_META } from "@/constants/categories";
import { ShoeImage } from "@/components/ShoeImage";
import { FitBadges } from "@/components/FitBadges";
import { Gauge, Scale, MoveVertical, ChevronRight, GitCompareArrows } from "lucide-react";

interface Props {
  shoe: RunningShoe;
  onClick: () => void;
  /** Sedang dipilih untuk dibandingkan. */
  compared?: boolean;
  /** Bila ada, tombol "Bandingkan" ditampilkan. */
  onToggleCompare?: () => void;
  /** Batas pilihan tercapai (tombol non-aktif untuk sepatu yang belum dipilih). */
  compareDisabled?: boolean;
}

export function ShoeCard({ shoe, onClick, compared = false, onToggleCompare, compareDisabled = false }: Props) {
  const meta = CATEGORIES_META[shoe.category] || {
    label: shoe.category,
    badgeColor: "text-slate-700",
    badgeBg: "bg-slate-100",
    badgeBorder: "border-slate-200",
  };

  return (
    <div
      onClick={onClick}
      className="min-w-0 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-3"
    >
      {/* Top Header: Thumbnail, Brand, Model, Category Badge */}
      <div className="flex items-start gap-3">
        <ShoeImage
          src={shoe.imageUrl}
          alt={`${shoe.brand} ${shoe.model}`}
          sizes="96px"
          className="w-24 h-24 rounded-xl border border-slate-100 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {shoe.brand}
          </span>
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {shoe.model}
          </h3>
          <span
            className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}
          >
            {meta.label}
          </span>
        </div>
      </div>

      {/* Primary Use & Target Pace */}
      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-900">{shoe.targetPaceRange}</span>
        <span className="text-slate-300">•</span>
        <span className="truncate text-slate-500">{shoe.primaryUse}</span>
      </div>

      <FitBadges shoe={shoe} />

      {/* Lab Specs Summary Bar */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Scale className="w-3 h-3" />
            <span>Bobot</span>
          </div>
          <span className="text-xs font-bold text-slate-800">{shoe.specs?.weightGrams ?? "-"}g</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <MoveVertical className="w-3 h-3" />
            <span>Drop</span>
          </div>
          <span className="text-xs font-bold text-slate-800">{shoe.specs?.dropMm ?? "-"}mm</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>Stack</span>
          </div>
          <span className="text-xs font-bold text-slate-800">
            {shoe.specs?.heelStackMm ?? "-"}/{shoe.specs?.forefootStackMm ?? "-"}mm
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
        <span className="min-w-0 truncate">Busa: <strong className="text-slate-600">{shoe.specs?.foamType ?? "-"}</strong></span>
        {onToggleCompare && (
          <button
            type="button"
            aria-pressed={compared}
            disabled={compareDisabled && !compared}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare();
            }}
            className={`shrink-0 inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              compared
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
            }`}
          >
            <GitCompareArrows className="w-3 h-3" />
            {compared ? "Dipilih" : "Bandingkan"}
          </button>
        )}
        <div className="flex items-center text-emerald-600 font-semibold gap-0.5 whitespace-nowrap shrink-0">
          <span>Lihat Lab</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
