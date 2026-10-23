"use client";

import React from "react";
import { ShoeCategory } from "@/types";

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

export const CATEGORIES: { key: string; label: string; emoji: string; desc: string }[] = [
  { key: "", label: "Semua", emoji: "👟", desc: "Semua kategori sepatu." },
  { key: "daily_trainer", label: "Daily / Easy", emoji: "🟢", desc: "Sepatu harian untuk easy run & jarak menengah; empuk, awet, nyaman." },
  { key: "super_shoes", label: "Super Shoes", emoji: "🏆", desc: "Sepatu race berpelat karbon + busa super responsif untuk target PB." },
  { key: "super_trainer", label: "Super Trainer", emoji: "⚡", desc: "Busa & pelat gaya race tapi lebih awet; untuk long run dan sesi cepat harian." },
  { key: "speed_tempo", label: "Speed / Tempo", emoji: "⏱️", desc: "Ringan dan responsif untuk interval, tempo, dan lari cepat." },
  { key: "max_cushion", label: "Max Cushion", emoji: "🛡️", desc: "Stack tinggi dan bantalan maksimal; ideal untuk long run dan recovery." },
  { key: "stability", label: "Stability", emoji: "⚖️", desc: "Dukungan ekstra untuk pelari overpronasi agar langkah lebih stabil." },
  { key: "trail_daily", label: "Trail Daily", emoji: "🌲", desc: "Sepatu trail harian dengan grip kuat untuk jalur campuran." },
  { key: "trail_race_long", label: "Trail Ultra", emoji: "⛰️", desc: "Trail jarak jauh/ultra; grip, proteksi, dan kenyamanan tahan lama." },
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
