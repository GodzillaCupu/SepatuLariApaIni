"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { RotationFilter, CATEGORIES } from "@/components/RotationFilter";
import { SiteFooter } from "@/components/SiteFooter";
import { Pagination } from "@/components/Pagination";
import { ShoeCard } from "@/components/ShoeCard";
import { ShoeDetailModal } from "@/components/ShoeDetailModal";
import { ScanShoeSheet } from "@/components/ScanShoeSheet";
import { AiSettingsModal } from "@/components/AiSettingsModal";
import { RunningShoe, Sizing, Breathability } from "@/types";
import { BREATHABILITY_META } from "@/constants/fit";
import { Search, Loader2, Sparkles, AlertCircle, SlidersHorizontal, ChevronDown, BookOpen, GitCompareArrows, X, Camera, KeyRound } from "lucide-react";

const MAX_COMPARE = 3;

const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedShoe, setSelectedShoe] = useState<RunningShoe | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (id: string) =>
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id]
    );

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

  const totalPages = Math.max(1, Math.ceil(filteredShoes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedShoes = filteredShoes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredShoes.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredShoes.length);

  // Filter berubah → balik ke halaman 1
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchQuery, sizingFilter, breathFilter]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className={`min-h-screen ${compareIds.length > 0 ? "pb-48" : "pb-32"}`}>
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
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white px-3.5 py-2 rounded-full"
            >
              <Camera className="w-4 h-4" /> Scan sepatu
            </button>
            <button
              onClick={() => setAiSettingsOpen(true)}
              aria-label="Pengaturan AI"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
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
              {filteredShoes.length > PAGE_SIZE && (
                <span className="font-medium text-slate-400"> · Menampilkan {rangeStart}–{rangeEnd}</span>
              )}
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
              {pagedShoes.map((shoe) => (
                <ShoeCard
                  key={shoe.id}
                  shoe={shoe}
                  onClick={() => setSelectedShoe(shoe)}
                  compared={compareIds.includes(shoe.id)}
                  onToggleCompare={() => toggleCompare(shoe.id)}
                  compareDisabled={compareIds.length >= MAX_COMPARE}
                />
              ))}
            </div>
          )}

          {!loading && !error && (
            <Pagination page={currentPage} totalPages={totalPages} onChange={goToPage} />
          )}
        </div>
      </div>

      {/* Bar Bandingkan */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-24 inset-x-0 z-30 px-3 pointer-events-none">
          <div className="max-w-2xl mx-auto bg-slate-900 text-white rounded-2xl shadow-lg px-3.5 py-2.5 flex items-center gap-3 pointer-events-auto">
            <GitCompareArrows className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs flex-1 min-w-0 truncate">
              {compareIds.length} sepatu dipilih
              <span className="text-slate-400"> (maks {MAX_COMPARE})</span>
            </p>
            <button
              onClick={() => setCompareIds([])}
              aria-label="Kosongkan pilihan"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {compareIds.length >= 2 ? (
              <Link
                href={`/bandingkan?ids=${compareIds.join(",")}`}
                className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-full"
              >
                Bandingkan
              </Link>
            ) : (
              <span className="text-[11px] text-slate-400">pilih 1 lagi</span>
            )}
          </div>
        </div>
      )}

      <ScanShoeSheet
        open={scanOpen}
        shoes={shoes}
        onClose={() => setScanOpen(false)}
        onSelectShoe={setSelectedShoe}
        onOpenSettings={() => {
          setScanOpen(false);
          setAiSettingsOpen(true);
        }}
      />
      <AiSettingsModal open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />

      <SiteFooter />

      {/* Detail Modal */}
      <ShoeDetailModal
        shoe={selectedShoe}
        onClose={() => setSelectedShoe(null)}
      />
    </main>
  );
}
