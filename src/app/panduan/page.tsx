"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ROTATION_GUIDE, FIT_GUIDE, BREATHABILITY_GUIDE, GuideGroup } from "@/constants/guide";

const TABS: { key: string; label: string; intro: string; groups: GuideGroup[] }[] = [
  {
    key: "rotation", label: "Kategori Rotasi",
    intro: "Rotasi = membagi sepatu sesuai tugas tiap sesi lari. Tiap kategori utama punya sub kategori yang lebih spesifik.",
    groups: ROTATION_GUIDE,
  },
  {
    key: "fit", label: "Fit",
    intro: "Fit menunjukkan seberapa cocok ukuran sepatu dengan kaki, dari sisi panjang dan lebar.",
    groups: FIT_GUIDE,
  },
  {
    key: "breath", label: "Breathability",
    intro: "Breathability menunjukkan sirkulasi udara di dalam sepatu.",
    groups: BREATHABILITY_GUIDE,
  },
];

export default function PanduanPage() {
  const [tab, setTab] = useState("rotation");
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <main className="min-h-screen pb-16">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke katalog
        </Link>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Panduan Filter</h2>
          <p className="text-xs text-slate-500">Arti setiap kategori dan sub kategorinya.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                tab === t.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">{current.intro}</p>

        <div className="space-y-3">
          {current.groups.map((g) => (
            <section key={g.key} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  <span className="mr-1.5">{g.emoji}</span>{g.label}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{g.desc}</p>
              </div>
              <ul className="space-y-1.5 border-t border-slate-100 pt-2.5">
                {g.subs.map((s) => (
                  <li key={s.label} className="text-[11px] leading-snug text-slate-600 pl-3 relative">
                    <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-slate-800">{s.label}</span> — {s.desc}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
