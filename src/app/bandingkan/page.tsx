"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Trophy } from "lucide-react";
import { RunningShoe } from "@/types";
import { CATEGORIES_META } from "@/constants/categories";
import { SIZING_META, BREATHABILITY_META } from "@/constants/fit";
import { ShoeImage } from "@/components/ShoeImage";
import { barWidths, differs, diffLabel, leaderIndexes, METRICS, parseIds } from "@/lib/compare";

const gridCols: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3" };

function ComparePage() {
  const params = useSearchParams();
  const idsParam = params.get("ids");
  const ids = useMemo(() => parseIds(idsParam), [idsParam]);
  const [shoes, setShoes] = useState<RunningShoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (ids.length < 2) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/shoes/${encodeURIComponent(id)}`);
            if (!res.ok) throw new Error(res.status === 404 ? `Sepatu "${id}" tidak ditemukan` : `HTTP ${res.status}`);
            return (await res.json()) as RunningShoe;
          })
        );
        if (!cancelled) setShoes(results);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Gagal memuat sepatu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const cols = gridCols[shoes.length] ?? "grid-cols-2";

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" aria-label="Kembali" className="text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-bold text-slate-900">Bandingkan Sepatu</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {ids.length < 2 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
            <p className="text-2xl">👟</p>
            <h2 className="text-sm font-bold text-slate-800">Pilih minimal 2 sepatu</h2>
            <p className="text-xs text-slate-400">
              Tekan tombol &quot;Bandingkan&quot; pada kartu sepatu di katalog (maks 3).
            </p>
            <Link href="/" className="inline-block text-xs font-semibold text-emerald-600 hover:underline">
              Ke katalog
            </Link>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center py-16 text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <p className="text-xs">Memuat sepatu...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* Header sepatu */}
            <div className={`grid ${cols} gap-2`}>
              {shoes.map((s) => {
                const meta = CATEGORIES_META[s.category];
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200/80 p-2.5 space-y-1.5 shadow-sm">
                    <ShoeImage
                      src={s.imageUrl}
                      alt={`${s.brand} ${s.model}`}
                      sizes="160px"
                      className="w-full aspect-square rounded-xl border border-slate-100"
                    />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.brand}</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{s.model}</p>
                    {meta && (
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Metrik numerik */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-4 shadow-sm">
              {METRICS.map((m) => {
                const values = shoes.map(m.get);
                const widths = barWidths(values);
                const leaders = m.leader ? leaderIndexes(values, m.leader) : [];
                return (
                  <div key={m.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
                      {shoes.length === 2 && (
                        <p className="text-[11px] text-slate-500">
                          {shoes[0].model} → {shoes[1].model}: {diffLabel(values[0], values[1], m.unit)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      {shoes.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden">
                            <div
                              className={`h-full rounded-md ${leaders.includes(i) ? "bg-emerald-500" : "bg-slate-400"}`}
                              style={{ width: `${widths[i]}%` }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                            {leaders.includes(i) && <Trophy className="w-3 h-3 text-emerald-600" aria-label={m.leaderHint} />}
                            {values[i] ?? "-"}
                            {values[i] !== undefined ? m.unit : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Atribut teks */}
            <section className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm">
              {[
                { label: "Pelat", values: shoes.map((s) => s.specs?.plateType) },
                { label: "Busa", values: shoes.map((s) => s.specs?.foamType) },
                { label: "Bantalan", values: shoes.map((s) => s.specs?.cushionFeel) },
                { label: "Fit", values: shoes.map((s) => SIZING_META[s.sizing ?? "unknown"].label) },
                { label: "Adem / Panas", values: shoes.map((s) => BREATHABILITY_META[s.breathability ?? "unknown"].label) },
                { label: "Target pace", values: shoes.map((s) => s.targetPaceRange) },
                { label: "Pemakaian", values: shoes.map((s) => s.primaryUse) },
              ].map((row) => {
                const diff = differs(row.values);
                return (
                  <div key={row.label} className="p-3.5 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      {row.label}
                      {diff && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5 normal-case tracking-normal">beda</span>}
                    </p>
                    <div className={`grid ${cols} gap-2`}>
                      {row.values.map((v, i) => (
                        <p key={i} className={`text-xs ${diff ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                          {v ?? "-"}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function BandingkanPage() {
  return (
    <Suspense fallback={null}>
      <ComparePage />
    </Suspense>
  );
}
