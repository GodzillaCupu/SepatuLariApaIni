"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { RotationFilter, CATEGORIES } from "@/components/RotationFilter";
import { ShoeCard } from "@/components/ShoeCard";
import { ShoeDetailModal } from "@/components/ShoeDetailModal";
import { RunningShoe, Sizing, Breathability } from "@/types";
import { BREATHABILITY_META } from "@/constants/fit";
import { Search, Loader2, Sparkles, AlertCircle, SlidersHorizontal, ChevronDown, BookOpen } from "lucide-react";

type FitFilter = "true_to_size" | "narrow" | "wide";

/** Filter Fit: ukuran kecil digabung ke Sempit, ukuran besar digabung ke Lebar. */
const FIT_GROUPS: Record<FitFilter, Sizing[]> = {
  true_to_size: ["true_to_size"],
  narrow: ["narrow", "runs_small"],
  wide: ["wide", "runs_large"],
};
const FIT_OPTIONS: string[][] = [
  ["true_to_size", "True to size", "Panjang pas, lebar standar"],
  ["narrow", "Sempit / Kecil", "Kaki terasa sempit atau ukuran jatuh kecil — pertimbangkan varian wide atau naik ½–1 size"],
  ["wide", "Lebar / Besar", "Ruang lega atau ukuran jatuh besar — pertimbangkan turun ½–1 size bila longgar"],
];

function FilterChips({
  title,
  desc,
  value,
  onChange,
  options,
}: {
  title: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
}) {
  const active = options.find(([key]) => key === value);
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange(value === key ? "" : key)}
            className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors ${
              value === key
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {active && active[2] && (
        <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5">
          <span className="font-semibold">{active[1]}:</span> {active[2]}
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  const [shoes, setShoes] = useState<RunningShoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sizingFilter, setSizingFilter] = useState<FitFilter | "">("");
  const [breathFilter, setBreathFilter] = useState<Breathability | "">("");
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedShoe, setSelectedShoe] = useState<RunningShoe | null>(null);

  // Fetch initial shoes from REST API
  useEffect(() => {
    async function loadShoes() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/shoes");
        if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memuat database`);
        const json = await res.json();
        setShoes(json.data || []);
      } catch (err: any) {
        console.error("Error loading shoes:", err);
        setError("Gagal memuat katalog. Pastikan database sudah terisi.");
      } finally {
        setLoading(false);
      }
    }

    loadShoes();
  }, []);

  // Filter client-side untuk pencarian instan 0ms
  const filteredShoes = useMemo(() => {
    return shoes.filter((s) => {
      const matchCategory = selectedCategory
        ? s.category === selectedCategory || s.subCategory === selectedCategory
        : true;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = q
        ? s.brand.toLowerCase().includes(q) ||
          s.model.toLowerCase().includes(q) ||
          s.primaryUse.toLowerCase().includes(q)
        : true;
      const matchSizing = sizingFilter
        ? (FIT_GROUPS[sizingFilter] as Sizing[]).includes(s.sizing as Sizing)
        : true;
      const matchBreath = breathFilter ? s.breathability === breathFilter : true;
      return matchCategory && matchSearch && matchSizing && matchBreath;
    });
  }, [shoes, selectedCategory, searchQuery, sizingFilter, breathFilter]);

  return (
    <main className="min-h-screen pb-16">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Katalog Rotasi Sepatu Lari</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Kenali Sepatu, Sesuaikan Pace
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Data spesifikasi lab asli (drop, stack height, busa, & pelat) untuk membantu Anda memilih sepatu yang tepat di setiap sesi lari.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari model sepatu (contoh: Novablast, Pegasus, Vaporfly)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>

        {/* Horizontal Category Filter */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Kategori Rotasi
          </p>
          <RotationFilter
            selected={selectedCategory}
            onSelect={(cat) => setSelectedCategory(cat)}
          />
        </div>

        <Link
          href="/panduan"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 hover:underline"
        >
          <BookOpen className="w-3.5 h-3.5" /> Lihat panduan arti kategori &amp; filter
        </Link>

        {/* Arti kategori terpilih */}
        {selectedCategory && (
          <p className="text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-xl px-3 py-2 leading-snug">
            <span className="font-semibold">
              {CATEGORIES.find((c) => c.key === selectedCategory)?.label}:
            </span>{" "}
            {CATEGORIES.find((c) => c.key === selectedCategory)?.desc}
          </p>
        )}

        {/* Fit & Breathability Filter (1 tombol) */}
        <div className="space-y-2">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="w-full flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              Fit &amp; Breathability
              {(sizingFilter || breathFilter) && (
                <span className="bg-emerald-600 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {(sizingFilter ? 1 : 0) + (breathFilter ? 1 : 0)}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFilter ? "rotate-180" : ""}`} />
          </button>
          {showFilter && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-4 shadow-sm">
              <FilterChips
                title="Fit"
                desc="Kecocokan ukuran sepatu di kaki (panjang & lebar) berdasarkan ulasan pelari."
                value={sizingFilter}
                onChange={(v) => setSizingFilter(v as FitFilter | "")}
                options={FIT_OPTIONS}
              />
              <FilterChips
                title="Breathability"
                desc="Seberapa adem atau panas sepatu saat dipakai lari, tergantung bahan upper."
                value={breathFilter}
                onChange={(v) => setBreathFilter(v as Breathability | "")}
                options={(["cool", "moderate", "warm"] as Breathability[]).map((k) => [k, BREATHABILITY_META[k].label, BREATHABILITY_META[k].hint])}
              />
              {(sizingFilter || breathFilter) && (
                <button
                  onClick={() => { setSizingFilter(""); setBreathFilter(""); }}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  Hapus filter Fit &amp; Breathability
                </button>
              )}
            </div>
          )}
        </div>

        {/* Shoe List Grid */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-700">
              Daftar Sepatu ({filteredShoes.length})
            </p>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory("")}
                className="text-[11px] font-semibold text-emerald-600 hover:underline"
              >
                Reset Filter
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-xs">Memuat katalog sepatu...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Katalog Kosong / Offline</span>
              </div>
              <p>{error}</p>
            </div>
          ) : filteredShoes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
              <p className="text-2xl">👟</p>
              <h4 className="text-sm font-bold text-slate-800">Sepatu Tidak Ditemukan</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Coba gunakan kata kunci brand lain atau pilih kategori &quot;Semua&quot;.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredShoes.map((shoe) => (
                <ShoeCard
                  key={shoe.id}
                  shoe={shoe}
                  onClick={() => setSelectedShoe(shoe)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <ShoeDetailModal
        shoe={selectedShoe}
        onClose={() => setSelectedShoe(null)}
      />
    </main>
  );
}
