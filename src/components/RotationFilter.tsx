"use client";

import React from "react";
import { ShoeCategory } from "@/types";

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "", label: "Semua", emoji: "👟" },
  { key: "daily_trainer", label: "Daily / Easy", emoji: "🟢" },
  { key: "super_shoes", label: "Super Shoes", emoji: "🏆" },
  { key: "super_trainer", label: "Super Trainer", emoji: "⚡" },
  { key: "speed_tempo", label: "Speed / Tempo", emoji: "⏱️" },
  { key: "max_cushion", label: "Max Cushion", emoji: "🛡️" },
  { key: "stability", label: "Stability", emoji: "⚖️" },
  { key: "trail_daily", label: "Trail Daily", emoji: "🌲" },
  { key: "trail_race_long", label: "Trail Ultra", emoji: "⛰️" },
];

export function RotationFilter({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
